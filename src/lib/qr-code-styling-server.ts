import { JSDOM } from "jsdom";
import QRCodeStyling from "qr-code-styling";
import {
  addQrCodeStylingEyePatterns,
  createQrCodeStylingOptions,
  isQrCodeStylingShape,
  readQrCodeStylingSvg,
  type QrCodeStylingRenderOptions,
  type QrCodeStylingShape,
} from "@/lib/qr-code-styling-adapter";
import {
  createQrCodeSvg,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";

type QrCodeSvgOptions = QrCodeStylingRenderOptions & {
  style: QrCodeStyle;
};

async function createQrCodeStylingSvgServer(
  content: string,
  shape: QrCodeStylingShape,
  options: QrCodeStylingRenderOptions,
) {
  const stylingOptions = createQrCodeStylingOptions(content, options, 0);
  const qrCode = new QRCodeStyling({
    ...stylingOptions,
    dotsOptions: { ...stylingOptions.dotsOptions, type: shape },
    jsdom: JSDOM,
  });
  // Tenta gerar com logo; se falhar, tenta sem logo para não quebrar o envio
  try {
    const moduleCount = qrCode._qr?.getModuleCount();
    if (!moduleCount) throw new Error("A biblioteca QRCodeStyling não criou a matriz do QR.");
    const margin = (720 * 4) / (moduleCount + 8);
    qrCode.update({ margin });
    const svg = await readQrCodeStylingSvg(await qrCode.getRawData("svg"));
    return addQrCodeStylingEyePatterns(svg, moduleCount, margin, options);
  } catch (_err) {
    // Fallback sem logo
    if (!options.logoDataUrl) throw new Error("A biblioteca QRCodeStyling não conseguiu criar a matriz do QR.");
    const fallbackOptions = { ...options, logoDataUrl: undefined };
    const fallbackStylingOptions = createQrCodeStylingOptions(content, fallbackOptions, 0);
    const fallbackQrCode = new QRCodeStyling({
      ...fallbackStylingOptions,
      dotsOptions: { ...fallbackStylingOptions.dotsOptions, type: shape },
      jsdom: JSDOM,
    });
    const moduleCount = fallbackQrCode._qr?.getModuleCount();
    if (!moduleCount) throw new Error("A biblioteca QRCodeStyling não criou a matriz do QR.");
    const margin = (720 * 4) / (moduleCount + 8);
    fallbackQrCode.update({ margin });
    const svg = await readQrCodeStylingSvg(await fallbackQrCode.getRawData("svg"));
    return addQrCodeStylingEyePatterns(svg, moduleCount, margin, fallbackOptions);
  }
}

export async function createQrCodeSvgServer(content: string, options: QrCodeSvgOptions) {
  if (!isQrCodeStylingShape(options.style)) return createQrCodeSvg(content, options);
  return createQrCodeStylingSvgServer(content, options.style, options);
}
