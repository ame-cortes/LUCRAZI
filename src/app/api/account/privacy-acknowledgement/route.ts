import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";

const acknowledgementVersion = "2026-10-24";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para registrar o aceite.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler o aceite enviado.", 400);
  }
  if (
    typeof body !== "object"
    || body === null
    || !("accepted" in body)
    || body.accepted !== true
  ) {
    return jsonError("Confirme a leitura dos Termos de Uso para continuar.", 400);
  }

  try {
    await getFirebaseAdminDb().collection("users").doc(account.uid).set({
      privacyAcknowledgement: {
        acceptedAt: FieldValue.serverTimestamp(),
        version: acknowledgementVersion,
      },
    }, { merge: true });
    return NextResponse.json({ accepted: true, version: acknowledgementVersion });
  } catch (error) {
    console.error("Não foi possível registrar o aceite dos termos da conta.", error);
    return jsonError("Não foi possível registrar o aceite. Tente novamente.", 503);
  }
}
