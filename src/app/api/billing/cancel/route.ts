import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para cancelar a assinatura.", 401);
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return jsonError("A integração Mercado Pago ainda não está configurada.", 503);

  try {
    const db = getFirebaseAdminDb();
    const billingRef = db.collection("users").doc(account.uid).collection("billing").doc("current");
    const billing = await billingRef.get();
    const subscriptionId = billing.get("subscriptionId");
    if (
      !["authorized", "pending"].includes(String(billing.get("status")))
      || typeof subscriptionId !== "string"
    ) {
      return jsonError("Não há uma assinatura ou checkout pendente para cancelar.", 409);
    }

    const response = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(subscriptionId)}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ status: "cancelled" }),
      cache: "no-store",
    });
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    if (
      !response.ok
      || !isRecord(responseBody)
      || responseBody.id !== subscriptionId
      || responseBody.status !== "cancelled"
    ) {
      console.error("Mercado Pago não cancelou a assinatura.", { status: response.status });
      return jsonError("Não foi possível cancelar a assinatura agora. Tente novamente mais tarde.", 502);
    }

    await billingRef.set({
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ cancelled: true, wasPending: billing.get("status") === "pending" });
  } catch (error) {
    console.error("Não foi possível cancelar a assinatura Mercado Pago.", error);
    return jsonError("Não foi possível cancelar a assinatura. Tente novamente mais tarde.", 503);
  }
}
