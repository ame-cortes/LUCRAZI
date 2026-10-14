import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const BREVO_API = "https://api.brevo.com/v3";
const ebookFilename = "como-faturar-seus-primeiros-1000-na-internet.pdf";

type BrevoConfig = {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  senderAddress: string;
  listId: number;
}

type BrevoEmailConfig = Pick<BrevoConfig, "apiKey" | "senderEmail" | "senderName">;

function getBrevoEmailConfig(): BrevoEmailConfig | null {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } = process.env;
  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL || !BREVO_SENDER_NAME) return null;

  return {
    apiKey: BREVO_API_KEY,
    senderEmail: BREVO_SENDER_EMAIL,
    senderName: BREVO_SENDER_NAME,
  };
}

function getBrevoConfig(): BrevoConfig | null {
  const {
    BREVO_SENDER_ADDRESS,
    BREVO_NEWSLETTER_LIST_ID,
    NEWSLETTER_UNSUBSCRIBE_SECRET,
  } = process.env;
  const emailConfig = getBrevoEmailConfig();
  const listId = Number(BREVO_NEWSLETTER_LIST_ID);
  if (
    !emailConfig
    || !BREVO_SENDER_ADDRESS
    || !NEWSLETTER_UNSUBSCRIBE_SECRET
    || NEWSLETTER_UNSUBSCRIBE_SECRET.length < 32
    || !Number.isSafeInteger(listId)
    || listId <= 0
  ) return null;

  return {
    ...emailConfig,
    senderAddress: BREVO_SENDER_ADDRESS,
    listId,
  };
}

export function isBrevoEmailConfigured() {
  return getBrevoEmailConfig() !== null;
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

function emailTemplate(content: string, unsubscribeHref: string, senderAddress: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f3ed;font-family:Arial,sans-serif;color:#25271f;line-height:1.6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ed;padding:28px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e6e5dc;border-radius:16px;overflow:hidden"><tr><td style="padding:22px 32px;background:#28351f"><a href="${escapeHtml(siteUrl())}" style="color:#fff;font-size:22px;font-weight:bold;text-decoration:none">lucrazi<span style="color:#b8d58b">.</span></a></td></tr><tr><td style="padding:32px">${content}</td></tr><tr><td style="padding:20px 32px;background:#f8f8f4;border-top:1px solid #e6e5dc;color:#666;font-size:12px;line-height:1.6"><p style="margin:0 0 8px">Você recebe este e-mail porque se inscreveu para receber novidades do Lucrazi. <a href="${escapeHtml(unsubscribeHref)}" style="color:#4e6c2d">Cancelar inscrição</a>.</p><p style="margin:0">${escapeHtml(senderAddress)}</p></td></tr></table></td></tr></table></body></html>`;
}

async function brevoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = getBrevoEmailConfig();
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
    const responseBody = await response.text();
    let providerCode: string | undefined;
    let providerMessage: string | undefined;
    try {
      const details: unknown = JSON.parse(responseBody);
      if (typeof details === "object" && details !== null) {
        if ("code" in details && typeof details.code === "string") providerCode = details.code;
        if ("message" in details && typeof details.message === "string") {
          providerMessage = details.message
            .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[e-mail redigido]")
            .slice(0, 300);
        }
      }
    } catch {
      providerMessage = "A Brevo retornou uma resposta de erro não estruturada.";
    }
    console.error("A API Brevo recusou uma operação de e-mail.", {
      status: response.status,
      ...(providerCode ? { providerCode } : {}),
      ...(providerMessage ? { providerMessage } : {}),
    });
    throw new Error(`A Brevo recusou a operação (HTTP ${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function sendQrCodeEmail(email: string, qrPng: Uint8Array) {
  const config = getBrevoEmailConfig();
  if (!config) throw new Error("A integração de e-mail da Brevo não está configurada.");

  const baseUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.lucrazi.com.br").origin;
  await brevoRequest("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email }],
      subject: "Seu QR Code personalizado do Lucrazi",
      htmlContent: `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f3ed;font-family:Arial,sans-serif;color:#25271f;line-height:1.6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ed;padding:28px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e6e5dc;border-radius:16px;overflow:hidden"><tr><td style="padding:22px 32px;background:#28351f"><a href="${baseUrl}" style="color:#fff;font-size:22px;font-weight:bold;text-decoration:none">lucrazi<span style="color:#b8d58b">.</span></a></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Seu QR Code está pronto.</h1><p style="margin:0 0 16px">Como solicitado, anexamos o arquivo PNG do seu QR Code personalizado. Você também pode baixar as versões PNG e SVG diretamente na página do gerador.</p><p style="margin:0;color:#555">Este e-mail atende somente ao seu pedido e não inscreve seu endereço em campanhas.</p></td></tr></table></td></tr></table></body></html>`,
      textContent: `Seu QR Code personalizado está pronto.\n\nComo solicitado, anexamos o arquivo PNG do seu QR Code. Você também pode baixar as versões PNG e SVG em ${baseUrl}/gerador-qr.\n\nEste e-mail atende somente ao seu pedido e não inscreve seu endereço em campanhas.`,
      tags: ["lucrazi-qr-code"],
      attachment: [{
        name: "qr-code-lucrazi.png",
        content: Buffer.from(qrPng).toString("base64"),
      }],
    }),
  });
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

