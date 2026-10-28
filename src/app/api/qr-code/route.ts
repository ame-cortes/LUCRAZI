export const maxDuration = 30;

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { isBrevoEmailConfigured, sendQrCodeEmail } from "@/lib/newsletter-email";
import {
  isQrCodeEyeStyle,
  isQrCodeStyle,
  type QrCodeEyeStyle,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";
import { isQrCodeStylingShape } from "@/lib/qr-code-styling-adapter";
import { createQrCodeSvgServer } from "@/lib/qr-code-styling-server";

const appCheckJwks = createRemoteJWKSet(
  new URL("https://firebaseappcheck.googleapis.com/v1/jwks"),
  { timeoutDuration: 5_000 },
);
const consentTextVersion = "2026-10-14";
const requestCooldownMs = 60_000;
const maximumLogoBytes = 256 * 1024;

async function traceQrDeliveryStage<T>(stage: string, action: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  console.info("QR Code delivery stage started.", { stage });
  try {
    const result = await action();
    console.info("QR Code delivery stage completed.", { stage, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    console.error("QR Code delivery stage failed.", { stage, durationMs: Date.now() - startedAt }, error);
    throw error;
  }
}

type QrRequest = {
  email: string;
  content: string;
  contentType: "url" | "text";
  foregroundColor: string;
  gradientEndColor?: string;
  backgroundColor: string;
  qrStyle: QrCodeStyle;
  eyeFrameStyle: QrCodeEyeStyle;
  eyeBallStyle: QrCodeEyeStyle;
  eyeFrameColor: string;
  eyeBallColor: string;
  logoDataUrl?: string;
  svg?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function hasReasonableImageDimensions(format: string, bytes: Buffer) {
  let width = 0;
  let height = 0;

  if (format === "png" && bytes.length >= 24) {
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
  } else if (format === "jpeg") {
    let offset = 2;
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) return false;
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return false;
      if (startOfFrame.has(marker)) {
        if (segmentLength < 7) return false;
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        break;
      }
      offset += segmentLength;
    }
  }

  return width > 0
    && height > 0
    && width <= 2048
    && height <= 2048
    && width * height <= 4_194_304;
}

function getImageDimensions(format: string, bytes: Buffer) {
  let width = 0;
  let height = 0;

  if (format === "png" && bytes.length >= 24) {
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
    return { width, height };
  } else if (format === "jpeg") {
    let offset = 2;
    const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === undefined || marker === 0xda || marker === 0xd9) break;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
      if (startOfFrame.has(marker)) {
        if (segmentLength < 7) return null;
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
        return { width, height };
      }
      offset += segmentLength;
    }
  }

  return null;
}

function parseQrRequest(value: unknown): QrRequest | null {
  if (
    !isRecord(value)
    || typeof value.email !== "string"
    || typeof value.content !== "string"
    || (value.contentType !== "url" && value.contentType !== "text")
    || !validHexColor(value.foregroundColor)
    || (value.gradientEndColor !== undefined && !validHexColor(value.gradientEndColor))
    || !validHexColor(value.backgroundColor)
    || (value.qrStyle !== undefined && !isQrCodeStyle(value.qrStyle))
    || (value.eyeFrameStyle !== undefined && !isQrCodeEyeStyle(value.eyeFrameStyle))
    || (value.eyeBallStyle !== undefined && !isQrCodeEyeStyle(value.eyeBallStyle))
    || (value.eyeFrameColor !== undefined && !validHexColor(value.eyeFrameColor))
    || (value.eyeBallColor !== undefined && !validHexColor(value.eyeBallColor))
    || value.consent !== true
    || (value.logoDataUrl !== undefined && typeof value.logoDataUrl !== "string")
  ) return null;

  const email = value.email.trim().toLowerCase();
  let content = value.content.trim();
  if (
    email.length > 254
    || !/^[^ @]+@[^ @]+\.[^ @]+$/.test(email)
    || content.length === 0
    || content.length > 2048
  ) return null;

  if (value.contentType === "url") {
    // Adiciona https:// automaticamente se o usuário não colocou protocolo
    if (!/^https?:\/\//i.test(content)) {
      content = `https://${content}`;
    }
    try {
      const url = new URL(content);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    } catch {
      return null;
    }
  }

  return {
    email,
    content,
    contentType: value.contentType,
    foregroundColor: value.foregroundColor,
    ...(validHexColor(value.gradientEndColor) ? { gradientEndColor: value.gradientEndColor } : {}),
    backgroundColor: value.backgroundColor,
    qrStyle: isQrCodeStyle(value.qrStyle) ? value.qrStyle : "square",
    eyeFrameStyle: isQrCodeEyeStyle(value.eyeFrameStyle) ? value.eyeFrameStyle : "square",
    eyeBallStyle: isQrCodeEyeStyle(value.eyeBallStyle) ? value.eyeBallStyle : "square",
    eyeFrameColor: validHexColor(value.eyeFrameColor) ? value.eyeFrameColor : value.foregroundColor,
    eyeBallColor: validHexColor(value.eyeBallColor) ? value.eyeBallColor : value.foregroundColor,
    ...(typeof value.logoDataUrl === "string" ? { logoDataUrl: value.logoDataUrl } : {}),
    ...(typeof value.svg === "string" ? { svg: value.svg } : {}),
  };
}

