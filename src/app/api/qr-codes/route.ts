import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isQrCodeEyeStyle, isQrCodeStyle } from "@/lib/qr-code-styling";
import { createQrCodeSvgServer } from "@/lib/qr-code-styling-server";

function normalizeApiKey(value: string) {
  return createHash("sha256").update(value.trim()).digest("hex");
}

function getConfiguredApiKeys() {
  const values = (process.env.QR_API_KEYS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(values.map((value) => normalizeApiKey(value)));
}

function parseJsonBody(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const destination = typeof record.target === "string" ? record.target.trim() : "";
  const content = typeof record.content === "string" ? record.content.trim() : "";
  const foreground = typeof record.foregroundColor === "string" ? record.foregroundColor : "#243B2B";
  const gradientEndColor = record.gradientEndColor === undefined ? "" : record.gradientEndColor;
  const background = typeof record.backgroundColor === "string" ? record.backgroundColor : "#FFFFFF";
  const qrStyle = record.qrStyle === undefined ? "square" : record.qrStyle;
  const eyeFrameStyle = record.eyeFrameStyle === undefined ? "square" : record.eyeFrameStyle;
  const eyeBallStyle = record.eyeBallStyle === undefined ? "square" : record.eyeBallStyle;
  const eyeFrameColor = record.eyeFrameColor === undefined ? foreground : record.eyeFrameColor;
  const eyeBallColor = record.eyeBallColor === undefined ? foreground : record.eyeBallColor;
  const logoDataUrl = typeof record.logoDataUrl === "string" ? record.logoDataUrl : undefined;

  if (!destination && !content) {
    return null;
  }

  if (destination && !/^https?:\/\//i.test(destination)) {
    return null;
  }
  if (
    !isQrCodeStyle(qrStyle)
    || !isQrCodeEyeStyle(eyeFrameStyle)
    || !isQrCodeEyeStyle(eyeBallStyle)
    || (typeof gradientEndColor !== "string" || (gradientEndColor !== "" && !/^#[\da-f]{6}$/i.test(gradientEndColor)))
    || typeof eyeFrameColor !== "string" || !/^#[\da-f]{6}$/i.test(eyeFrameColor)
    || typeof eyeBallColor !== "string" || !/^#[\da-f]{6}$/i.test(eyeBallColor)
  ) return null;

  return {
    content: content || destination,
    target: destination || undefined,
    foregroundColor: /^#[0-9a-fA-F]{6}$/.test(foreground) ? foreground : "#243B2B",
    gradientEndColor,
    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(background) ? background : "#FFFFFF",
    qrStyle,
    eyeFrameStyle,
    eyeBallStyle,
    eyeFrameColor,
    eyeBallColor,
    logoDataUrl,
  };
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    name: "Lucrazi QR API",
    version: "v1",
    description: "API para gerar QR Codes de forma simples e extensível para uso futuro em integrações B2B.",
    methods: [
      "POST /api/qr-codes",
      "GET /api/qr-codes/:id",
      "POST /api/qr-codes/:id/track",
    ],
    auth: {
      type: "apiKey",
      header: "X-API-Key",
      alternative: "Authorization: Bearer <api-key>",
    },
  });
}

export async function POST(request: Request) {
  const configuredKeys = getConfiguredApiKeys();
  if (configuredKeys.size === 0) {
    return NextResponse.json({
      error: "A API de QR Code ainda não está configurada. Defina QR_API_KEYS para habilitar o acesso B2B.",
    }, { status: 503 });
  }

  const authorizationHeader = request.headers.get("x-api-key") ?? request.headers.get("authorization");
  const apiKey = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7).trim()
    : authorizationHeader?.trim();

  if (!apiKey || !configuredKeys.has(normalizeApiKey(apiKey))) {
    return NextResponse.json({ error: "Chave de API inválida ou ausente." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "O corpo da requisição precisa ser um JSON válido." }, { status: 400 });
  }

  const parsed = parseJsonBody(body);
  if (!parsed) {
    return NextResponse.json({
      error: "Informe pelo menos target ou content com um link/valor válido.",
    }, { status: 400 });
  }

  const id = `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  const svg = await createQrCodeSvgServer(parsed.content, {
    foregroundColor: parsed.foregroundColor,
    ...(parsed.gradientEndColor ? { gradientEndColor: parsed.gradientEndColor } : {}),
    backgroundColor: parsed.backgroundColor,
    style: parsed.qrStyle,
    eyeFrameStyle: parsed.eyeFrameStyle,
    eyeBallStyle: parsed.eyeBallStyle,
    eyeFrameColor: parsed.eyeFrameColor,
    eyeBallColor: parsed.eyeBallColor,
  });

  return NextResponse.json({
    id,
    createdAt: new Date().toISOString(),
    target: parsed.target ?? null,
    content: parsed.content,
    metadata: {
      foregroundColor: parsed.foregroundColor,
      ...(parsed.gradientEndColor ? { gradientEndColor: parsed.gradientEndColor } : {}),
      backgroundColor: parsed.backgroundColor,
      qrStyle: parsed.qrStyle,
      eyeFrameStyle: parsed.eyeFrameStyle,
      eyeBallStyle: parsed.eyeBallStyle,
      eyeFrameColor: parsed.eyeFrameColor,
      eyeBallColor: parsed.eyeBallColor,
      logoIncluded: Boolean(parsed.logoDataUrl),
    },
    qrCode: {
      format: "svg",
      data: svg,
      dataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    },
  }, { status: 201 });
}
