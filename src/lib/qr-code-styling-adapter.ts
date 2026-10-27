import type { Options as QrCodeStylingOptions } from "qr-code-styling";
import type { QrCodeEyeStyle } from "@/lib/qr-code-styling";

export const QRCODE_STYLING_SHAPES = ["classy", "classy-rounded", "extra-rounded"] as const;
export type QrCodeStylingShape = (typeof QRCODE_STYLING_SHAPES)[number];

export type QrCodeStylingRenderOptions = {
  foregroundColor: string;
  gradientEndColor?: string;
  backgroundColor: string;
  eyeFrameStyle: QrCodeEyeStyle;
  eyeBallStyle: QrCodeEyeStyle;
  eyeFrameColor: string;
  eyeBallColor: string;
  logoDataUrl?: string;
};

export function isQrCodeStylingShape(value: string): value is QrCodeStylingShape {
  return QRCODE_STYLING_SHAPES.includes(value as QrCodeStylingShape);
}

export function createQrCodeStylingOptions(
  content: string,
  options: QrCodeStylingRenderOptions,
  margin: number,
): Partial<QrCodeStylingOptions> {
  const gradient = options.gradientEndColor
    ? {
        type: "linear" as const,
        colorStops: [
          { offset: 0, color: options.foregroundColor },
          { offset: 1, color: options.gradientEndColor },
        ],
      }
    : undefined;
  return {
    type: "svg",
    width: 720,
    height: 720,
    margin,
    data: content,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: {
      color: options.foregroundColor,
      type: "classy",
      ...(gradient ? { gradient } : {}),
    },
    cornersSquareOptions: { color: options.foregroundColor, type: "square", ...(gradient ? { gradient } : {}) },
    cornersDotOptions: { color: options.foregroundColor, type: "square", ...(gradient ? { gradient } : {}) },
    backgroundOptions: { color: options.backgroundColor },
    ...(options.logoDataUrl
      ? {
          image: options.logoDataUrl,
          imageOptions: { hideBackgroundDots: true, imageSize: 0.14, margin: 0 },
        }
      : {}),
  };
}

function eyeShape(
  x: number,
  y: number,
  size: number,
  style: QrCodeEyeStyle,
  color: string,
) {
  if (style === "circle") {
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${color}"/>`;
  }
  if (style === "rounded") {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.2}" fill="${color}"/>`;
  }
  if (style === "diamond") {
    return `<path d="M${x + size / 2} ${y}L${x + size} ${y + size / 2}L${x + size / 2} ${y + size}L${x} ${y + size / 2}Z" fill="${color}"/>`;
  }
  if (style === "octagon") {
    return `<path d="M${x + size * 0.28} ${y}H${x + size * 0.72}L${x + size} ${y + size * 0.28}V${y + size * 0.72}L${x + size * 0.72} ${y + size}H${x + size * 0.28}L${x} ${y + size * 0.72}V${y + size * 0.28}Z" fill="${color}"/>`;
  }
  if (style === "leaf") {
    return `<path d="M${x + size / 2} ${y}Q${x + size} ${y + size * 0.28} ${x + size} ${y + size / 2}Q${x + size * 0.72} ${y + size} ${x + size / 2} ${y + size}Q${x} ${y + size * 0.72} ${x} ${y + size / 2}Q${x + size * 0.28} ${y} ${x + size / 2} ${y}Z" fill="${color}"/>`;
  }
  if (style === "heart") {
    return `<path d="M${x + size / 2} ${y + size}C${x + size * 0.3} ${y + size * 0.85} ${x - size * 0.1} ${y + size * 0.55} ${x + size * 0.05} ${y + size * 0.35}C${x + size * 0.05} ${y + size * 0.15} ${x + size * 0.3} ${y + size * 0.05} ${x + size / 2} ${y + size * 0.15}C${x + size * 0.7} ${y + size * 0.05} ${x + size * 0.95} ${y + size * 0.15} ${x + size * 0.95} ${y + size * 0.35}C${x + size * 1.1} ${y + size * 0.55} ${x + size * 0.7} ${y + size * 0.85} ${x + size / 2} ${y + size}Z" fill="${color}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}"/>`;
}

export function addQrCodeStylingEyePatterns(
  svg: string,
  moduleCount: number,
  margin: number,
  options: QrCodeStylingRenderOptions,
) {
  const moduleSize = (720 - margin * 2) / moduleCount;
  const origins: [number, number][] = [
    [0, 0],
    [0, moduleCount - 7],
    [moduleCount - 7, 0],
  ];
  const patterns = origins.map(([row, column]) => {
    const x = margin + column * moduleSize;
    const y = margin + row * moduleSize;
    const frameColor = options.eyeFrameColor === options.foregroundColor
      ? options.gradientEndColor ? "url(#qr-code-gradient)" : options.eyeFrameColor
      : options.eyeFrameColor;
    const ballColor = options.eyeBallColor === options.foregroundColor
      ? options.gradientEndColor ? "url(#qr-code-gradient)" : options.eyeBallColor
      : options.eyeBallColor;
    return [
      `<rect x="${x}" y="${y}" width="${moduleSize * 7}" height="${moduleSize * 7}" fill="${options.backgroundColor}"/>`,
      eyeShape(x, y, moduleSize * 7, options.eyeFrameStyle, frameColor),
      `<rect x="${x + moduleSize}" y="${y + moduleSize}" width="${moduleSize * 5}" height="${moduleSize * 5}" fill="${options.backgroundColor}"/>`,
      eyeShape(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, options.eyeBallStyle, ballColor),
    ].join("");
  }).join("");

  const gradient = options.gradientEndColor
    ? `<defs><linearGradient id="qr-code-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="720" y2="0"><stop offset="0%" stop-color="${options.foregroundColor}"/><stop offset="100%" stop-color="${options.gradientEndColor}"/></linearGradient></defs>`
    : "";
  return svg.replace("</svg>", `${gradient}${patterns}</svg>`);
}

export async function readQrCodeStylingSvg(data: Blob | Uint8Array | null) {
  if (data instanceof Blob) return data.text();
  if (data instanceof Uint8Array) return new TextDecoder().decode(data);
  throw new Error("A biblioteca QRCodeStyling não retornou o SVG.");
}