export async function sendWelcomeEmail(
  email: string,
  subscriberId: string,
  ebookPdf?: Uint8Array,
) {
  const config = getBrevoConfig();
  if (!config) return false;

  const link = unsubscribeUrl(subscriberId);
  const ebookAttached = ebookPdf !== undefined;
  const htmlContent = emailTemplate(
    `<p style="margin:0 0 8px;color:#668241;font-size:12px;font-weight:bold;letter-spacing:1px">BOAS-VINDAS</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.25">Que bom ter você por aqui!</h1><p style="margin:0 0 16px">Obrigado por assinar as novidades do Lucrazi. Vamos compartilhar guias e ideias práticas para ajudar você a explorar possibilidades de renda, sem promessas de ganhos.</p>${ebookAttached ? '<p style="margin:0 0 16px">Como prometido, anexamos seu e-book gratuito <strong>Como faturar seus primeiros R$ 1.000 na internet</strong>.</p>' : ""}<p style="margin:0 0 24px">Até breve,<br><strong>Equipe Lucrazi</strong></p><a href="${escapeHtml(`${siteUrl()}/artigos`)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4e6c2d;color:#fff;font-weight:bold;text-decoration:none">Explorar os artigos</a>`,
    link,
    config.senderAddress,
  );

  await brevoRequest("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email }],
      subject: "Boas-vindas ao Lucrazi",
      htmlContent,
      textContent: `Que bom ter você por aqui!\n\nObrigado por assinar as novidades do Lucrazi. Vamos compartilhar guias e ideias práticas para ajudar você a explorar possibilidades de renda, sem promessas de ganhos.${ebookAttached ? "\n\nComo prometido, anexamos seu e-book gratuito Como faturar seus primeiros R$ 1.000 na internet." : ""}\n\nExplore os artigos: ${siteUrl()}/artigos\n\nCancelar inscrição: ${link}\n${config.senderAddress}`,
      tags: ["lucrazi-welcome"],
      ...(ebookPdf
        ? { attachment: [{ name: ebookFilename, content: Buffer.from(ebookPdf).toString("base64") }] }
        : {}),
    }),
  });
  return true;
}

export async function sendEbookDeliveryEmail(email: string, ebookPdf: Uint8Array) {
  const config = getBrevoConfig();
  if (!config) return false;

  await brevoRequest("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName },
      to: [{ email }],
      subject: "Seu e-book gratuito do Lucrazi",
      htmlContent: `<html lang="pt-BR"><body style="margin:0;background:#f4f3ed;font-family:Arial,sans-serif;color:#25271f;line-height:1.6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f3ed;padding:28px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e6e5dc;border-radius:16px;overflow:hidden"><tr><td style="padding:22px 32px;background:#28351f"><span style="color:#fff;font-size:22px;font-weight:bold">lucrazi<span style="color:#b8d58b">.</span></span></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#668241;font-size:12px;font-weight:bold;letter-spacing:1px">SEU E-BOOK</p><h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">Seu guia está aqui.</h1><p style="margin:0 0 16px">Conforme solicitado, anexamos <strong>Como faturar seus primeiros R$ 1.000 na internet</strong> a este e-mail.</p><p style="margin:0">Boa leitura!<br><strong>Equipe Lucrazi</strong></p></td></tr><tr><td style="padding:18px 32px;background:#f8f8f4;border-top:1px solid #e6e5dc;color:#666;font-size:12px;line-height:1.6">Você recebe esta mensagem porque solicitou o e-book gratuito do Lucrazi.<br>${escapeHtml(config.senderAddress)}</td></tr></table></td></tr></table></body></html>`,
      textContent: `Seu e-book está aqui!\n\nConforme solicitado, anexamos "Como faturar seus primeiros R$ 1.000 na internet" a este e-mail.\n\nBoa leitura!\nEquipe Lucrazi\n\nVocê recebe esta mensagem porque solicitou o e-book gratuito do Lucrazi.\n${config.senderAddress}`,
      attachment: [{ name: ebookFilename, content: Buffer.from(ebookPdf).toString("base64") }],
      tags: ["lucrazi-ebook-delivery"],
    }),
  });
  return true;
}

type NewsletterArticle = {
  slug: string;
  title: string;
  description: string;
};

export async function sendNewsletterCampaign(
  subject: string,
  message: string,
  options: {
    article?: NewsletterArticle;
    onCreated?: (campaignId: number) => Promise<void>;
  } = {},
) {
  const config = getBrevoConfig();
  if (!config) throw new Error("A integração Brevo não está configurada.");

  const paragraphs = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
  const articleUrl = options.article
    ? new URL(`/artigos/${encodeURIComponent(options.article.slug)}`, siteUrl()).toString()
    : null;
  const articleContent = options.article && articleUrl
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #e6e5dc;border-radius:12px"><tr><td style="padding:22px"><p style="margin:0 0 8px;color:#668241;font-size:12px;font-weight:bold;letter-spacing:1px">NOVO GUIA</p><h2 style="margin:0 0 10px;font-size:21px;line-height:1.3">${escapeHtml(options.article.title)}</h2><p style="margin:0 0 20px;color:#555">${escapeHtml(options.article.description)}</p><a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#4e6c2d;color:#fff;font-weight:bold;text-decoration:none">Ler o artigo</a></td></tr></table>`
    : "";
  const htmlContent = emailTemplate(
    `${paragraphs}${articleContent}`,
    "{{ unsubscribe }}",
    config.senderAddress,
  );

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
  await options.onCreated?.(created.id);
  await brevoRequest(`/emailCampaigns/${created.id}/sendNow`, { method: "POST" });
  return created.id;
}
