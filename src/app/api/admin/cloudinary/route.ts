import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyNewsletterAdmin } from "@/lib/firebase-admin";

const maxImageSize = 10 * 1024 * 1024;
const allowedImageTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
const imagePublicIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  const admin = await verifyNewsletterAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Configure as credenciais do Cloudinary no servidor." }, { status: 503 });
  }
  if (!/^[a-z0-9-]+$/i.test(cloudName) || !/^\d+$/.test(apiKey)) {
    console.error("As credenciais públicas do Cloudinary têm formato inválido.");
    return NextResponse.json({ error: "A configuração do Cloudinary está inválida." }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxImageSize + 64 * 1024) {
    return NextResponse.json({ error: "A imagem deve ter no máximo 10 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie a imagem em um formulário válido." }, { status: 400 });
  }

  const file = form.get("file");
  const publicId = form.get("publicId");
  if (
    !(file instanceof File)
    || typeof publicId !== "string"
    || publicId.length > 200
    || !imagePublicIdPattern.test(publicId)
  ) {
    return NextResponse.json({ error: "A imagem ou o nome SEO informado é inválido." }, { status: 400 });
  }
  if (!allowedImageTypes.has(file.type)) {
    return NextResponse.json({ error: "Use uma imagem JPEG, PNG, WebP, AVIF ou GIF." }, { status: 415 });
  }
  if (file.size === 0 || file.size > maxImageSize) {
    return NextResponse.json({ error: "A imagem deve ter até 10 MB." }, { status: 413 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const parameters = {
    folder: "lucrazi/artigos",
    overwrite: "false",
    public_id: publicId,
    timestamp,
  };
  const signatureInput = Object.entries(parameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1").update(`${signatureInput}${apiSecret}`).digest("hex");
  const cloudinaryForm = new FormData();
  cloudinaryForm.set("file", file, file.name);
  cloudinaryForm.set("api_key", apiKey);
  cloudinaryForm.set("timestamp", timestamp);
  cloudinaryForm.set("folder", parameters.folder);
  cloudinaryForm.set("public_id", publicId);
  cloudinaryForm.set("overwrite", parameters.overwrite);
  cloudinaryForm.set("signature", signature);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryForm,
      cache: "no-store",
    });
  } catch (error) {
    console.error("Não foi possível conectar ao Cloudinary.", error);
    return NextResponse.json({ error: "Não foi possível conectar ao Cloudinary." }, { status: 502 });
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    console.error("O Cloudinary retornou uma resposta inválida.", { status: response.status, error });
    return NextResponse.json({ error: "O Cloudinary retornou uma resposta inválida." }, { status: 502 });
  }

  if (!response.ok) {
    console.error("O Cloudinary recusou o upload.", { status: response.status, publicId });
    if (response.status === 409) {
      return NextResponse.json({ error: "Esse nome de imagem já existe. Escolha outro número." }, { status: 409 });
    }
    return NextResponse.json({ error: "O Cloudinary recusou o upload. Verifique a configuração da conta." }, { status: 502 });
  }
  if (!isRecord(result) || typeof result.secure_url !== "string" || typeof result.public_id !== "string") {
    console.error("O Cloudinary confirmou um upload sem os campos esperados.", { publicId });
    return NextResponse.json({ error: "O Cloudinary não confirmou os dados da imagem." }, { status: 502 });
  }

  return NextResponse.json({ imageUrl: result.secure_url, publicId: result.public_id });
}
