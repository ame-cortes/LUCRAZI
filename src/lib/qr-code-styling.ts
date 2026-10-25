import QRCode from "qrcode";

export const QR_CODE_STYLES = ["square", "rounded", "dots"] as const;
export type QrCodeStyle = (typeof QR_CODE_STYLES)[number];

export const qrCodeStyleOptions: {
  id: QrCodeStyle;
  label: string;
  description: string;
}[] = [
  { id: "square", label: "Clássico", description: "Módulos quadrados" },
  { id: "rounded", label: "Arredondado", description: "Módulos com cantos suaves" },
  { id: "dots", label: "Pontos", description: "Módulos em círculos" },
];

const quietZone = 4;

export function isQrCodeStyle(value: unknown): value is QrCodeStyle {
  return typeof value === "string" && QR_CODE_STYLES.includes(value as QrCodeStyle);
}

function createQrCode(content: string) {
  return QRCode.create(content, { errorCorrectionLevel: "H" });
}

function drawLogo(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logoDataUrl: string,
  backgroundColor: string,
) {
  if (!logoDataUrl) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const logoSize = canvas.width * 0.2;
      const backingSize = logoSize * 1.25;
      const center = canvas.width / 2;
      context.fillStyle = backgroundColor;
      context.beginPath();
      context.roundRect(
        center - backingSize / 2,
        center - backingSize / 2,
        backingSize,
        backingSize,
        backingSize * 0.12,
      );
      context.fill();
      context.drawImage(image, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
      resolve();
    };
    image.onerror = () => reject(new Error("Não foi possível carregar o logo do QR Code."));
    image.src = logoDataUrl;
  });
}

export async function renderQrCodeCanvas(
  canvas: HTMLCanvasElement,
  content: string,
  options: {
    foregroundColor: string;
    backgroundColor: string;
    style: QrCodeStyle;
    logoDataUrl?: string;
  },
): Promise<void> {
  const qrCode = createQrCode(content);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu preparar a imagem do QR Code.");

  const totalModules = qrCode.modules.size + quietZone * 2;
  const moduleSize = Math.floor(Math.min(canvas.width, canvas.height) / totalModules);
  if (moduleSize < 1) throw new Error("A imagem é pequena demais para este conteúdo.");
  const offsetX = Math.floor((canvas.width - totalModules * moduleSize) / 2);
  const offsetY = Math.floor((canvas.height - totalModules * moduleSize) / 2);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.foregroundColor;

  for (let row = 0; row < qrCode.modules.size; row++) {
    for (let column = 0; column < qrCode.modules.size; column++) {
      if (!qrCode.modules.get(row, column)) continue;

      const x = offsetX + (column + quietZone) * moduleSize;
      const y = offsetY + (row + quietZone) * moduleSize;
      const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
      if (options.style === "square" || isFunctionModule) {
        context.fillRect(x, y, moduleSize, moduleSize);
      } else if (options.style === "rounded") {
        const inset = moduleSize * 0.07;
        const cellSize = moduleSize - inset * 2;
        context.beginPath();
        context.roundRect(x + inset, y + inset, cellSize, cellSize, moduleSize * 0.24);
        context.fill();
      } else {
        context.beginPath();
        context.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.4, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  await drawLogo(context, canvas, options.logoDataUrl || "", options.backgroundColor);
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;",
  })[character] || character);
}

export function createQrCodeSvg(
  content: string,
  options: {
    foregroundColor: string;
    backgroundColor: string;
    style: QrCodeStyle;
    logoDataUrl?: string;
  },
): string {
  const qrCode = createQrCode(content);
  const totalModules = qrCode.modules.size + quietZone * 2;
  const squarePaths: string[] = [];
  const styledModules: string[] = [];

  for (let row = 0; row < qrCode.modules.size; row++) {
    for (let column = 0; column < qrCode.modules.size; column++) {
      if (!qrCode.modules.get(row, column)) continue;

      const x = column + quietZone;
      const y = row + quietZone;
      const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
      if (options.style === "square" || isFunctionModule) {
        squarePaths.push(`M${x} ${y}h1v1h-1z`);
      } else if (options.style === "rounded") {
        styledModules.push(`<rect x="${x + 0.07}" y="${y + 0.07}" width="0.86" height="0.86" rx="0.24"/>`);
      } else {
        styledModules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.4"/>`);
      }
    }
  }

  const background = escapeXml(options.backgroundColor);
  const foreground = escapeXml(options.foregroundColor);
  let logo = "";
  if (options.logoDataUrl) {
    const logoSize = totalModules * 0.2;
    const backingSize = logoSize * 1.25;
    const backingOffset = (totalModules - backingSize) / 2;
    const logoOffset = (totalModules - logoSize) / 2;
    logo = `<rect x="${backingOffset}" y="${backingOffset}" width="${backingSize}" height="${backingSize}" rx="${backingSize * 0.12}" fill="${background}"/><image href="${escapeXml(options.logoDataUrl)}" x="${logoOffset}" y="${logoOffset}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const squarePath = squarePaths.length
    ? `<path fill="${foreground}" d="${squarePaths.join("")}"/>`
    : "";
  const styledPath = styledModules.length
    ? `<g fill="${foreground}">${styledModules.join("")}</g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 ${totalModules} ${totalModules}"><rect width="100%" height="100%" fill="${background}"/>${squarePath}${styledPath}${logo}</svg>`;
}
