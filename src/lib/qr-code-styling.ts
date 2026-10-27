import QRCode from "qrcode";
import { isQrCodeStylingShape } from "@/lib/qr-code-styling-adapter";

export const QR_CODE_STYLES = [
  "square",
  "dots",
  "star",
  "mosaic",
  "heart",
  "relief",
  "classy",
  "classy-rounded",
  "extra-rounded",
] as const;
export type QrCodeStyle = (typeof QR_CODE_STYLES)[number];
export const QR_CODE_EYE_STYLES = ["square", "rounded", "circle", "diamond", "octagon", "leaf", "heart"] as const;
export type QrCodeEyeStyle = (typeof QR_CODE_EYE_STYLES)[number];

export const qrCodeStyleOptions: {
  id: QrCodeStyle;
  label: string;
  description: string;
}[] = [
  { id: "square", label: "Clássico", description: "Módulos quadrados" },
  { id: "dots", label: "Pontos", description: "Manchas orgânicas conectadas" },
  { id: "star", label: "Estrela", description: "Estrelas conectadas por braços" },
  { id: "mosaic", label: "Mosaico", description: "Blocos conectados em formas geométricas" },
  { id: "relief", label: "Relevo", description: "Módulos recortados unidos em relevos" },
  { id: "classy", label: "Elegante", description: "Módulos clássicos estilizados pela QRCodeStyling" },
  { id: "classy-rounded", label: "Elegante Arredondado", description: "Módulos clássicos arredondados pela QRCodeStyling" },
  { id: "extra-rounded", label: "Elegante Extra", description: "Módulos clássicos extra arredondados pela QRCodeStyling" },
];

const groupedStyleConnectorWidths: Record<QrCodeStyle, number> = {
  square: 0,
  dots: 0.78,
  star: 0.38,
  mosaic: 0.16,
  heart: 0.85,
  relief: 0.52,
  classy: 0,
  "classy-rounded": 0,
  "extra-rounded": 0,
};

const groupedStyleConnectorCaps: Record<QrCodeStyle, CanvasLineCap> = {
  square: "round",
  dots: "round",
  star: "square",
  mosaic: "square",
  heart: "round",
  relief: "square",
  classy: "square",
  "classy-rounded": "square",
  "extra-rounded": "square",
};

export const qrCodeEyeStyleOptions: { id: QrCodeEyeStyle; label: string }[] = [
  { id: "square", label: "Quadrado" },
  { id: "rounded", label: "Arredondado" },
  { id: "circle", label: "Circular" },
  { id: "diamond", label: "Losango" },
  { id: "octagon", label: "Geométrico" },
  { id: "leaf", label: "Folha" },
  { id: "heart", label: "Coração" },
];

const quietZone = 4;
export const qrCodeContentTooLongMessage = "O conteúdo é longo demais para caber em um QR Code. Reduza o texto ou use um link mais curto.";

export function isQrCodeContentTooLongError(error: unknown): boolean {
  return error instanceof Error && error.message === qrCodeContentTooLongMessage;
}

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
  // SEMPRE excluir marcadores de posição, independentemente do estilo dos olhos
  // Os olhos são renderizados separadamente, os módulos de dados nunca devem tocar nos marcadores
  return isFinderPatternModule(row, column, size);
}

function visitGroupedStyleConnectors(
  qrCode: ReturnType<typeof createQrCode>,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
  visit: (startColumn: number, startRow: number, endColumn: number, endRow: number) => void,
) {
  const size = qrCode.modules.size;
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (
        !qrCode.modules.get(row, column)
        || qrCode.modules.isReserved(row, column) === 1
        || isExcludedFinderModule(row, column, size, frameStyle, ballStyle)
      ) continue;

      const centerColumn = column + quietZone + 0.5;
      const centerRow = row + quietZone + 0.5;
      const hasRightNeighbor = column + 1 < size
        && qrCode.modules.get(row, column + 1)
        && qrCode.modules.isReserved(row, column + 1) !== 1
        && !isExcludedFinderModule(row, column + 1, size, frameStyle, ballStyle);
      const hasBottomNeighbor = row + 1 < size
        && qrCode.modules.get(row + 1, column)
        && qrCode.modules.isReserved(row + 1, column) !== 1
        && !isExcludedFinderModule(row + 1, column, size, frameStyle, ballStyle);

      if (hasRightNeighbor) visit(centerColumn, centerRow, centerColumn + 1, centerRow);
      if (hasBottomNeighbor) visit(centerColumn, centerRow, centerColumn, centerRow + 1);
    }
  }
}

