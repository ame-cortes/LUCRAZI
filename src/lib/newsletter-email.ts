import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const BREVO_API = "https://api.brevo.com/v3";

type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  senderAddress: string;
  listId: number;
}

function getBrevoConfig(): BrevoConfig | null {
  const {
    BREVO_API_KEY,
    BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME,
    BREVO_SENDER_ADDRESS,
    BREVO_NEWSLETTER_LIST_ID,
    NEWSLETTER_UNSUBSCRIBE_SECRET,
  } = process.env;
  const listId = Number(BREVO_NEWSLETTER_LIST_ID);
  if (
    !BREVO_API_KEY
    || !BREVO_SENDER_EMAIL
    || !BREVO_SENDER_NAME
    || !BREVO_SENDER_ADDRESS
    || !NEWSLETTER_UNSUBSCRIBE_SECRET
    || NEWSLETTER_UNSUBSCRIBE_SECRET.length < 32
    || !Number.isSafeInteger(listId)
    || listId <= 0
  ) return null;

  return {
    apiKey: BREVO_API_KEY,
    senderEmail: BREVO_SENDER_EMAIL,
    senderName: BREVO_SENDER_NAME,
    senderAddress: BREVO_SENDER_ADDRESS,
    listId,
  };
}

export function isBrevoConfigured() {
  return getBrevoConfig() !== null;
}

function getUnsubscribeSecret() {
  const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) throw new Error("NEWSLETTER_UNSUBSCRIBE_SECRET precisa ter pelo menos 32 caracteres.");
  return secret;
}

export function createUnsubscribeToken(subscriberId: string) {
  const signature = createHmac("sha256", getUnsubscribeSecret()).update(subscriberId).digest("base64url");
  return `${subscriberId}.${signature}`;
}

export function verifyUnsubscribeToken(token: string) {
  const [subscriberId, signature, extra] = token.split(".");
  if (
    extra !== undefined
    || !/^[a-f0-9]{64}$/.test(subscriberId ?? "")
    || !/^[A-Za-z0-9_-]{43}$/.test(signature ?? "")
  ) return null;

  const expected = createHmac("sha256", getUnsubscribeSecret()).update(subscriberId).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return subscriberId;
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) throw new Error("NEXT_PUBLIC_SITE_URL não está configurada.");
  return new URL(configured.startsWith("http") ? configured : `https://${configured}`).origin;
}

function unsubscribeUrl(subscriberId: string) {
  const token = createUnsubscribeToken(subscriberId);
  return `${siteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function brevoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getBrevoConfig();
  if (!config) throw new Error("A integração Brevo não está configurada.");

  const response = await fetch(`${BREVO_API}${path}`, {
    ...init,
    headers: {
      "api-key": config.apiKey,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("A API Brevo recusou uma operação de e-mail.", { status: response.status });
    throw new Error(`A Brevo recusou a operação (HTTP ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function syncBrevoSubscriber(email: string, reactivate = false) {
  const config = getBrevoConfig();
  if (!config) return false;

  await brevoRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      listIds: [config.listId],
      updateEnabled: true,
      ...(reactivate ? { emailBlacklisted: false } : {}),
    }),
  });
  return true;
}

export async function suppressBrevoSubscriber(email: string) {
  if (!getBrevoConfig()) return false;
  await brevoRequest(`/contacts/${encodeURIComponent(email)}`, {
    method: "PUT",
    body: JSON.stringify({ emailBlacklisted: true }),
  });
  return true;
}

export async function sendWelcomeEmail(email: string, subscriberId: string) {
  const config = getBrevoConfig();
  if (!config) return false;

  const link = unsubscribeUrl(subscriberId);
  const htmlContent = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#25271f;line-height:1.6"><main style="max-width:600px;margin:32px auto;padding:24px"><h1>Que bom ter você por aqui!</h1><p>Obrigado por assinar as novidades do Lucrazi. Enviaremos novos guias e ideias práticas para ajudar você a explorar possibilidades de renda, sempre sem promessas de ganhos.</p><p>Até breve,<br>Equipe Lucrazi</p><hr><p style="font-size:12px;color:#666">Você recebeu este e-mail porque se inscreveu para receber novidades do Lucrazi. <a href="${escapeHtml(link)}">Cancelar inscrição</a>.</p><p style="font-size:12px;color:#666">${escapeHtml(config.senderAddress)}</p></main></body></html>`;

  await brevoRequest("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email }],
      subject: "Boas-vindas ao Lucrazi",
      htmlContent,
      textContent: `Obrigado por assinar as novidades do Lucrazi. Enviaremos novos guias e ideias práticas, sem promessas de ganhos.\n\nCancelar inscrição: ${link}\n${config.senderAddress}`,
      tags: ["lucrazi-welcome"],
    }),
  });
  return true;
}

export async function sendNewsletterCampaign(
  subject: string,
  message: string,
  onCreated?: (campaignId: number) => Promise<void>,
) {
  const config = getBrevoConfig();
  if (!config) throw new Error("A integração Brevo não está configurada.");

  const paragraphs = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  const htmlContent = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#25271f;line-height:1.6"><main style="max-width:600px;margin:32px auto;padding:24px"><a href="${siteUrl()}" style="color:#4e6c2d;font-weight:bold">Lucrazi</a>${paragraphs}<hr><p style="font-size:12px;color:#666">Você recebe esta mensagem porque autorizou o envio de novidades do Lucrazi. <a href="{{ unsubscribe }}">Cancelar inscrição</a>.</p><p style="font-size:12px;color:#666">${escapeHtml(config.senderAddress)}</p></main></body></html>`;

  const created = await brevoRequest<{ id?: number }>("/emailCampaigns", {
    method: "POST",
    body: JSON.stringify({
      name: `Lucrazi | ${subject}`.slice(0, 128),
      sender: { email: config.senderEmail, name: config.senderName },
      subject,
      htmlContent,
      recipients: { listIds: [config.listId] },
      tag: "lucrazi-newsletter",
    }),
  });
  if (!Number.isSafeInteger(created.id) || !created.id) {
    throw new Error("A Brevo criou a campanha sem retornar um identificador válido.");
  }
  await onCreated?.(created.id);
  await brevoRequest(`/emailCampaigns/${created.id}/sendNow`, { method: "POST" });
  return created.id;
}
