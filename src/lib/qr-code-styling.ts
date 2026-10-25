import QRCode from "qrcode";

export const QR_CODE_STYLES = [
  "square",
  "rounded",
  "dots",
  "vertical",
  "horizontal",
  "diamond",
  "octagon",
  "leaf",
  "star",
  "pencil",
] as const;
export type QrCodeStyle = (typeof QR_CODE_STYLES)[number];
export const QR_CODE_EYE_STYLES = ["square", "rounded", "circle", "diamond", "octagon", "leaf"] as const;
export type QrCodeEyeStyle = (typeof QR_CODE_EYE_STYLES)[number];

export const qrCodeStyleOptions: {
  id: QrCodeStyle;
  label: string;
  description: string;
}[] = [
  { id: "square", label: "Clássico", description: "Módulos quadrados" },
  { id: "rounded", label: "Arredondado", description: "Módulos com cantos suaves" },
  { id: "dots", label: "Pontos", description: "Módulos em círculos" },
  { id: "vertical", label: "Vertical", description: "Traços em pé" },
  { id: "horizontal", label: "Horizontal", description: "Traços deitados" },
  { id: "diamond", label: "Losangos", description: "Módulos em losango" },
  { id: "octagon", label: "Geométrico", description: "Módulos com cortes" },
  { id: "leaf", label: "Folha", description: "Módulos alongados" },
  { id: "star", label: "Estrela", description: "Estrelas com pontas finas" },
  { id: "pencil", label: "Lápis", description: "Traços em forma de lápis" },
];

export const qrCodeEyeStyleOptions: { id: QrCodeEyeStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "rounded", label: "Arredondado" },
  { id: "circle", label: "Circular" },
  { id: "diamond", label: "Losango" },
  { id: "octagon", label: "Geométrico" },
  { id: "leaf", label: "Folha" },
];

const quietZone = 4;

export function isQrCodeStyle(value: unknown): value is QrCodeStyle {
  return typeof value === "string" && QR_CODE_STYLES.includes(value as QrCodeStyle);
}

export function isQrCodeEyeStyle(value: unknown): value is QrCodeEyeStyle {
  return typeof value === "string" && QR_CODE_EYE_STYLES.includes(value as QrCodeEyeStyle);
}

function isFinderPatternModule(row: number, column: number, size: number): boolean {
  return (
    (row < 7 && column < 7)
    || (row < 7 && column >= size - 7)
    || (row >= size - 7 && column < 7)
  );
}

function drawEyeShape(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: QrCodeEyeStyle,
  color: string,
) {
  context.fillStyle = color;
  if (style === "circle") {
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.fill();
  } else if (style === "rounded") {
    context.beginPath();
    context.roundRect(x, y, size, size, size * 0.2);
    context.fill();
  } else if (style === "diamond" || style === "octagon" || style === "leaf") {
    context.beginPath();
    if (style === "diamond") {
      context.moveTo(x + size / 2, y);
      context.lineTo(x + size, y + size / 2);
      context.lineTo(x + size / 2, y + size);
      context.lineTo(x, y + size / 2);
    } else if (style === "octagon") {
      context.moveTo(x + size * 0.28, y);
      context.lineTo(x + size * 0.72, y);
      context.lineTo(x + size, y + size * 0.28);
      context.lineTo(x + size, y + size * 0.72);
      context.lineTo(x + size * 0.72, y + size);
      context.lineTo(x + size * 0.28, y + size);
      context.lineTo(x, y + size * 0.72);
      context.lineTo(x, y + size * 0.28);
    } else {
      context.moveTo(x + size / 2, y);
      context.quadraticCurveTo(x + size, y + size * 0.28, x + size, y + size / 2);
      context.quadraticCurveTo(x + size * 0.72, y + size, x + size / 2, y + size);
      context.quadraticCurveTo(x, y + size * 0.72, x, y + size / 2);
      context.quadraticCurveTo(x + size * 0.28, y, x + size / 2, y);
    }
    context.closePath();
    context.fill();
  } else {
    context.fillRect(x, y, size, size);
  }
}

