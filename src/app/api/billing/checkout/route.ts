import { randomUUID } from "node:crypto";
import { FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  billingPlans,
  getPlanPriceCents,
  isPaidPlanId,
  type BillingInterval,
} from "@/lib/billing-plans";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { siteUrl } from "@/lib/site-config";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readProviderError(value: unknown) {
  if (!isRecord(value)) return { code: null, message: null };
  const firstCause = Array.isArray(value.cause) ? value.cause.find(isRecord) : null;
  return {
    code: typeof value.error === "string"
      ? value.error
      : firstCause && typeof firstCause.code === "string"
        ? firstCause.code
        : null,
    message: typeof value.message === "string"
      ? value.message
      : firstCause && typeof firstCause.description === "string"
        ? firstCause.description
        : null,
  };
}

export async function POST(request: Request) {
  const account = await verifyFirebaseIdToken(request);
  if (!account?.email) return jsonError("Entre com um e-mail válido para iniciar a assinatura.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Envie os dados do plano em formato JSON.", 400);
  }
  if (!isRecord(body) || !isPaidPlanId(body.planId)) {
    return jsonError("Escolha um dos planos pagos disponíveis.", 400);
  }
  const interval: BillingInterval | null = body.interval === "monthly" || body.interval === "quarterly"
    ? body.interval
    : null;
  if (!interval) return jsonError("Escolha cobrança mensal ou trimestral.", 400);

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return jsonError("A integração Mercado Pago ainda não está configurada.", 503);

  const checkoutRequestId = randomUUID();
  let db: Firestore;
  try {
    db = getFirebaseAdminDb();
  } catch (error) {
    console.error("Não foi possível inicializar o Firestore para o checkout.", error);
    return jsonError("Não foi possível iniciar o checkout. Tente novamente mais tarde.", 503);
  }
  const billingRef: DocumentReference = db.collection("users").doc(account.uid).collection("billing").doc("current");
  try {
    const reserved = await db.runTransaction(async (transaction) => {
      const currentBilling = await transaction.get(billingRef);
      const status = currentBilling.get("status");
      if (status === "authorized" || status === "pending" || status === "creating") return false;
      transaction.set(billingRef, {
        status: "creating",
        planId: body.planId,
        billingInterval: interval,
        checkoutRequestId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });
    if (!reserved) {
      return jsonError("Já existe uma assinatura ou checkout pendente nesta conta. Continue ou cancele o checkout atual.", 409);
    }

    const plan = billingPlans[body.planId];
    const externalReference = `${account.uid}:${body.planId}:${interval}`;
    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "x-idempotency-key": randomUUID(),
      },
      body: JSON.stringify({
        reason: `Lucrazi ${plan.name} - ${interval === "monthly" ? "mensal" : "trimestral"}`,
        external_reference: externalReference,
        payer_email: account.email,
        auto_recurring: {
          frequency: interval === "monthly" ? 1 : 3,
          frequency_type: "months",
          transaction_amount: getPlanPriceCents(body.planId, interval) / 100,
          currency_id: "BRL",
        },
        back_url: new URL("/minha-conta?checkout=return", siteUrl).toString(),
        notification_url: new URL("/api/webhooks/mercadopago", siteUrl).toString(),
      }),
      cache: "no-store",
    });

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    if (!response.ok || !isRecord(responseBody)
      || typeof responseBody.id !== "string"
      || typeof responseBody.init_point !== "string") {
      const providerError = readProviderError(responseBody);
      console.error("Mercado Pago não criou a assinatura.", {
        status: response.status,
        code: providerError.code,
        message: providerError.message,
      });
      await markCheckoutFailed(db, billingRef, checkoutRequestId);
      const rejectedAmount = `${providerError.code ?? ""} ${providerError.message ?? ""}`
        .toLocaleLowerCase("en-US")
        .includes("amount");
      return jsonError(
        rejectedAmount
          ? "O Mercado Pago recusou o valor desta assinatura. O preço de teste foi ajustado; tente novamente. Se persistir, confira o código da resposta nos logs do servidor."
          : "O Mercado Pago recusou a criação da assinatura. Tente novamente; se persistir, confira o código da resposta nos logs do servidor.",
        502,
      );
    }

    const checkoutUrl = new URL(responseBody.init_point);
    if (
      checkoutUrl.protocol !== "https:"
      || !(
        checkoutUrl.hostname === "mercadopago.com.br"
        || checkoutUrl.hostname.endsWith(".mercadopago.com.br")
        || checkoutUrl.hostname === "mercadopago.com"
        || checkoutUrl.hostname.endsWith(".mercadopago.com")
      )
    ) {
      console.error("Mercado Pago retornou uma URL de checkout insegura.");
      await markCheckoutFailed(db, billingRef, checkoutRequestId);
      return jsonError("O provedor retornou um link de checkout inválido.", 502);
    }

    const saved = await db.runTransaction(async (transaction) => {
      const currentBilling = await transaction.get(billingRef);
      if (currentBilling.get("checkoutRequestId") !== checkoutRequestId) return false;
      transaction.set(billingRef, {
        status: "pending",
        planId: body.planId,
        billingInterval: interval,
        subscriptionId: responseBody.id,
        checkoutUrl: checkoutUrl.toString(),
        checkoutCreatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return true;
    });
    if (!saved) return jsonError("O estado do checkout foi alterado. Atualize o painel antes de continuar.", 409);

    return NextResponse.json({ checkoutUrl: checkoutUrl.toString() });
  } catch (error) {
    console.error("Não foi possível iniciar o checkout Mercado Pago.", error);
    try {
      await markCheckoutFailed(db, billingRef, checkoutRequestId);
    } catch (cleanupError) {
      console.error("Não foi possível liberar a tentativa de checkout que falhou.", cleanupError);
    }
    return jsonError("Não foi possível iniciar o checkout. Tente novamente mais tarde.", 503);
  }
}

async function markCheckoutFailed(
  db: Firestore,
  billingRef: DocumentReference,
  checkoutRequestId: string,
) {
  await db.runTransaction(async (transaction) => {
    const currentBilling = await transaction.get(billingRef);
    if (currentBilling.get("checkoutRequestId") !== checkoutRequestId) return;
    transaction.set(billingRef, {
      status: "checkout_failed",
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}
