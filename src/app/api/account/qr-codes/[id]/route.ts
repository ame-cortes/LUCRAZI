import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getBillingAccess } from "@/lib/billing-plans";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { isSocialIconId } from "@/lib/social-icons";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para editar um QR Code.", 401);
  const { id } = await params;
  if (!/^[a-f\d-]{36}$/i.test(id)) return jsonError("QR Code não encontrado.", 404);
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
  if (!isRecord(body)) return jsonError("Os dados do QR Code são inválidos.", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  let content = typeof body.content === "string" ? body.content.trim() : "";
  const contentType = body.contentType === "url" || body.contentType === "text"
    ? body.contentType
    : null;
  const foregroundColor = body.foregroundColor;
  const backgroundColor = body.backgroundColor;
  const socialIconColor = body.socialIconColor === undefined || body.socialIconColor === ""
    ? foregroundColor
    : body.socialIconColor;
  const logoDataUrl = typeof body.logoDataUrl === "string" ? body.logoDataUrl : "";
  const socialIcon = body.socialIcon === undefined || body.socialIcon === ""
    ? ""
    : isSocialIconId(body.socialIcon) ? body.socialIcon : null;
  if (
    name.length < 1 || name.length > 80
    || content.length < 1 || content.length > 2048
    || !contentType
    || typeof foregroundColor !== "string" || !/^#[\da-f]{6}$/i.test(foregroundColor)
    || typeof backgroundColor !== "string" || !/^#[\da-f]{6}$/i.test(backgroundColor)
    || typeof socialIconColor !== "string" || !/^#[\da-f]{6}$/i.test(socialIconColor)
    || logoDataUrl.length > 350_000
    || (logoDataUrl.length > 0 && !/^data:image\/(?:png|jpeg);base64,[A-Za-z\d+/]+=*$/.test(logoDataUrl))
    || socialIcon === null
    || (socialIcon !== "" && !logoDataUrl)
  ) return jsonError("Confira o nome, conteúdo, cores e arquivo do QR Code.", 400);

  if (contentType === "url") {
    // Adiciona https:// automaticamente se o usuário não colocou protocolo
    if (!/^https?:\/\//i.test(content)) {
      content = `https://${content}`;
    }
    try {
      const url = new URL(content);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    } catch {
      return jsonError("Informe um endereço iniciado por http:// ou https://.", 400);
    }
  }
  const logoBytes = logoDataUrl ? Math.floor((logoDataUrl.split(",")[1]?.length ?? 0) * 3 / 4) : 0;
  if (logoBytes > 256 * 1024) return jsonError("O logo precisa ter até 256 KB.", 400);

  try {
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(account.uid);
    const codeRef = userRef.collection("qrCodes").doc(id);
    const billingRef = userRef.collection("billing").doc("current");
    const result = await db.runTransaction(async (transaction) => {
      const [codeSnapshot, billingSnapshot] = await Promise.all([
        transaction.get(codeRef),
        transaction.get(billingRef),
      ]);
      if (!codeSnapshot.exists) return "not_found";
      const access = getBillingAccess(billingSnapshot.data());
      if ((logoDataUrl || socialIcon) && !access.hasLogo) return "logo_not_included";
      transaction.update(codeRef, {
        name,
        content,
        contentType,
        foregroundColor,
        backgroundColor,
        socialIconColor,
        logoDataUrl: access.hasLogo ? logoDataUrl : "",
        socialIcon: access.hasLogo ? socialIcon : "",
        trackingEnabled: access.hasMetrics && contentType === "url",
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(userRef, { lastQrUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return "updated";
    });
    if (result === "not_found") return jsonError("QR Code não encontrado.", 404);
    if (result === "logo_not_included") return jsonError("O logo está disponível nos planos pagos.", 403);
    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Não foi possível atualizar o QR Code da conta.", error);
    return jsonError("Não foi possível atualizar o QR Code. Tente novamente mais tarde.", 503);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para excluir um QR Code.", 401);
  const { id } = await params;
  if (!/^[a-f\d-]{36}$/i.test(id)) return jsonError("QR Code não encontrado.", 404);

  try {
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(account.uid);
    const codeRef = userRef.collection("qrCodes").doc(id);
    const codeSnapshot = await codeRef.get();
    if (!codeSnapshot.exists) return jsonError("QR Code não encontrado.", 404);
    await db.runTransaction(async (transaction) => {
      transaction.delete(codeRef);
      transaction.set(userRef, { lastQrUpdatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Não foi possível excluir o QR Code da conta.", error);
    return jsonError("Não foi possível excluir o QR Code. Tente novamente mais tarde.", 503);
  }
}