function drawFinderPatterns(
  context: CanvasRenderingContext2D,
  matrixSize: number,
  moduleSize: number,
  offsetX: number,
  offsetY: number,
  foregroundColor: string,
  backgroundColor: string,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
) {
  const lastOrigin = matrixSize - 7;
  const origins: [number, number][] = [[0, 0], [0, lastOrigin], [lastOrigin, 0]];
  origins.forEach(([row, column]) => {
    const x = offsetX + (column + quietZone) * moduleSize;
    const y = offsetY + (row + quietZone) * moduleSize;
    drawEyeShape(context, x, y, moduleSize * 7, frameStyle, foregroundColor);
    drawEyeShape(context, x + moduleSize, y + moduleSize, moduleSize * 5, frameStyle, backgroundColor);
    drawEyeShape(context, x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, ballStyle, foregroundColor);
  });
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
    eyeFrameStyle?: QrCodeEyeStyle;
    eyeBallStyle?: QrCodeEyeStyle;
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
  const eyeFrameStyle = options.eyeFrameStyle || "square";
  const eyeBallStyle = options.eyeBallStyle || "square";

  for (let row = 0; row < qrCode.modules.size; row++) {
    for (let column = 0; column < qrCode.modules.size; column++) {
      if (
        eyeFrameStyle !== "square" || eyeBallStyle !== "square"
      ) {
        if (isFinderPatternModule(row, column, qrCode.modules.size)) continue;
      }
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
      } else if (options.style === "dots") {
        context.beginPath();
        context.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.46, 0, Math.PI * 2);
        context.fill();
      } else if (options.style === "vertical") {
        context.beginPath();
        context.roundRect(x + moduleSize * 0.14, y + moduleSize * 0.04, moduleSize * 0.72, moduleSize * 0.92, moduleSize * 0.36);
        context.fill();
      } else if (options.style === "horizontal") {
        context.beginPath();
        context.roundRect(x + moduleSize * 0.04, y + moduleSize * 0.14, moduleSize * 0.92, moduleSize * 0.72, moduleSize * 0.36);
        context.fill();
      } else if (options.style === "diamond") {
        context.beginPath();
        context.moveTo(x + moduleSize / 2, y + moduleSize * 0.06);
        context.lineTo(x + moduleSize * 0.94, y + moduleSize / 2);
        context.lineTo(x + moduleSize / 2, y + moduleSize * 0.94);
        context.lineTo(x + moduleSize * 0.06, y + moduleSize / 2);
        context.closePath();
        context.fill();
      } else if (options.style === "octagon") {
        context.beginPath();
        context.moveTo(x + moduleSize * 0.28, y + moduleSize * 0.04);
        context.lineTo(x + moduleSize * 0.72, y + moduleSize * 0.04);
        context.lineTo(x + moduleSize * 0.96, y + moduleSize * 0.28);
        context.lineTo(x + moduleSize * 0.96, y + moduleSize * 0.72);
        context.lineTo(x + moduleSize * 0.72, y + moduleSize * 0.96);
        context.lineTo(x + moduleSize * 0.28, y + moduleSize * 0.96);
        context.lineTo(x + moduleSize * 0.04, y + moduleSize * 0.72);
        context.lineTo(x + moduleSize * 0.04, y + moduleSize * 0.28);
        context.closePath();
        context.fill();
      } else if (options.style === "leaf") {
        context.save();
        context.translate(x + moduleSize / 2, y + moduleSize / 2);
        context.rotate(Math.PI / 4);
        context.beginPath();
        context.roundRect(-moduleSize * 0.36, -moduleSize * 0.45, moduleSize * 0.72, moduleSize * 0.9, moduleSize * 0.36);
        context.fill();
        context.restore();
      } else if (options.style === "star") {
        context.beginPath();
        context.moveTo(x + moduleSize / 2, y + moduleSize * 0.05);
        context.lineTo(x + moduleSize * 0.62, y + moduleSize * 0.38);
        context.lineTo(x + moduleSize * 0.95, y + moduleSize / 2);
        context.lineTo(x + moduleSize * 0.62, y + moduleSize * 0.62);
        context.lineTo(x + moduleSize / 2, y + moduleSize * 0.95);
        context.lineTo(x + moduleSize * 0.38, y + moduleSize * 0.62);
        context.lineTo(x + moduleSize * 0.05, y + moduleSize / 2);
        context.lineTo(x + moduleSize * 0.38, y + moduleSize * 0.38);
        context.closePath();
        context.fill();
      } else {
        context.beginPath();
        context.moveTo(x + moduleSize * 0.08, y + moduleSize * 0.72);
        context.lineTo(x + moduleSize * 0.68, y + moduleSize * 0.1);
        context.lineTo(x + moduleSize * 0.9, y + moduleSize * 0.3);
        context.lineTo(x + moduleSize * 0.28, y + moduleSize * 0.92);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(x + moduleSize * 0.08, y + moduleSize * 0.72);
        context.lineTo(x + moduleSize * 0.28, y + moduleSize * 0.92);
        context.lineTo(x + moduleSize * 0.08, y + moduleSize * 0.92);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(x + moduleSize * 0.68, y + moduleSize * 0.1);
        context.lineTo(x + moduleSize * 0.78, y + moduleSize * 0.02);
        context.lineTo(x + moduleSize * 0.98, y + moduleSize * 0.22);
        context.lineTo(x + moduleSize * 0.9, y + moduleSize * 0.3);
        context.closePath();
        context.fill();
      }
    }
  }

  if (eyeFrameStyle !== "square" || eyeBallStyle !== "square") {
    drawFinderPatterns(
      context,
      qrCode.modules.size,
      moduleSize,
      offsetX,
      offsetY,
      options.foregroundColor,
      options.backgroundColor,
      eyeFrameStyle,
      eyeBallStyle,
    );
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

function renderSvgEyeShape(x: number, y: number, size: number, style: QrCodeEyeStyle, color: string) {
  if (style === "circle") {
    return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${color}"/>`;
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
  const radius = style === "rounded" ? size * 0.2 : 0;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${color}"/>`;
}

export function createQrCodeSvg(
  content: string,
  options: {
    foregroundColor: string;
    backgroundColor: string;
    style: QrCodeStyle;
    eyeFrameStyle?: QrCodeEyeStyle;
    eyeBallStyle?: QrCodeEyeStyle;
    logoDataUrl?: string;
  },
): string {
  const qrCode = createQrCode(content);
  const totalModules = qrCode.modules.size + quietZone * 2;
  const eyeFrameStyle = options.eyeFrameStyle || "square";
  const eyeBallStyle = options.eyeBallStyle || "square";
  const squarePaths: string[] = [];
  const styledModules: string[] = [];

  for (let row = 0; row < qrCode.modules.size; row++) {
    for (let column = 0; column < qrCode.modules.size; column++) {
      if (
        (eyeFrameStyle !== "square" || eyeBallStyle !== "square")
        && isFinderPatternModule(row, column, qrCode.modules.size)
      ) continue;
      if (!qrCode.modules.get(row, column)) continue;

      const x = column + quietZone;
      const y = row + quietZone;
      const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
      if (options.style === "square" || isFunctionModule) {
        squarePaths.push(`M${x} ${y}h1v1h-1z`);
      } else if (options.style === "rounded") {
        styledModules.push(`<rect x="${x + 0.07}" y="${y + 0.07}" width="0.86" height="0.86" rx="0.24"/>`);
      } else if (options.style === "dots") {
        styledModules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.46"/>`);
      } else if (options.style === "vertical") {
        styledModules.push(`<rect x="${x + 0.14}" y="${y + 0.04}" width="0.72" height="0.92" rx="0.36"/>`);
      } else if (options.style === "horizontal") {
        styledModules.push(`<rect x="${x + 0.04}" y="${y + 0.14}" width="0.92" height="0.72" rx="0.36"/>`);
      } else if (options.style === "diamond") {
        styledModules.push(`<path d="M${x + 0.5} ${y + 0.06}L${x + 0.94} ${y + 0.5}L${x + 0.5} ${y + 0.94}L${x + 0.06} ${y + 0.5}Z"/>`);
      } else if (options.style === "octagon") {
        styledModules.push(`<path d="M${x + 0.28} ${y + 0.04}H${x + 0.72}L${x + 0.96} ${y + 0.28}V${y + 0.72}L${x + 0.72} ${y + 0.96}H${x + 0.28}L${x + 0.04} ${y + 0.72}V${y + 0.28}Z"/>`);
      } else if (options.style === "leaf") {
        styledModules.push(`<rect x="${x + 0.14}" y="${y + 0.05}" width="0.72" height="0.9" rx="0.36" transform="rotate(45 ${x + 0.5} ${y + 0.5})"/>`);
      } else if (options.style === "star") {
        styledModules.push(`<path d="M${x + 0.5} ${y + 0.05}L${x + 0.62} ${y + 0.38}L${x + 0.95} ${y + 0.5}L${x + 0.62} ${y + 0.62}L${x + 0.5} ${y + 0.95}L${x + 0.38} ${y + 0.62}L${x + 0.05} ${y + 0.5}L${x + 0.38} ${y + 0.38}Z"/>`);
      } else {
        styledModules.push(`<path d="M${x + 0.08} ${y + 0.72}L${x + 0.68} ${y + 0.1}L${x + 0.9} ${y + 0.3}L${x + 0.28} ${y + 0.92}Z M${x + 0.08} ${y + 0.72}L${x + 0.28} ${y + 0.92}L${x + 0.08} ${y + 0.92}Z M${x + 0.68} ${y + 0.1}L${x + 0.78} ${y + 0.02}L${x + 0.98} ${y + 0.22}L${x + 0.9} ${y + 0.3}Z"/>`);
      }
    }
  }

  const background = escapeXml(options.backgroundColor);
  const foreground = escapeXml(options.foregroundColor);
  const eyePatterns = eyeFrameStyle === "square" && eyeBallStyle === "square"
    ? ""
    : [[0, 0], [0, qrCode.modules.size - 7], [qrCode.modules.size - 7, 0]]
      .map(([row, column]) => {
        const x = column + quietZone;
        const y = row + quietZone;
        return [
          renderSvgEyeShape(x, y, 7, eyeFrameStyle, foreground),
          renderSvgEyeShape(x + 1, y + 1, 5, eyeFrameStyle, background),
          renderSvgEyeShape(x + 2, y + 2, 3, eyeBallStyle, foreground),
        ].join("");
      })
      .join("");
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 ${totalModules} ${totalModules}"><rect width="100%" height="100%" fill="${background}"/>${squarePath}${styledPath}${eyePatterns}${logo}</svg>`;
}
