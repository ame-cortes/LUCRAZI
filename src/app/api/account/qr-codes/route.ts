import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getBillingAccess } from "@/lib/billing-plans";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { isQrCodeEyeStyle, isQrCodeStyle } from "@/lib/qr-code-styling";
import { isSocialIconId } from "@/lib/social-icons";

const qrCollectionName = "qrCodes";
const maxLogoBytes = 256 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseQrCode(value: unknown) {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  let content = typeof value.content === "string" ? value.content.trim() : "";
  const contentType = value.contentType === "url" || value.contentType === "text"
    ? value.contentType
    : null;
  const foregroundColor = value.foregroundColor;
  const backgroundColor = value.backgroundColor;
  const qrStyle = value.qrStyle === undefined ? "square" : value.qrStyle;
  const eyeFrameStyle = value.eyeFrameStyle === undefined ? "square" : value.eyeFrameStyle;
  const eyeBallStyle = value.eyeBallStyle === undefined ? "square" : value.eyeBallStyle;
  const socialIconColor = value.socialIconColor === undefined || value.socialIconColor === ""
    ? foregroundColor
    : value.socialIconColor;
  const logoDataUrl = typeof value.logoDataUrl === "string" ? value.logoDataUrl : "";
  const socialIcon = value.socialIcon === undefined || value.socialIcon === ""
    ? ""
    : isSocialIconId(value.socialIcon) ? value.socialIcon : null;
  if (
    name.length < 1
    || name.length > 80
    || content.length < 1
    || content.length > 2048
    || !contentType
    || typeof foregroundColor !== "string"
    || !/^#[\da-f]{6}$/i.test(foregroundColor)
    || typeof backgroundColor !== "string"
    || !/^#[\da-f]{6}$/i.test(backgroundColor)
    || !isQrCodeStyle(qrStyle)
    || !isQrCodeEyeStyle(eyeFrameStyle)
    || !isQrCodeEyeStyle(eyeBallStyle)
    || typeof socialIconColor !== "string"
    || !/^#[\da-f]{6}$/i.test(socialIconColor)
    || logoDataUrl.length > Math.ceil(maxLogoBytes * 4 / 3) + 64
    || socialIcon === null
    || (socialIcon !== "" && !logoDataUrl)
  ) return null;

  if (contentType === "url") {
    // Adiciona https:// automaticamente se o usuário não colocou protocolo
    if (!/^https?:\/\//i.test(content)) {
      content = `https://${content}`;
    }
    try {
      const url = new URL(content);
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    } catch {
      return null;
    }
  }

  if (logoDataUrl && !/^data:image\/(?:png|jpeg);base64,[A-Za-z\d+/]+=*$/.test(logoDataUrl)) {
    return null;
  }

  return {
    name,
    content,
    contentType,
    foregroundColor,
    backgroundColor,
    qrStyle,
    eyeFrameStyle,
    eyeBallStyle,
    socialIconColor,
    logoDataUrl,
    socialIcon,
  };
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para acessar os QR Codes.", 401);

  try {
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(account.uid);
    const billingRef = userRef.collection("billing").doc("current");
    
    // Check if user needs trial activation
    const billingSnapshot = await billingRef.get();
    const existingBilling = billingSnapshot.data();
    
    if (!existingBilling || (!existingBilling.trialEndsAt && existingBilling.status !== "authorized")) {
      // Create 7-day trial for new users
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      await billingRef.set({
        planId: "solo",
        status: "trial",
        trialEndsAt: trialEndsAt.toISOString(),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    const [codesSnapshot, updatedBillingSnapshot] = await Promise.all([
      userRef.collection(qrCollectionName).orderBy("createdAt", "desc").get(),
      billingRef.get(),
    ]);
    const access = getBillingAccess(updatedBillingSnapshot.data());
    return NextResponse.json({
      codes: codesSnapshot.docs.map((savedCode) => {
        const data = savedCode.data();
        return {
          id: savedCode.id,
          name: data.name,
          content: data.content,
          contentType: data.contentType,
          foregroundColor: data.foregroundColor,
          backgroundColor: data.backgroundColor,
          qrStyle: isQrCodeStyle(data.qrStyle) ? data.qrStyle : "square",
          eyeFrameStyle: isQrCodeEyeStyle(data.eyeFrameStyle) ? data.eyeFrameStyle : "square",
          eyeBallStyle: isQrCodeEyeStyle(data.eyeBallStyle) ? data.eyeBallStyle : "square",
          socialIconColor: typeof data.socialIconColor === "string" && /^#[\da-f]{6}$/i.test(data.socialIconColor)
            ? data.socialIconColor
            : data.foregroundColor,
          logoDataUrl: data.logoDataUrl ?? "",
          socialIcon: isSocialIconId(data.socialIcon) ? data.socialIcon : "",
          publicId: data.publicId,
          trackingEnabled: data.trackingEnabled === true && access.hasMetrics,
          scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
          createdAt: data.createdAt?.toDate().toISOString() ?? null,
        };
      }),
      access,
      checkoutUrl: updatedBillingSnapshot.get("status") === "pending"
        && typeof updatedBillingSnapshot.get("checkoutUrl") === "string"
        ? updatedBillingSnapshot.get("checkoutUrl")
        : null,
    });
  } catch (error) {
    console.error("Não foi possível carregar os QR Codes da conta.", error);
    return jsonError("Não foi possível carregar seus QR Codes. Tente novamente mais tarde.", 503);
  }
}

export async function POST(request: Request) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para salvar um QR Code.", 401);
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 400_000) {
    return jsonError("O arquivo do logo ou os dados ultrapassam o tamanho permitido.", 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError("Não foi possível ler os dados do QR Code.", 400);
  }
  if (Buffer.byteLength(rawBody, "utf8") > 400_000) {
    return jsonError("O arquivo do logo ou os dados ultrapassam o tamanho permitido.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return jsonError("Envie os dados do QR Code em formato JSON.", 400);
  }
  const input = parseQrCode(body);
  if (!input) return jsonError("Confira o nome, conteúdo, cores e arquivo do QR Code.", 400);

  const logoBytes = input.logoDataUrl ? Math.floor((input.logoDataUrl.split(",")[1]?.length ?? 0) * 3 / 4) : 0;
  if (logoBytes > maxLogoBytes) return jsonError("O logo precisa ter até 256 KB.", 400);

  try {
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(account.uid);
    const billingRef = userRef.collection("billing").doc("current");
    const codesRef = userRef.collection(qrCollectionName);
    const qrCodeRef = codesRef.doc(randomUUID());
    const publicId = randomUUID();
    const result = await db.runTransaction(async (transaction) => {
      const [codesSnapshot, billingSnapshot] = await Promise.all([
        transaction.get(codesRef),
        transaction.get(billingRef),
      ]);
      const access = getBillingAccess(billingSnapshot.data());
      if (codesSnapshot.size >= access.qrLimit) return { limitReached: true };
      if ((input.logoDataUrl || input.socialIcon) && !access.hasLogo) return { logoNotIncluded: true };

      transaction.set(qrCodeRef, {
        ...input,
        publicId,
        trackingEnabled: access.hasMetrics && input.contentType === "url",
        scanCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(userRef, { lastQrUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return { limitReached: false, logoNotIncluded: false };
    });
    if (result.limitReached) {
      return jsonError("Você atingiu o limite de QR Codes do seu plano. Escolha um plano maior para criar mais.", 403);
    }
    if (result.logoNotIncluded) return jsonError("O logo está disponível nos planos pagos.", 403);
    return NextResponse.json({ id: qrCodeRef.id, publicId }, { status: 201 });
  } catch (error) {
    console.error("Não foi possível salvar o QR Code da conta.", error);
    return jsonError("Não foi possível salvar o QR Code. Tente novamente mais tarde.", 503);
  }
}
