import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FieldValue } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import {
  isBrevoConfigured,
  sendEbookDeliveryEmail,
} from "@/lib/newsletter-email";
import { subscribeNewsletterSubscriber } from "@/lib/newsletter-subscription";

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

function createEbookResponse(
  ebook: Uint8Array,
  marketingStatus: string,
  ebookEmailStatus: string,
) {
  const body = new ArrayBuffer(ebook.byteLength);
  new Uint8Array(body).set(ebook);

  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="como-faturar-seus-primeiros-1000-na-internet.pdf"',
      "Content-Length": String(ebook.byteLength),
      "Content-Type": "application/pdf",
      "X-Lucrazi-Marketing-Status": marketingStatus,
      "X-Lucrazi-Ebook-Email-Status": ebookEmailStatus,
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

  if (
    !isRecord(body)
    || typeof body.email !== "string"
    || body.consent !== true
    || (body.marketingConsent !== undefined && typeof body.marketingConsent !== "boolean")
  ) {
    return NextResponse.json({ error: "Informe um e-mail e autorize o uso dos dados para liberar o e-book." }, { status: 400 });
  }

  const marketingConsent = body.marketingConsent === true;
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
    const ebookLead = {
      email,
      ebook: "como-faturar-seus-primeiros-1000-na-internet",
      consent: true,
      consentTextVersion: "2026-10-13",
      consentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      source: "ferramentas-ebook",
      purpose: "ebook_delivery",
      ebookEmailStatus: "pending",
      ebookEmailRequestedAt: FieldValue.serverTimestamp(),
    };
    const existing = await lead.get();
    if (existing.exists) {
      await lead.update({
        ebookEmailStatus: "pending",
        ebookEmailRequestedAt: FieldValue.serverTimestamp(),
        ebookEmailSentAt: FieldValue.delete(),
        ...(marketingConsent
          ? {
            marketingConsent: true,
            marketingConsentTextVersion: "2026-10-13",
            marketingConsentAt: FieldValue.serverTimestamp(),
          }
          : {}),
      });
    } else {
      await lead.create({
        ...ebookLead,
        marketingConsent,
        ...(marketingConsent
          ? {
              marketingConsentTextVersion: "2026-10-13",
              marketingConsentAt: FieldValue.serverTimestamp(),
            }
          : {}),
      });
    }
  } catch (error) {
    if (isAlreadyExists(error)) {
      if (marketingConsent) {
        try {
          await lead.update({
            ebookEmailStatus: "pending",
            ebookEmailRequestedAt: FieldValue.serverTimestamp(),
            ebookEmailSentAt: FieldValue.delete(),
            marketingConsent: true,
            marketingConsentTextVersion: "2026-10-13",
            marketingConsentAt: FieldValue.serverTimestamp(),
          });
        } catch (updateError) {
          console.error("Não foi possível registrar o consentimento para campanhas do pedido do e-book.", updateError);
          return NextResponse.json({ error: "Não foi possível registrar sua autorização para campanhas." }, { status: 500 });
        }
      } else {
        try {
          await lead.update({
            ebookEmailStatus: "pending",
            ebookEmailRequestedAt: FieldValue.serverTimestamp(),
            ebookEmailSentAt: FieldValue.delete(),
          });
        } catch (updateError) {
          console.error("Não foi possível atualizar o registro de entrega do e-book.", updateError);
          return NextResponse.json({ error: "Não foi possível registrar o pedido do e-book." }, { status: 500 });
        }
      }
    } else {
      console.error("Não foi possível registrar o pedido do e-book no Firestore.", error);
      return NextResponse.json({ error: "Não foi possível liberar o e-book. Tente novamente mais tarde." }, { status: 500 });
    }
  }

  let marketingStatus = "not-requested";
  let ebookIncludedInWelcome = false;
  if (marketingConsent) {
    if (process.env.NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED !== "true") {
      console.warn("Um pedido de e-book autorizou campanhas, mas a integração da lista de novidades está desativada.");
      marketingStatus = "unavailable";
    } else {
      try {
        const subscription = await subscribeNewsletterSubscriber(email, emailHash, {
          source: "ferramentas-ebook",
          consentTextVersion: "2026-10-13",
          ebookAttachment: ebook,
        });
        marketingStatus = subscription.status;
        ebookIncludedInWelcome = subscription.welcomeSent;
      } catch (error) {
        console.error("O pedido do e-book foi gravado, mas não foi possível inscrever o contato nas campanhas.", error);
        marketingStatus = "failed";
      }
    }
  }

  let ebookEmailStatus = "unconfigured";
  if (ebookIncludedInWelcome) {
    ebookEmailStatus = "included-in-welcome";
  } else if (isBrevoConfigured()) {
    try {
      const sent = await sendEbookDeliveryEmail(email, ebook);
      ebookEmailStatus = sent ? "sent" : "unconfigured";
    } catch (error) {
      console.error("O pedido do e-book foi registrado, mas o e-mail com o PDF não foi enviado.", error);
      ebookEmailStatus = "failed";
    }
  }

  try {
    await lead.update({
      ebookEmailStatus,
      ...(ebookEmailStatus === "sent" || ebookEmailStatus === "included-in-welcome"
        ? { ebookEmailSentAt: FieldValue.serverTimestamp() }
        : {}),
    });
  } catch (error) {
    console.error("Não foi possível registrar o resultado do envio do e-book.", error);
  }

  return createEbookResponse(ebook, marketingStatus, ebookEmailStatus);
}