function drawReliefModule(context: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const inset = size * 0.13;
  const notch = size * 0.12;
  context.beginPath();
  context.moveTo(x + inset, y);
  context.lineTo(x + size / 2 - notch, y);
  context.quadraticCurveTo(x + size / 2, y + size * 0.12, x + size / 2 + notch, y);
  context.lineTo(x + size - inset, y);
  context.quadraticCurveTo(x + size, y, x + size, y + inset);
  context.lineTo(x + size, y + size / 2 - notch);
  context.quadraticCurveTo(x + size - size * 0.12, y + size / 2, x + size, y + size / 2 + notch);
  context.lineTo(x + size, y + size - inset);
  context.quadraticCurveTo(x + size, y + size, x + size - inset, y + size);
  context.lineTo(x + size / 2 + notch, y + size);
  context.quadraticCurveTo(x + size / 2, y + size - size * 0.12, x + size / 2 - notch, y + size);
  context.lineTo(x + inset, y + size);
  context.quadraticCurveTo(x, y + size, x, y + size - inset);
  context.lineTo(x, y + size / 2 + notch);
  context.quadraticCurveTo(x + size * 0.12, y + size / 2, x, y + size / 2 - notch);
  context.lineTo(x, y + inset);
  context.quadraticCurveTo(x, y, x + inset, y);
  context.closePath();
  context.fill();
}

function reliefSvgPath(x: number, y: number, size: number) {
  const inset = size * 0.13;
  const notch = size * 0.12;
  return `M${x + inset} ${y}H${x + size / 2 - notch}Q${x + size / 2} ${y + size * 0.12} ${x + size / 2 + notch} ${y}H${x + size - inset}Q${x + size} ${y} ${x + size} ${y + inset}V${y + size / 2 - notch}Q${x + size - size * 0.12} ${y + size / 2} ${x + size} ${y + size / 2 + notch}V${y + size - inset}Q${x + size} ${y + size} ${x + size - inset} ${y + size}H${x + size / 2 + notch}Q${x + size / 2} ${y + size - size * 0.12} ${x + size / 2 - notch} ${y + size}H${x + inset}Q${x} ${y + size} ${x} ${y + size - inset}V${y + size / 2 + notch}Q${x + size * 0.12} ${y + size / 2} ${x} ${y + size / 2 - notch}V${y + inset}Q${x} ${y} ${x + inset} ${y}Z`;
}

