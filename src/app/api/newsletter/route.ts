import { createHash } from "node:crypto";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const appCheckJwks = createRemoteJWKSet(
  new URL("https://firebaseappcheck.googleapis.com/v1/jwks"),
);

type ServiceAccountJson = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAdminApp() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não está configurada.");
  }

  let account: ServiceAccountJson;
  try {
    const parsed: unknown = JSON.parse(rawServiceAccount);
    if (!isRecord(parsed)) {
      throw new Error("A credencial precisa ser um objeto JSON.");
    }
    account = parsed;
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido.", error);
    throw new Error("A credencial Firebase do servidor está inválida.");
  }

  if (
    typeof account.project_id !== "string"
    || typeof account.client_email !== "string"
    || typeof account.private_key !== "string"
  ) {
    throw new Error("A credencial Firebase do servidor não contém os campos necessários.");
  }

  const expectedProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!expectedProjectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID não está configurada.");
  }
  if (account.project_id !== expectedProjectId) {
    throw new Error("A credencial Firebase do servidor pertence a outro projeto.");
  }

  const existingApp = getApps().find((app) => app.name === "newsletter-server");
  if (existingApp) return existingApp;

  const serviceAccount: ServiceAccount = {
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key,
  };

  return initializeApp(
    { credential: cert(serviceAccount), projectId: account.project_id },
    "newsletter-server",
  );
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

  let app;
  try {
    app = getAdminApp();
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
  const subscriber = getFirestore(app).collection("newsletterSubscribers").doc(emailHash);

  try {
    await subscriber.create({
      email,
      consent: true,
      consentTextVersion: "2026-10-11",
      consentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      source: "homepage",
      status: "awaiting_confirmation",
    });
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

  return NextResponse.json({ status: "awaiting_confirmation" }, { status: 201 });
}
