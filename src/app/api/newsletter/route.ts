import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { isBrevoConfigured, sendWelcomeEmail, syncBrevoSubscriber } from "@/lib/newsletter-email";

const appCheckJwks = createRemoteJWKSet(
  new URL("https://firebaseappcheck.googleapis.com/v1/jwks"),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED !== "true") {
    return NextResponse.json({ error: "As inscrições estão desativadas." }, { status: 503 });
  }

  const appCheckToken = request.headers.get("X-Firebase-AppCheck");
  if (!appCheckToken) {
    return NextResponse.json({ error: "Token App Check ausente." }, { status: 401 });
  }

  const expectedAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const projectNumber = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  if (!expectedAppId || !projectNumber) {
    return NextResponse.json({ error: "A configuração Firebase do site está incompleta." }, { status: 503 });
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(appCheckToken, appCheckJwks, {
      algorithms: ["RS256"],
      audience: `projects/${projectNumber}`,
      issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
    });
    if (protectedHeader.typ !== "JWT" || payload.sub !== expectedAppId) {
      return NextResponse.json({ error: "Token App Check de outro aplicativo." }, { status: 401 });
    }
  } catch (error) {
    console.warn("A inscrição foi recusada porque o token App Check não pôde ser validado.", error);
    return NextResponse.json({ error: "Token App Check inválido." }, { status: 401 });
  }

  let db;
  try {
    db = getFirebaseAdminDb();
  } catch (error) {
    console.error("Não foi possível inicializar o Firebase Admin para inscrições.", error);
    return NextResponse.json({ error: "O cadastro está temporariamente indisponível." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da solicitação precisa ser JSON válido." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.email !== "string" || body.consent !== true) {
    return NextResponse.json({ error: "Informe um e-mail e autorize o recebimento de novidades." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um endereço de e-mail válido." }, { status: 400 });
  }

  const emailHash = createHash("sha256").update(email).digest("hex");
  const subscriber = db.collection("newsletterSubscribers").doc(emailHash);
  let resubscribed = false;
  try {
    const existing = await subscriber.get();
    if (existing.exists) {
      if (existing.data()?.status !== "unsubscribed") {
        return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
      }
      resubscribed = true;
      await subscriber.update({
        consent: true,
        consentTextVersion: "2026-10-11",
        consentAt: FieldValue.serverTimestamp(),
        status: "subscribed",
        unsubscribedAt: FieldValue.delete(),
        welcomeEmailStatus: "pending",
        brevoSyncedAt: FieldValue.delete(),
      });
    } else {
      await subscriber.create({
        email,
        consent: true,
        consentTextVersion: "2026-10-11",
        consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        source: "homepage",
        status: "subscribed",
        welcomeEmailStatus: "pending",
      });
    }
  } catch (error) {
    if (
      isRecord(error)
      && (error.code === 6 || error.code === "already-exists")
    ) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
    }

    console.error("Não foi possível gravar a inscrição no Firestore.", error);
    return NextResponse.json({ error: "Não foi possível registrar a inscrição." }, { status: 500 });
  }

  let brevoSynced = false;
  let welcomeSent = false;
  try {
    brevoSynced = await syncBrevoSubscriber(email, resubscribed);
    if (brevoSynced) {
      await subscriber.update({ brevoSyncedAt: FieldValue.serverTimestamp() });
    }
  } catch (error) {
    console.error("A inscrição foi gravada, mas não foi sincronizada com a lista Brevo.", error);
  }
  try {
    welcomeSent = await sendWelcomeEmail(email, emailHash);
    if (welcomeSent) {
      await subscriber.update({
        welcomeEmailStatus: "sent",
        welcomeEmailSentAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("A inscrição foi gravada, mas o e-mail de boas-vindas não foi enviado.", error);
    try {
      await subscriber.update({ welcomeEmailStatus: "failed" });
    } catch (updateError) {
      console.error("Não foi possível registrar a falha do e-mail de boas-vindas.", updateError);
    }
  }

  return NextResponse.json({
    status: "subscribed",
    welcomeSent,
    emailConfigured: isBrevoConfigured(),
    brevoSynced,
  }, { status: 201 });
}
