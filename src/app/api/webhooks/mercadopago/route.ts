import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getPlanPriceCents, isPaidPlanId, type BillingInterval } from "@/lib/billing-plans";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSignature(value: string) {
  const values = new Map(value.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
  return { timestamp: values.get("ts"), signature: values.get("v1") };
}

export async function POST(request: Request) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!secret || !accessToken) {
    return NextResponse.json({ error: "Webhook Mercado Pago não configurado." }, { status: 503 });
  }

  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo do webhook inválido." }, { status: 400 });
  }
  if (!isRecord(event) || !isRecord(event.data) || typeof event.data.id !== "string") {
    return NextResponse.json({ error: "Evento Mercado Pago inválido." }, { status: 400 });
  }
  if (event.type !== "subscription_preapproval") return NextResponse.json({ received: true });
  const dataId = event.data.id;

  const requestId = request.headers.get("x-request-id");
  const signatureHeader = request.headers.get("x-signature");
  if (!requestId || !signatureHeader) {
    return NextResponse.json({ error: "Assinatura do webhook ausente." }, { status: 401 });
  }
  const { timestamp, signature } = parseSignature(signatureHeader);
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "hex");
  } catch {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }
  if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`,
      { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (!response.ok) {
      console.error("Não foi possível consultar a assinatura notificada pelo Mercado Pago.", { status: response.status });
      return NextResponse.json({ error: "Não foi possível confirmar a assinatura." }, { status: 502 });
    }
    const subscription: unknown = await response.json();
    if (!isRecord(subscription) || typeof subscription.id !== "string"
      || typeof subscription.external_reference !== "string"
      || !isRecord(subscription.auto_recurring)
      || typeof subscription.status !== "string") {
      return NextResponse.json({ error: "Resposta de assinatura inválida." }, { status: 502 });
    }

    const [uid, planValue, intervalValue, ...extra] = subscription.external_reference.split(":");
    const planId = isPaidPlanId(planValue) ? planValue : null;
    const interval: BillingInterval | null = intervalValue === "monthly" || intervalValue === "quarterly"
      ? intervalValue
      : null;
    if (
      !uid || extra.length > 0 || !planId || !interval
      || subscription.id !== dataId
      || Math.round(Number(subscription.auto_recurring.transaction_amount) * 100) !== getPlanPriceCents(planId, interval)
      || subscription.auto_recurring.currency_id !== "BRL"
      || subscription.auto_recurring.frequency !== (interval === "monthly" ? 1 : 3)
      || subscription.auto_recurring.frequency_type !== "months"
      || !["pending", "authorized", "paused", "cancelled"].includes(subscription.status)
    ) {
      console.error("A assinatura Mercado Pago não corresponde ao plano solicitado.", { subscriptionId: subscription.id });
      return NextResponse.json({ error: "Os dados da assinatura não correspondem ao plano." }, { status: 409 });
    }

    const db = getFirebaseAdminDb();
    const billingRef = db.collection("users").doc(uid).collection("billing").doc("current");
    const eventKey = createHash("sha256").update(`${requestId}:${subscription.id}`).digest("hex");
    const eventRef = db.collection("mercadoPagoWebhookEvents").doc(eventKey);
    const nextPaymentDate = typeof subscription.next_payment_date === "string"
      ? subscription.next_payment_date
      : null;
    const result = await db.runTransaction(async (transaction) => {
      const [existingEvent, currentBilling] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(billingRef),
      ]);
      if (existingEvent.exists) return "duplicate";
      if (currentBilling.get("subscriptionId") !== subscription.id) {
        return currentBilling.exists ? "superseded" : "checkout_pending";
      }

      transaction.set(billingRef, {
        planId,
        billingInterval: interval,
        status: subscription.status,
        subscriptionId: subscription.id,
        nextPaymentDate,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.create(eventRef, {
        subscriptionId: subscription.id,
        providerEventId: dataId,
        receivedAt: FieldValue.serverTimestamp(),
      });
      return "updated";
    });

    if (result === "checkout_pending") {
      return NextResponse.json({ error: "O checkout ainda está sendo registrado." }, { status: 503 });
    }
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("Falha ao processar webhook Mercado Pago.", error);
    return NextResponse.json({ error: "Não foi possível processar a notificação." }, { status: 503 });
  }
}
