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
  "heart",
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
  { id: "rounded", label: "Arredondado", description: "Módulos encorpados com cantos suaves" },
  { id: "dots", label: "Pontos", description: "Pontos maiores e mais visíveis" },
  { id: "vertical", label: "Vertical", description: "Traços verticais mais largos" },
  { id: "horizontal", label: "Horizontal", description: "Traços horizontais mais largos" },
  { id: "diamond", label: "Losangos", description: "Losangos preenchidos" },
  { id: "octagon", label: "Geométrico", description: "Módulos geométricos encorpados" },
  { id: "leaf", label: "Folha", description: "Folhas mais cheias" },
  { id: "star", label: "Estrela", description: "Estrelas com braços mais largos" },
  { id: "pencil", label: "Lápis", description: "Lápis horizontais unidos" },
  { id: "heart", label: "Coração", description: "Módulos em formato de coração" },
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

function isExcludedFinderModule(
  row: number,
  column: number,
  size: number,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
): boolean {
  return (frameStyle !== "square" || ballStyle !== "square")
    && isFinderPatternModule(row, column, size);
}

function pencilGeometry(width: number, height: number) {
  return {
    tip: Math.min(height * 0.28, width * 0.2),
    cap: Math.min(height * 0.12, width * 0.12),
    inset: height * 0.025,
  };
}

function pencilSvgPath(x: number, y: number, width: number, height: number) {
  const { tip, cap, inset } = pencilGeometry(width, height);
  const centerY = y + height / 2;
  return `M${x} ${centerY}L${x + tip} ${y + inset}H${x + width - cap}Q${x + width} ${y + inset} ${x + width} ${centerY}Q${x + width} ${y + height - inset} ${x + width - cap} ${y + height - inset}H${x + tip}Z`;
}

function drawPencilRun(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const { tip, cap, inset } = pencilGeometry(width, height);
  const centerY = y + height / 2;
  context.beginPath();
  context.moveTo(x, centerY);
  context.lineTo(x + tip, y + inset);
  context.lineTo(x + width - cap, y + inset);
  context.quadraticCurveTo(x + width, y + inset, x + width, centerY);
  context.quadraticCurveTo(x + width, y + height - inset, x + width - cap, y + height - inset);
  context.lineTo(x + tip, y + height - inset);
  context.closePath();
  context.fill();
}

