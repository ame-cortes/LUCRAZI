import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

const ebookPath = join(
  process.cwd(),
  "assets",
  "ebooks",
  "como-faturar-seus-primeiros-1000-na-internet.pdf",
);
const appCheckJwks = createRemoteJWKSet(
  new URL("https://firebaseappcheck.googleapis.com/v1/jwks"),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAlreadyExists(error: unknown) {
  return isRecord(error) && (error.code === 6 || error.code === "already-exists");
}

function createEbookResponse(ebook: Uint8Array) {
  const body = new ArrayBuffer(ebook.byteLength);
  new Uint8Array(body).set(ebook);

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="como-faturar-seus-primeiros-1000-na-internet.pdf"',
      "Content-Length": String(ebook.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_EBOOK_SIGNUP_ENABLED !== "true") {
    return NextResponse.json({ error: "A liberação do e-book está temporariamente indisponível." }, { status: 503 });
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
    console.warn("O pedido do e-book foi recusado porque o token App Check não pôde ser validado.", error);
    return NextResponse.json({ error: "Token App Check inválido." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da solicitação precisa ser JSON válido." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.email !== "string" || body.consent !== true) {
    return NextResponse.json({ error: "Informe um e-mail e autorize o uso dos dados para liberar o e-book." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um endereço de e-mail válido." }, { status: 400 });
  }

  let ebook: Buffer;
  try {
    ebook = await readFile(ebookPath);
  } catch (error) {
    console.error("Não foi possível ler o arquivo do e-book.", error);
    return NextResponse.json({ error: "O arquivo está temporariamente indisponível." }, { status: 503 });
  }

  let db;
  try {
    db = getFirebaseAdminDb();
  } catch (error) {
    console.error("Não foi possível inicializar o Firebase Admin para pedidos de e-book.", error);
    return NextResponse.json({ error: "A liberação está temporariamente indisponível." }, { status: 503 });
  }

  const emailHash = createHash("sha256").update(email).digest("hex");
  const lead = db.collection("ebookLeads").doc(emailHash);

  try {
    await lead.create({
      email,
      ebook: "como-faturar-seus-primeiros-1000-na-internet",
      consent: true,
      consentTextVersion: "2026-10-12",
      consentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      source: "ebook.lucrazi.com.br",
      purpose: "ebook_delivery",
    });
  } catch (error) {
    if (isAlreadyExists(error)) {
      return createEbookResponse(ebook);
    }

    console.error("Não foi possível registrar o pedido do e-book no Firestore.", error);
    return NextResponse.json({ error: "Não foi possível liberar o e-book. Tente novamente mais tarde." }, { status: 500 });
  }

  return createEbookResponse(ebook);
}
