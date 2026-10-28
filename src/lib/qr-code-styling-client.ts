import QRCodeStyling from "qr-code-styling";
import {
  addQrCodeStylingEyePatterns,
  createQrCodeStylingOptions,
  readQrCodeStylingSvg,
  type QrCodeStylingRenderOptions,
  type QrCodeStylingShape,
} from "@/lib/qr-code-styling-adapter";

export async function createQrCodeStylingSvg(
  content: string,
  shape: QrCodeStylingShape,
  options: QrCodeStylingRenderOptions,
) {
  const stylingOptions = createQrCodeStylingOptions(content, options, 0);
  const initialCode = new QRCodeStyling({
    ...stylingOptions,
    dotsOptions: { ...stylingOptions.dotsOptions, type: shape },
  });
  const moduleCount = initialCode._qr?.getModuleCount();
  if (!moduleCount) throw new Error("A biblioteca QRCodeStyling não criou a matriz do QR.");
  const margin = (720 * 4) / (moduleCount + 8);
  initialCode.update({ margin });
  const svg = await readQrCodeStylingSvg(await initialCode.getRawData("svg"));
  return addQrCodeStylingEyePatterns(svg, moduleCount, margin, options);
}

export async function drawQrCodeStylingSvgOnCanvas(
  canvas: HTMLCanvasElement,
  svg: string,
) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu preparar a imagem do QR Code.");
  const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível rasterizar o SVG do QR Code."));
      image.src = objectUrl;
    });
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