function drawPencilModules(
  context: CanvasRenderingContext2D,
  qrCode: ReturnType<typeof createQrCode>,
  moduleSize: number,
  offsetX: number,
  offsetY: number,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
) {
  for (let row = 0; row < qrCode.modules.size; row++) {
    let column = 0;
    while (column < qrCode.modules.size) {
      if (isExcludedFinderModule(row, column, qrCode.modules.size, frameStyle, ballStyle)) {
        column++;
        continue;
      }
      if (!qrCode.modules.get(row, column)) {
        column++;
        continue;
      }
      if (qrCode.modules.isReserved(row, column) === 1) {
        const x = offsetX + (column + quietZone) * moduleSize;
        const y = offsetY + (row + quietZone) * moduleSize;
        context.fillRect(x, y, moduleSize, moduleSize);
        column++;
        continue;
      }

      const start = column;
      column++;
      while (
        column < qrCode.modules.size
        && !isExcludedFinderModule(row, column, qrCode.modules.size, frameStyle, ballStyle)
        && qrCode.modules.get(row, column)
        && qrCode.modules.isReserved(row, column) !== 1
      ) column++;

      drawPencilRun(
        context,
        offsetX + (start + quietZone) * moduleSize,
        offsetY + (row + quietZone) * moduleSize,
        (column - start) * moduleSize,
        moduleSize,
      );
    }
  }
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

  if (options.style === "pencil") {
    drawPencilModules(context, qrCode, moduleSize, offsetX, offsetY, eyeFrameStyle, eyeBallStyle);
  } else {
    for (let row = 0; row < qrCode.modules.size; row++) {
      for (let column = 0; column < qrCode.modules.size; column++) {
        if (isExcludedFinderModule(row, column, qrCode.modules.size, eyeFrameStyle, eyeBallStyle)) continue;
        if (!qrCode.modules.get(row, column)) continue;

        const x = offsetX + (column + quietZone) * moduleSize;
        const y = offsetY + (row + quietZone) * moduleSize;
        const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
        if (options.style === "square" || isFunctionModule) {
          context.fillRect(x, y, moduleSize, moduleSize);
        } else if (options.style === "rounded") {
          const inset = moduleSize * 0.01;
          const cellSize = moduleSize - inset * 2;
          context.beginPath();
          context.roundRect(x + inset, y + inset, cellSize, cellSize, moduleSize * 0.22);
          context.fill();
        } else if (options.style === "dots") {
          context.beginPath();
          context.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.5, 0, Math.PI * 2);
          context.fill();
        } else if (options.style === "vertical") {
          context.beginPath();
          context.roundRect(x + moduleSize * 0.02, y + moduleSize * 0.01, moduleSize * 0.96, moduleSize * 0.98, moduleSize * 0.48);
          context.fill();
        } else if (options.style === "horizontal") {
          context.beginPath();
          context.roundRect(x + moduleSize * 0.01, y + moduleSize * 0.02, moduleSize * 0.98, moduleSize * 0.96, moduleSize * 0.48);
          context.fill();
        } else if (options.style === "diamond") {
          context.beginPath();
          context.moveTo(x + moduleSize / 2, y + moduleSize * 0.02);
          context.lineTo(x + moduleSize * 0.98, y + moduleSize / 2);
          context.lineTo(x + moduleSize / 2, y + moduleSize * 0.98);
          context.lineTo(x + moduleSize * 0.02, y + moduleSize / 2);
          context.closePath();
          context.fill();
        } else if (options.style === "octagon") {
          context.beginPath();
          context.moveTo(x + moduleSize * 0.16, y + moduleSize * 0.01);
          context.lineTo(x + moduleSize * 0.84, y + moduleSize * 0.01);
          context.lineTo(x + moduleSize * 0.99, y + moduleSize * 0.16);
          context.lineTo(x + moduleSize * 0.99, y + moduleSize * 0.84);
          context.lineTo(x + moduleSize * 0.84, y + moduleSize * 0.99);
          context.lineTo(x + moduleSize * 0.16, y + moduleSize * 0.99);
          context.lineTo(x + moduleSize * 0.01, y + moduleSize * 0.84);
          context.lineTo(x + moduleSize * 0.01, y + moduleSize * 0.16);
          context.closePath();
          context.fill();
        } else if (options.style === "leaf") {
          context.beginPath();
          context.moveTo(x + moduleSize / 2, y + moduleSize * 0.02);
          context.quadraticCurveTo(x + moduleSize, y + moduleSize * 0.26, x + moduleSize * 0.98, y + moduleSize * 0.66);
          context.quadraticCurveTo(x + moduleSize * 0.94, y + moduleSize, x + moduleSize / 2, y + moduleSize);
          context.quadraticCurveTo(x + moduleSize * 0.06, y + moduleSize, x + moduleSize * 0.02, y + moduleSize * 0.66);
          context.quadraticCurveTo(x, y + moduleSize * 0.26, x + moduleSize / 2, y + moduleSize * 0.02);
          context.closePath();
          context.fill();
        } else if (options.style === "star") {
          context.beginPath();
          context.moveTo(x + moduleSize / 2, y + moduleSize * 0.03);
          context.lineTo(x + moduleSize * 0.74, y + moduleSize * 0.26);
          context.lineTo(x + moduleSize * 0.97, y + moduleSize / 2);
          context.lineTo(x + moduleSize * 0.74, y + moduleSize * 0.74);
          context.lineTo(x + moduleSize / 2, y + moduleSize * 0.97);
          context.lineTo(x + moduleSize * 0.26, y + moduleSize * 0.74);
          context.lineTo(x + moduleSize * 0.03, y + moduleSize / 2);
          context.lineTo(x + moduleSize * 0.26, y + moduleSize * 0.26);
          context.closePath();
          context.fill();
        } else if (options.style === "heart") {
          context.beginPath();
          context.moveTo(x + moduleSize / 2, y + moduleSize * 0.96);
          context.bezierCurveTo(x + moduleSize * 0.4, y + moduleSize * 0.84, x + moduleSize * 0.02, y + moduleSize * 0.6, x + moduleSize * 0.02, y + moduleSize * 0.32);
          context.bezierCurveTo(x + moduleSize * 0.02, y + moduleSize * 0.02, x + moduleSize * 0.38, y - moduleSize * 0.04, x + moduleSize / 2, y + moduleSize * 0.25);
          context.bezierCurveTo(x + moduleSize * 0.62, y - moduleSize * 0.04, x + moduleSize * 0.98, y + moduleSize * 0.02, x + moduleSize * 0.98, y + moduleSize * 0.32);
          context.bezierCurveTo(x + moduleSize * 0.98, y + moduleSize * 0.6, x + moduleSize * 0.6, y + moduleSize * 0.84, x + moduleSize / 2, y + moduleSize * 0.96);
          context.closePath();
          context.fill();
        }
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

  if (options.style === "pencil") {
    for (let row = 0; row < qrCode.modules.size; row++) {
      let column = 0;
      while (column < qrCode.modules.size) {
        if (isExcludedFinderModule(row, column, qrCode.modules.size, eyeFrameStyle, eyeBallStyle)) {
          column++;
          continue;
        }
        if (!qrCode.modules.get(row, column)) {
          column++;
          continue;
        }
        if (qrCode.modules.isReserved(row, column) === 1) {
          const x = column + quietZone;
          const y = row + quietZone;
          squarePaths.push(`M${x} ${y}h1v1h-1z`);
          column++;
          continue;
        }

        const start = column;
        column++;
        while (
          column < qrCode.modules.size
          && !isExcludedFinderModule(row, column, qrCode.modules.size, eyeFrameStyle, eyeBallStyle)
          && qrCode.modules.get(row, column)
          && qrCode.modules.isReserved(row, column) !== 1
        ) column++;
        styledModules.push(
          `<path d="${pencilSvgPath(start + quietZone, row + quietZone, column - start, 1)}"/>`,
        );
      }
    }
  } else {
    for (let row = 0; row < qrCode.modules.size; row++) {
      for (let column = 0; column < qrCode.modules.size; column++) {
        if (isExcludedFinderModule(row, column, qrCode.modules.size, eyeFrameStyle, eyeBallStyle)) continue;
        if (!qrCode.modules.get(row, column)) continue;

        const x = column + quietZone;
        const y = row + quietZone;
        const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
        if (options.style === "square" || isFunctionModule) {
          squarePaths.push(`M${x} ${y}h1v1h-1z`);
        } else if (options.style === "rounded") {
          styledModules.push(`<rect x="${x + 0.01}" y="${y + 0.01}" width="0.98" height="0.98" rx="0.22"/>`);
        } else if (options.style === "dots") {
          styledModules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`);
        } else if (options.style === "vertical") {
          styledModules.push(`<rect x="${x + 0.02}" y="${y + 0.01}" width="0.96" height="0.98" rx="0.48"/>`);
        } else if (options.style === "horizontal") {
          styledModules.push(`<rect x="${x + 0.01}" y="${y + 0.02}" width="0.98" height="0.96" rx="0.48"/>`);
        } else if (options.style === "diamond") {
          styledModules.push(`<path d="M${x + 0.5} ${y + 0.005}L${x + 0.995} ${y + 0.5}L${x + 0.5} ${y + 0.995}L${x + 0.005} ${y + 0.5}Z"/>`);
        } else if (options.style === "octagon") {
          styledModules.push(`<path d="M${x + 0.16} ${y + 0.005}H${x + 0.84}L${x + 0.995} ${y + 0.16}V${y + 0.84}L${x + 0.84} ${y + 0.995}H${x + 0.16}L${x + 0.005} ${y + 0.84}V${y + 0.16}Z"/>`);
        } else if (options.style === "leaf") {
          styledModules.push(`<path d="M${x + 0.5} ${y + 0.005}Q${x + 1} ${y + 0.26} ${x + 0.98} ${y + 0.66}Q${x + 0.94} ${y + 1} ${x + 0.5} ${y + 1}Q${x + 0.06} ${y + 1} ${x + 0.02} ${y + 0.66}Q${x} ${y + 0.26} ${x + 0.5} ${y + 0.005}Z"/>`);
        } else if (options.style === "star") {
          styledModules.push(`<path d="M${x + 0.5} ${y + 0.03}L${x + 0.74} ${y + 0.26}L${x + 0.97} ${y + 0.5}L${x + 0.74} ${y + 0.74}L${x + 0.5} ${y + 0.97}L${x + 0.26} ${y + 0.74}L${x + 0.03} ${y + 0.5}L${x + 0.26} ${y + 0.26}Z"/>`);
        } else if (options.style === "heart") {
          styledModules.push(`<path d="M${x + 0.5} ${y + 0.96}C${x + 0.4} ${y + 0.84} ${x + 0.02} ${y + 0.6} ${x + 0.02} ${y + 0.32}C${x + 0.02} ${y + 0.02} ${x + 0.38} ${y - 0.04} ${x + 0.5} ${y + 0.25}C${x + 0.62} ${y - 0.04} ${x + 0.98} ${y + 0.02} ${x + 0.98} ${y + 0.32}C${x + 0.98} ${y + 0.6} ${x + 0.6} ${y + 0.84} ${x + 0.5} ${y + 0.96}Z"/>`);
        }
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
