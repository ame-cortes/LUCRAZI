import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { suppressBrevoSubscriber, verifyUnsubscribeToken } from "@/lib/newsletter-email";

function html(content: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preferências de e-mail | Lucrazi</title><body style="margin:0;background:#f2f1eb;color:#25271f;font:16px/1.6 Arial,sans-serif"><main style="max-width:560px;margin:10vh auto;padding:32px;background:#fff;border:1px solid #deded5;border-radius:16px"><a href="https://www.lucrazi.com.br" style="color:#4e6c2d;font-weight:bold;text-decoration:none">Lucrazi</a>${content}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

async function resolveToken(token: string | null) {
  if (!token) return null;
  const subscriberId = verifyUnsubscribeToken(token);
  if (!subscriberId) return null;
  const subscriber = getFirebaseAdminDb().collection("newsletterSubscribers").doc(subscriberId);
  const snapshot = await subscriber.get();
  const data = snapshot.data();
  if (!snapshot.exists || typeof data?.email !== "string") return null;
  return { ref: subscriber, email: data.email, status: data.status };
}

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    const subscriber = await resolveToken(token);
    if (!subscriber) {
      return html("<h1>Link inválido</h1><p>Não foi possível validar este link de cancelamento.</p>", 400);
    }
    if (subscriber.status === "unsubscribed") {
      return html("<h1>Inscrição já cancelada</h1><p>Você não receberá novas campanhas do Lucrazi.</p>");
    }
    return html(`<h1>Cancelar inscrição</h1><p>Confirme para deixar de receber novidades do Lucrazi.</p><form method="post"><input type="hidden" name="token" value="${token}"><button style="border:0;border-radius:8px;padding:12px 18px;background:#25271f;color:#fff;font:inherit;cursor:pointer" type="submit">Cancelar inscrição</button></form>`);
  } catch (error) {
    console.error("Não foi possível carregar a página de cancelamento da newsletter.", error);
    return html("<h1>Serviço temporariamente indisponível</h1><p>Tente novamente mais tarde ou use o canal de contato do Lucrazi.</p>", 503);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = formData.get("token");
    const subscriber = await resolveToken(typeof token === "string" ? token : null);
    if (!subscriber) {
      return html("<h1>Link inválido</h1><p>Não foi possível validar este link de cancelamento.</p>", 400);
    }
    if (subscriber.status !== "unsubscribed") {
      await subscriber.ref.update({
        status: "unsubscribed",
        unsubscribedAt: FieldValue.serverTimestamp(),
      });
    }

    let suppressed = false;
    try {
      suppressed = await suppressBrevoSubscriber(subscriber.email);
      if (suppressed) await subscriber.ref.update({ brevoSuppressed: true });
    } catch (error) {
      console.error("O cancelamento foi salvo, mas a supressão Brevo ficou pendente.", error);
      await subscriber.ref.update({ brevoSuppressed: false });
    }
    return html(`<h1>Inscrição cancelada</h1><p>Você não receberá novas campanhas do Lucrazi.${suppressed ? "" : " O cancelamento foi registrado e a lista será sincronizada antes de novos envios."}</p>`);
  } catch (error) {
    console.error("Não foi possível cancelar a inscrição da newsletter.", error);
    return html("<h1>Não foi possível concluir</h1><p>Tente novamente mais tarde ou use o canal de contato do Lucrazi.</p>", 503);
  }
}