function drawMosaicModules(
  context: CanvasRenderingContext2D,
  qrCode: ReturnType<typeof createQrCode>,
  moduleSize: number,
  offsetX: number,
  offsetY: number,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
  cornerRadius = 0.08,
) {
  const size = qrCode.modules.size;
  const activeRuns = new Map<string, { startRow: number; endRow: number; startColumn: number; endColumn: number }>();

  function paintRun(run: { startRow: number; endRow: number; startColumn: number; endColumn: number }) {
    const x = offsetX + (run.startColumn + quietZone) * moduleSize;
    const y = offsetY + (run.startRow + quietZone) * moduleSize;
    const width = (run.endColumn - run.startColumn) * moduleSize;
    const height = (run.endRow - run.startRow) * moduleSize;
    const radius = Math.min(moduleSize * cornerRadius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
  }

  for (let row = 0; row < size; row++) {
    const rowRuns = new Map<string, { startRow: number; endRow: number; startColumn: number; endColumn: number }>();
    let column = 0;
    while (column < size) {
      if (
        !qrCode.modules.get(row, column)
        || isExcludedFinderModule(row, column, size, frameStyle, ballStyle)
      ) {
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
      const startColumn = column++;
      while (
        column < size
        && qrCode.modules.get(row, column)
        && !isExcludedFinderModule(row, column, size, frameStyle, ballStyle)
        && qrCode.modules.isReserved(row, column) !== 1
      ) column++;
      const key = `${startColumn}:${column}`;
      const previous = activeRuns.get(key);
      rowRuns.set(key, previous
        ? { ...previous, endRow: row + 1 }
        : { startRow: row, endRow: row + 1, startColumn, endColumn: column });
    }

    for (const [key, run] of activeRuns) {
      if (!rowRuns.has(key)) paintRun(run);
    }
    activeRuns.clear();
    for (const [key, run] of rowRuns) activeRuns.set(key, run);
  }

  for (const run of activeRuns.values()) paintRun(run);
}

function drawEyeShape(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  style: QrCodeEyeStyle,
  color: string | CanvasGradient,
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
  } else if (style === "heart") {
    context.beginPath();
    context.moveTo(x + size / 2, y + size * 0.96);
    context.bezierCurveTo(x + size * 0.35, y + size * 0.82, x + size * 0.05, y + size * 0.58, x + size * 0.05, y + size * 0.32);
    context.bezierCurveTo(x + size * 0.05, y + size * 0.08, x + size * 0.4, y - size * 0.02, x + size / 2, y + size * 0.2);
    context.bezierCurveTo(x + size * 0.6, y - size * 0.02, x + size * 0.95, y + size * 0.08, x + size * 0.95, y + size * 0.32);
    context.bezierCurveTo(x + size * 0.95, y + size * 0.58, x + size * 0.65, y + size * 0.82, x + size / 2, y + size * 0.96);
    context.closePath();
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
  frameColor: string | CanvasGradient,
  ballColor: string | CanvasGradient,
  frameStyle: QrCodeEyeStyle,
  ballStyle: QrCodeEyeStyle,
) {
  const lastOrigin = matrixSize - 7;
  const origins: [number, number][] = [[0, 0], [0, lastOrigin], [lastOrigin, 0]];
  origins.forEach(([row, column]) => {
    const x = offsetX + (column + quietZone) * moduleSize;
    const y = offsetY + (row + quietZone) * moduleSize;
    drawEyeShape(context, x, y, moduleSize * 7, frameStyle, frameColor);
    drawEyeShape(context, x + moduleSize, y + moduleSize, moduleSize * 5, "square", backgroundColor);
    drawEyeShape(context, x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, ballStyle, ballColor);
  });
}

function createQrCode(content: string) {
  try {
    return QRCode.create(content, { errorCorrectionLevel: "H" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("amount of data is too big")) {
      throw new Error(qrCodeContentTooLongMessage, { cause: error });
    }
    throw error;
  }
}

export function validateQrCodeContent(content: string): void {
  createQrCode(content);
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
      const logoSize = canvas.width * 0.14;
      const backingSize = logoSize * 1.14;
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
    gradientEndColor?: string;
    backgroundColor: string;
    style: QrCodeStyle;
    eyeFrameStyle?: QrCodeEyeStyle;
    eyeBallStyle?: QrCodeEyeStyle;
    eyeFrameColor?: string;
    eyeBallColor?: string;
    logoDataUrl?: string;
  },
): Promise<void> {
  const qrCode = createQrCode(content);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("O navegador não conseguiu preparar a imagem do QR Code.");

  const totalModules = qrCode.modules.size + quietZone * 2;
  const moduleSize = Math.min(canvas.width, canvas.height) / totalModules;
  if (moduleSize < 1) throw new Error("A imagem é pequena demais para este conteúdo.");
  const offsetX = (canvas.width - totalModules * moduleSize) / 2;
  const offsetY = (canvas.height - totalModules * moduleSize) / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = options.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  let foregroundPaint: string | CanvasGradient = options.foregroundColor;
  if (options.gradientEndColor) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, options.foregroundColor);
    gradient.addColorStop(1, options.gradientEndColor);
    foregroundPaint = gradient;
  }
  context.fillStyle = foregroundPaint;
  const eyeFrameStyle = options.eyeFrameStyle || "square";
  const eyeBallStyle = options.eyeBallStyle || "square";
  const eyeFrameColor = options.eyeFrameColor || options.foregroundColor;
  const eyeBallColor = options.eyeBallColor || options.foregroundColor;

  if (isQrCodeStylingShape(options.style)) {
    const { createQrCodeStylingSvg, drawQrCodeStylingSvgOnCanvas } = await import("@/lib/qr-code-styling-client");
    const svg = await createQrCodeStylingSvg(content, options.style, {
      foregroundColor: options.foregroundColor,
      ...(options.gradientEndColor ? { gradientEndColor: options.gradientEndColor } : {}),
      backgroundColor: options.backgroundColor,
      eyeFrameStyle,
      eyeBallStyle,
      eyeFrameColor,
      eyeBallColor,
      ...(options.logoDataUrl ? { logoDataUrl: options.logoDataUrl } : {}),
    });
    await drawQrCodeStylingSvgOnCanvas(canvas, svg);
    return;
  }

  const connectorWidth = groupedStyleConnectorWidths[options.style];
  if (connectorWidth > 0) {
    context.save();
    context.strokeStyle = foregroundPaint;
    context.lineWidth = moduleSize * connectorWidth;
    context.lineCap = groupedStyleConnectorCaps[options.style];
    visitGroupedStyleConnectors(qrCode, eyeFrameStyle, eyeBallStyle, (startColumn, startRow, endColumn, endRow) => {
      context.beginPath();
      context.moveTo(offsetX + startColumn * moduleSize, offsetY + startRow * moduleSize);
      context.lineTo(offsetX + endColumn * moduleSize, offsetY + endRow * moduleSize);
      context.stroke();
    });
    context.restore();
  }

  if (options.style === "mosaic") {
    drawMosaicModules(
      context,
      qrCode,
      moduleSize,
      offsetX,
      offsetY,
      eyeFrameStyle,
      eyeBallStyle,
    );
  } else {
    // Heart style com detecção de clusters para corações maiores
    if (options.style === "heart") {
      const moduleSizeInt = qrCode.modules.size;
      
      // Primeiro: desenhar módulos reservados (alinhamento, timing) como quadrados
      // Estes devem sempre aparecer e serem intocáveis, mesmo com estilo heart
      for (let row = 0; row < moduleSizeInt; row++) {
        for (let column = 0; column < moduleSizeInt; column++) {
          if (qrCode.modules.isReserved(row, column) === 1 
              && !isFinderPatternModule(row, column, moduleSizeInt)
              && qrCode.modules.get(row, column)) {
            const x = offsetX + (column + quietZone) * moduleSize;
            const y = offsetY + (row + quietZone) * moduleSize;
            context.fillRect(x, y, moduleSize, moduleSize);
          }
        }
      }
      
      const clustersToRender: Array<{minRow: number, maxRow: number, minCol: number, maxCol: number, modules: [number, number][]}> = [];
      const visited = new Set<string>();
      
      // Verificar blocos 2x2 e 3x3
      for (let row = 0; row < moduleSizeInt - 2; row++) {
        for (let column = 0; column < moduleSizeInt - 2; column++) {
          // PROTEÇÃO ABSOLUTA: Sempre excluir marcadores de posição
          if (isFinderPatternModule(row, column, moduleSizeInt)) continue;
          
          // Verificar bloco 2x2
          let block2x2Count = 0;
          const block2x2Modules: [number, number][] = [];
          
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const r = row + dr;
              const c = column + dc;
              
              if (isFinderPatternModule(r, c, moduleSizeInt)) continue;
              if (isExcludedFinderModule(r, c, moduleSizeInt, eyeFrameStyle, eyeBallStyle)) continue;
              if (!qrCode.modules.get(r, c)) continue;
              if (qrCode.modules.isReserved(r, c) === 1) continue;
              
              block2x2Count++;
              block2x2Modules.push([r, c]);
            }
          }
          
          // Se bloco 2x2 tem EXATAMENTE 4 módulos, renderizar coração maior
          if (block2x2Count === 4) {
            // Verificar se não foi já visitado
            const blockKey = block2x2Modules.map(([r, c]) => `${r},${c}`).sort().join('|');
            if (!visited.has(blockKey)) {
              clustersToRender.push({
                minRow: row,
                maxRow: row + 1,
                minCol: column,
                maxCol: column + 1,
                modules: block2x2Modules
              });
              block2x2Modules.forEach(([r, c]) => visited.add(`${r},${c}`));
            }
          }
        }
      }
      
      // Renderizar corações maiores para clusters
      clustersToRender.forEach(clusterInfo => {
        const { minRow, maxRow, minCol, maxCol, modules } = clusterInfo;
        const clusterWidth = maxCol - minCol + 1;
        const clusterHeight = maxRow - minRow + 1;
        const baseSize = Math.max(clusterWidth, clusterHeight) * moduleSize;
        const size = baseSize * 1.3;
        const x = offsetX + (minCol + quietZone) * moduleSize - (size - baseSize) / 2;
        const y = offsetY + (minRow + quietZone) * moduleSize - (size - baseSize) / 2;
        
        // Zona de limpeza: mascarar área atrás da ponta do V do coração ANTES de desenhar o coração
        // Evita que módulos abaixo apareçam através da abertura
        context.save();
        context.fillStyle = options.backgroundColor;
        const maskWidth = size * 0.15;
        const maskHeight = size * 0.2;
        context.fillRect(x + size / 2 - maskWidth / 2, y + size * 1.0, maskWidth, maskHeight);
        context.restore();
        
        // Restaurar cor do coração
        context.fillStyle = foregroundPaint;
        
        // Coração grande ocupando o cluster
        context.beginPath();
        context.moveTo(x + size / 2, y + size * 0.96);
        context.bezierCurveTo(x + size * 0.25, y + size * 0.78, x + size * 0.05, y + size * 0.52, x + size * 0.1, y + size * 0.28);
        context.bezierCurveTo(x + size * 0.1, y + size * 0.08, x + size * 0.35, y - size * 0.02, x + size / 2, y + size * 0.18);
        context.bezierCurveTo(x + size * 0.65, y - size * 0.02, x + size * 0.9, y + size * 0.08, x + size * 0.9, y + size * 0.28);
        context.bezierCurveTo(x + size * 0.95, y + size * 0.52, x + size * 0.75, y + size * 0.78, x + size / 2, y + size * 0.96);
        context.closePath();
        context.fill();
      });
      
      // Segundo passo: renderizar corações individuais para módulos restantes
      for (let row = 0; row < moduleSizeInt; row++) {
        for (let column = 0; column < moduleSizeInt; column++) {
          const key = `${row},${column}`;
          if (visited.has(key)) continue;
          
          // PROTEÇÃO ABSOLUTA: Sempre excluir marcadores de posição
          if (isFinderPatternModule(row, column, moduleSizeInt)) continue;
          if (isExcludedFinderModule(row, column, moduleSizeInt, eyeFrameStyle, eyeBallStyle)) continue;
          if (!qrCode.modules.get(row, column)) continue;
          if (qrCode.modules.isReserved(row, column) === 1) continue;
          
          const x = offsetX + (column + quietZone) * moduleSize;
          const y = offsetY + (row + quietZone) * moduleSize;
          
          context.beginPath();
          context.moveTo(x + moduleSize / 2, y + moduleSize * 0.96);
          context.bezierCurveTo(x + moduleSize * 0.35, y + moduleSize * 0.82, x + moduleSize * 0.05, y + moduleSize * 0.58, x + moduleSize * 0.05, y + moduleSize * 0.32);
          context.bezierCurveTo(x + moduleSize * 0.05, y + moduleSize * 0.08, x + moduleSize * 0.4, y - moduleSize * 0.02, x + moduleSize / 2, y + moduleSize * 0.2);
          context.bezierCurveTo(x + moduleSize * 0.6, y - moduleSize * 0.02, x + moduleSize * 0.95, y + moduleSize * 0.08, x + moduleSize * 0.95, y + moduleSize * 0.32);
          context.bezierCurveTo(x + moduleSize * 0.95, y + moduleSize * 0.58, x + moduleSize * 0.65, y + moduleSize * 0.82, x + moduleSize / 2, y + moduleSize * 0.96);
          context.closePath();
          context.fill();
        }
      }
    } else {
      // Renderização para outros estilos
      for (let row = 0; row < qrCode.modules.size; row++) {
        for (let column = 0; column < qrCode.modules.size; column++) {
          if (isExcludedFinderModule(row, column, qrCode.modules.size, eyeFrameStyle, eyeBallStyle)) continue;
          if (!qrCode.modules.get(row, column)) continue;

          const x = offsetX + (column + quietZone) * moduleSize;
          const y = offsetY + (row + quietZone) * moduleSize;
          const isFunctionModule = qrCode.modules.isReserved(row, column) === 1;
          if (options.style === "square" || isFunctionModule) {
            context.fillRect(x, y, moduleSize, moduleSize);
          } else if (options.style === "relief") {
            drawReliefModule(context, x, y, moduleSize);
          } else if (options.style === "dots") {
            context.beginPath();
            context.arc(x + moduleSize / 2, y + moduleSize / 2, moduleSize * 0.5, 0, Math.PI * 2);
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
          }
        }
      }
    }
  }

  // Sempre desenhar os marcadores de posição (Finder Patterns)
  // Eles devem estar sempre visíveis e intocáveis, independentemente do estilo dos olhos
  drawFinderPatterns(
      context,
      qrCode.modules.size,
      moduleSize,
      offsetX,
      offsetY,
      options.foregroundColor,
      options.backgroundColor,
      eyeFrameColor === options.foregroundColor ? foregroundPaint : eyeFrameColor,
      eyeBallColor === options.foregroundColor ? foregroundPaint : eyeBallColor,
      eyeFrameStyle,
      eyeBallStyle,
    );

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
  if (style === "heart") {
    return `<path d="M${x + size / 2} ${y + size * 0.96}C${x + size * 0.4} ${y + size * 0.82} ${x + size * 0.02} ${y + size * 0.58} ${x + size * 0.02} ${y + size * 0.3}C${x + size * 0.02} ${y + size * 0.02} ${x + size * 0.38} ${y - size * 0.04} ${x + size / 2} ${y + size * 0.24}C${x + size * 0.62} ${y - size * 0.04} ${x + size * 0.98} ${y + size * 0.02} ${x + size * 0.98} ${y + size * 0.3}C${x + size * 0.98} ${y + size * 0.58} ${x + size * 0.6} ${y + size * 0.82} ${x + size / 2} ${y + size * 0.96}Z" fill="${color}"/>`;
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
    gradientEndColor?: string;
    backgroundColor: string;
    style: QrCodeStyle;
    eyeFrameStyle?: QrCodeEyeStyle;
    eyeBallStyle?: QrCodeEyeStyle;
    eyeFrameColor?: string;
    eyeBallColor?: string;
    logoDataUrl?: string;
  },
): string {
  const qrCode = createQrCode(content);
  const totalModules = qrCode.modules.size + quietZone * 2;
  const eyeFrameStyle = options.eyeFrameStyle || "square";
  const eyeBallStyle = options.eyeBallStyle || "square";
  const eyeFrameColor = options.eyeFrameColor || options.foregroundColor;
  const eyeBallColor = options.eyeBallColor || options.foregroundColor;
  const foregroundPaint = options.gradientEndColor ? "url(#qr-code-gradient)" : escapeXml(options.foregroundColor);
  const eyeFramePaint = eyeFrameColor === options.foregroundColor ? foregroundPaint : escapeXml(eyeFrameColor);
  const eyeBallPaint = eyeBallColor === options.foregroundColor ? foregroundPaint : escapeXml(eyeBallColor);
  const squarePaths: string[] = [];
  const styledModules: string[] = [];

  const connectorWidth = groupedStyleConnectorWidths[options.style];
  if (connectorWidth > 0) {
    const connectors: string[] = [];
    visitGroupedStyleConnectors(qrCode, eyeFrameStyle, eyeBallStyle, (startColumn, startRow, endColumn, endRow) => {
      connectors.push(`M${startColumn} ${startRow}L${endColumn} ${endRow}`);
    });
    if (connectors.length) {
      styledModules.push(`<path d="${connectors.join("")}" fill="none" stroke="${escapeXml(options.foregroundColor)}" stroke-width="${connectorWidth}" stroke-linecap="${groupedStyleConnectorCaps[options.style]}"/>`);
    }
  }

  if (options.style === "mosaic") {
    const cornerRadius = 0.08;
    const size = qrCode.modules.size;
    const activeRuns = new Map<string, { startRow: number; endRow: number; startColumn: number; endColumn: number }>();
    const paintRun = (run: { startRow: number; endRow: number; startColumn: number; endColumn: number }) => {
      const x = run.startColumn + quietZone;
      const y = run.startRow + quietZone;
      const width = run.endColumn - run.startColumn;
      const height = run.endRow - run.startRow;
      const radius = Math.min(cornerRadius, width / 2, height / 2);
      styledModules.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/>`);
    };

    for (let row = 0; row < size; row++) {
      const rowRuns = new Map<string, { startRow: number; endRow: number; startColumn: number; endColumn: number }>();
      let column = 0;
      while (column < size) {
        if (
          !qrCode.modules.get(row, column)
          || isExcludedFinderModule(row, column, size, eyeFrameStyle, eyeBallStyle)
          || qrCode.modules.isReserved(row, column) === 1
        ) {
          column++;
          continue;
        }
        const startColumn = column++;
        while (
          column < size
          && qrCode.modules.get(row, column)
          && !isExcludedFinderModule(row, column, size, eyeFrameStyle, eyeBallStyle)
          && qrCode.modules.isReserved(row, column) !== 1
        ) column++;
        const key = `${startColumn}:${column}`;
        const previous = activeRuns.get(key);
        rowRuns.set(key, previous
          ? { ...previous, endRow: row + 1 }
          : { startRow: row, endRow: row + 1, startColumn, endColumn: column });
      }

      for (const [key, run] of activeRuns) {
        if (!rowRuns.has(key)) paintRun(run);
      }
      activeRuns.clear();
      for (const [key, run] of rowRuns) activeRuns.set(key, run);
    }

    for (const run of activeRuns.values()) paintRun(run);
    for (let row = 0; row < size; row++) {
      for (let column = 0; column < size; column++) {
        if (
          qrCode.modules.get(row, column)
          && !isExcludedFinderModule(row, column, size, eyeFrameStyle, eyeBallStyle)
          && qrCode.modules.isReserved(row, column) === 1
        ) squarePaths.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
      }
    }
  } else {
    // Heart style com detecção de clusters para corações maiores
    if (options.style === "heart") {
      const moduleSizeInt = qrCode.modules.size;
      
      // Primeiro: desenhar módulos reservados (alinhamento, timing) como quadrados
      // Estes devem sempre aparecer e serem intocáveis, mesmo com estilo heart
      for (let row = 0; row < moduleSizeInt; row++) {
        for (let column = 0; column < moduleSizeInt; column++) {
          if (qrCode.modules.isReserved(row, column) === 1 
              && !isFinderPatternModule(row, column, moduleSizeInt)
              && qrCode.modules.get(row, column)) {
            const x = column + quietZone;
            const y = row + quietZone;
            squarePaths.push(`M${x} ${y}h1v1h-1z`);
          }
        }
      }
      
      const clustersToRender: Array<{minRow: number, maxRow: number, minCol: number, maxCol: number, modules: [number, number][]}> = [];
      const visited = new Set<string>();
      
      // Verificar blocos 2x2 e 3x3
      for (let row = 0; row < moduleSizeInt - 2; row++) {
        for (let column = 0; column < moduleSizeInt - 2; column++) {
          // PROTEÇÃO ABSOLUTA: Sempre excluir marcadores de posição
          if (isFinderPatternModule(row, column, moduleSizeInt)) continue;
          
          // Verificar bloco 2x2
          let block2x2Count = 0;
          const block2x2Modules: [number, number][] = [];
          
          for (let dr = 0; dr < 2; dr++) {
            for (let dc = 0; dc < 2; dc++) {
              const r = row + dr;
              const c = column + dc;
              
              if (isFinderPatternModule(r, c, moduleSizeInt)) continue;
              if (isExcludedFinderModule(r, c, moduleSizeInt, eyeFrameStyle, eyeBallStyle)) continue;
              if (!qrCode.modules.get(r, c)) continue;
              if (qrCode.modules.isReserved(r, c) === 1) continue;
              
              block2x2Count++;
              block2x2Modules.push([r, c]);
            }
          }
          
          // Se bloco 2x2 tem EXATAMENTE 4 módulos, renderizar coração maior
          if (block2x2Count === 4) {
            const blockKey = block2x2Modules.map(([r, c]) => `${r},${c}`).sort().join('|');
            if (!visited.has(blockKey)) {
              clustersToRender.push({
                minRow: row,
                maxRow: row + 1,
                minCol: column,
                maxCol: column + 1,
                modules: block2x2Modules
              });
              block2x2Modules.forEach(([r, c]) => visited.add(`${r},${c}`));
            }
          }
        }
      }
      
      // Renderizar clusters
      clustersToRender.forEach(clusterInfo => {
        const { minRow, maxRow, minCol, maxCol } = clusterInfo;
        const clusterWidth = maxCol - minCol + 1;
        const clusterHeight = maxRow - minRow + 1;
        const size = Math.max(clusterWidth, clusterHeight);
        const x = minCol + quietZone;
        const y = minRow + quietZone;
        // Tamanho do coração para preencher o bloco 2x2 de forma natural
        const heartSize = size * 1.3; 
        const heartX = x - (heartSize - size) / 2;
        const heartY = y - (heartSize - size) / 2;
        
        styledModules.push(`<path d="M${heartX + heartSize / 2} ${heartY + heartSize * 0.96}C${heartX + heartSize * 0.25} ${heartY + heartSize * 0.78} ${heartX + heartSize * 0.05} ${heartY + heartSize * 0.52} ${heartX + heartSize * 0.1} ${heartY + heartSize * 0.28}C${heartX + heartSize * 0.1} ${heartY + heartSize * 0.08} ${heartX + heartSize * 0.35} ${heartY - heartSize * 0.02} ${heartX + heartSize / 2} ${heartY + heartSize * 0.18}C${heartX + heartSize * 0.65} ${heartY - heartSize * 0.02} ${heartX + heartSize * 0.9} ${heartY + heartSize * 0.08} ${heartX + heartSize * 0.9} ${heartY + heartSize * 0.28}C${heartX + heartSize * 0.95} ${heartY + heartSize * 0.52} ${heartX + heartSize * 0.75} ${heartY + heartSize * 0.78} ${heartX + heartSize / 2} ${heartY + heartSize * 0.96}Z" fill="${foregroundPaint}"/>`);
      });
      
      // Renderizar módulos individuais restantes
      for (let row = 0; row < moduleSizeInt; row++) {
        for (let column = 0; column < moduleSizeInt; column++) {
          const key = `${row},${column}`;
          if (visited.has(key)) continue;
          
          // PROTEÇÃO ABSOLUTA: Sempre excluir marcadores de posição
          if (isFinderPatternModule(row, column, moduleSizeInt)) continue;
          if (isExcludedFinderModule(row, column, moduleSizeInt, eyeFrameStyle, eyeBallStyle)) continue;
          if (!qrCode.modules.get(row, column)) continue;
          if (qrCode.modules.isReserved(row, column) === 1) continue;
          
          const x = column + quietZone;
          const y = row + quietZone;
          styledModules.push(`<path d="M${x + 0.5} ${y + 1}C${x + 0.3} ${y + 0.85} ${x - 0.1} ${y + 0.55} ${x + 0.05} ${y + 0.35}C${x + 0.05} ${y + 0.15} ${x + 0.3} ${y + 0.05} ${x + 0.5} ${y + 0.15}C${x + 0.7} ${y + 0.05} ${x + 0.95} ${y + 0.15} ${x + 0.95} ${y + 0.35}C${x + 1.1} ${y + 0.55} ${x + 0.7} ${y + 0.85} ${x + 0.5} ${y + 1}Z" fill="${foregroundPaint}"/>`);
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
          } else if (options.style === "relief") {
            styledModules.push(`<path d="${reliefSvgPath(x, y, 1)}"/>`);
          } else if (options.style === "dots") {
            styledModules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`);
          } else if (options.style === "star") {
            styledModules.push(`<path d="M${x + 0.5} ${y + 0.03}L${x + 0.74} ${y + 0.26}L${x + 0.97} ${y + 0.5}L${x + 0.74} ${y + 0.74}L${x + 0.5} ${y + 0.97}L${x + 0.26} ${y + 0.74}L${x + 0.03} ${y + 0.5}L${x + 0.26} ${y + 0.26}Z" fill="${foregroundPaint}"/>`);
          }
        }
      }
    }
  }

  const background = escapeXml(options.backgroundColor);
  // Sempre renderizar os marcadores de posição (Finder Patterns)
  // Eles devem estar sempre visíveis e intocáveis
  const eyePatterns = [[0, 0], [0, qrCode.modules.size - 7], [qrCode.modules.size - 7, 0]]
      .map(([row, column]) => {
        const x = column + quietZone;
        const y = row + quietZone;
        return [
          renderSvgEyeShape(x, y, 7, eyeFrameStyle, eyeFramePaint),
          renderSvgEyeShape(x + 1, y + 1, 5, "square", background),
          renderSvgEyeShape(x + 2, y + 2, 3, eyeBallStyle, eyeBallPaint),
        ].join("");
      })
      .join("");
  let logo = "";
  if (options.logoDataUrl) {
    const logoSize = totalModules * 0.14;
    const backingSize = logoSize * 1.14;
    const backingOffset = (totalModules - backingSize) / 2;
    const logoOffset = (totalModules - logoSize) / 2;
    logo = `<rect x="${backingOffset}" y="${backingOffset}" width="${backingSize}" height="${backingSize}" rx="${backingSize * 0.12}" fill="${background}"/><image href="${escapeXml(options.logoDataUrl)}" x="${logoOffset}" y="${logoOffset}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const squarePath = squarePaths.length
    ? `<path fill="${foregroundPaint}" d="${squarePaths.join("")}"/>`
    : "";
  const styledPath = styledModules.length
    ? `<g fill="${foregroundPaint}">${styledModules.join("")}</g>`
    : "";
  const gradient = options.gradientEndColor
    ? `<defs><linearGradient id="qr-code-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${totalModules}" y2="0"><stop offset="0%" stop-color="${escapeXml(options.foregroundColor)}"/><stop offset="100%" stop-color="${escapeXml(options.gradientEndColor)}"/></linearGradient></defs>`
    : "";
  // Ordem correta: background → módulos estilizados → módulos quadrados (reservados) → olhos → logo
  // Isso garante que marcadores de posição e alinhamento sempre apareçam por cima
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 ${totalModules} ${totalModules}">${gradient}<rect width="100%" height="100%" fill="${background}"/>${styledPath}${squarePath}${eyePatterns}${logo}</svg>`;
}