function parseLogo(value: string | undefined) {
  if (!value) return null;

  const match = value.match(/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("Envie o logo como uma imagem PNG ou JPEG válida.");

  const [, format, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  if (
    bytes.byteLength > maximumLogoBytes
    || (format === "png" && !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    || (format === "jpeg" && !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff))
  ) throw new Error("O logo precisa ser um PNG ou JPEG válido com até 256 KB.");
  
  const dimensions = getImageDimensions(format, bytes);
  if (!dimensions || !hasReasonableImageDimensions(format, bytes)) {
    throw new Error("O logo precisa ter dimensões válidas de até 2048 x 2048 pixels.");
  }
  // Rejeita logos muito grandes para evitar timeout
  if (dimensions.width > 512 || dimensions.height > 512) {
    throw new Error("O logo está muito grande. Use uma imagem de até 512 x 512 pixels.");
  }

  return { format, base64 };
}

async function createQrSvg(input: QrRequest, logo: ReturnType<typeof parseLogo>) {
  if (input.svg) return input.svg;
  return createQrCodeSvgServer(input.content, {
    foregroundColor: input.foregroundColor,
    ...(input.gradientEndColor ? { gradientEndColor: input.gradientEndColor } : {}),
    backgroundColor: input.backgroundColor,
    style: input.qrStyle,
    eyeFrameStyle: input.eyeFrameStyle,
    eyeBallStyle: input.eyeBallStyle,
    eyeFrameColor: input.eyeFrameColor,
    eyeBallColor: input.eyeBallColor,
    logoDataUrl: logo ? `data:image/${logo.format};base64,${logo.base64}` : "",
  });
}

export async function POST(request: Request) {
  if (!isBrevoEmailConfigured()) {
    return NextResponse.json({ error: "A integração de e-mail ainda não está configurada." }, { status: 503 });
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return NextResponse.json({ error: "A integração de registro do pedido ainda não está configurada." }, { status: 503 });
  }
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY
  ) {
    return NextResponse.json({ error: "A proteção App Check ainda não está habilitada para este site." }, { status: 503 });
  }
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return NextResponse.json({ error: "Envie os dados em formato JSON." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 400_000) {
    return NextResponse.json({ error: "O pedido ultrapassa o tamanho permitido." }, { status: 413 });
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
    const { payload, protectedHeader } = await traceQrDeliveryStage("app-check-verification", () =>
      jwtVerify(appCheckToken, appCheckJwks, {
        algorithms: ["RS256"],
        audience: `projects/${projectNumber}`,
        issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
      }));
    if (protectedHeader.typ !== "JWT" || payload.sub !== expectedAppId) {
      return NextResponse.json({ error: "Token App Check de outro aplicativo." }, { status: 401 });
    }
  } catch (error) {
    console.warn("O pedido de QR Code foi recusado porque o token App Check não pôde ser validado.", error);
    return NextResponse.json({ error: "Token App Check inválido." }, { status: 401 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o corpo da solicitação." }, { status: 400 });
  }
  if (Buffer.byteLength(rawBody, "utf8") > 400_000) {
    return NextResponse.json({ error: "O pedido ultrapassa o tamanho permitido." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "O corpo da solicitação precisa ser JSON válido." }, { status: 400 });
  }

  const input = parseQrRequest(body);
  if (!input) {
    return NextResponse.json({
      error: "Confira o e-mail, o conteúdo, as cores e a autorização para receber o arquivo solicitado.",
    }, { status: 400 });
  }

  let logo: ReturnType<typeof parseLogo>;
  let qrSvg: string;
  try {
    logo = parseLogo(input.logoDataUrl);
    qrSvg = await traceQrDeliveryStage("qr-svg-generation", () => createQrSvg(input, logo));
    // Gera PNG em background, não bloqueia resposta
    void (async () => {
      try {
        const isStylingShape = isQrCodeStylingShape(input.qrStyle);
        let pngSize = 512;
        if (isStylingShape && logo) {
          pngSize = 128;
        } else if (isStylingShape || logo) {
          pngSize = logo ? 256 : 384;
        }
        const qrPng = await traceQrDeliveryStage("qr-png-rasterization-bg", () =>
          sharp(Buffer.from(qrSvg))
            .resize({ width: pngSize, height: pngSize })
            .png()
            .toBuffer());
        
        // Salva PNG no Firestore para envio por e-mail
        await traceQrDeliveryStage("firestore-save-png", async () => {
          await lead.set({
            qrSvg,
            qrPng: qrPng.toString('base64'),
            pngSize,
          }, { merge: true });
        });
        
        // Envia e-mail com PNG em background
        const emailPromise = traceQrDeliveryStage("brevo-email-delivery", () => sendQrCodeEmail(input.email, qrPng));
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout no envio de e-mail")), 5000)
        );
        await Promise.race([emailPromise, timeoutPromise]);
        
        await traceQrDeliveryStage("firestore-sent-delivery-update", () =>
          lead.update({
            deliveryStatus: "sent",
            deliverySentAt: FieldValue.serverTimestamp(),
          }));
      } catch (error) {
        console.error("Erro no processamento em background do QR Code", error);
      }
    })();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível preparar o QR Code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let db;
  try {
    db = getFirebaseAdminDb();
  } catch (error) {
    console.error("Não foi possível inicializar o Firebase Admin para a entrega de QR Code.", error);
    return NextResponse.json({ error: "A entrega está temporariamente indisponível." }, { status: 503 });
  }

  const emailHash = createHash("sha256").update(input.email).digest("hex");
  const lead = db.collection("qrCodeLeads").doc(emailHash);
  
  // Verifica cooldown de forma síncrona (rápido)
  const existingDoc = await lead.get();
  const lastRequestAt = existingDoc.get("lastRequestAt");
  if (
    lastRequestAt instanceof Timestamp
    && Date.now() - lastRequestAt.toMillis() < requestCooldownMs
  ) {
    return NextResponse.json({
      error: "Aguarde um minuto antes de solicitar outro QR Code para este e-mail.",
    }, { status: 429 });
  }
  
  // Registra o pedido e processa envio em background
  void (async () => {
    try {
      await traceQrDeliveryStage("firestore-lead-registration", async () => {
        await lead.set({
          email: input.email,
          purpose: "qr_code_delivery",
          source: "gerador-qr",
          consent: true,
          consentTextVersion,
          consentAt: FieldValue.serverTimestamp(),
          lastRequestAt: FieldValue.serverTimestamp(),
          requestCount: FieldValue.increment(1),
          deliveryStatus: "pending",
          qrSvg: qrSvg,
          ...(existingDoc.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        }, { merge: true });
      });
    } catch (error) {
      console.error("Não foi possível registrar o pedido de QR Code no Firestore.", error);
    }
  })();

  return NextResponse.json({ status: "sent" }, { status: 201 });
}
