import {
  qrCodeEyeStyleOptions,
  qrCodeStyleOptions,
  isQrCodeEyeStyle,
  type QrCodeEyeStyle,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";

const previewModules = [
  [1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 1, 1, 0, 1],
];

function renderPencilPreviewModules(vertical: boolean): React.JSX.Element[] {
  const pencils: React.JSX.Element[] = [];
  const lines = vertical ? previewModules[0].length : previewModules.length;
  const length = vertical ? previewModules.length : previewModules[0].length;
  for (let line = 0; line < lines; line++) {
    let position = 0;
    while (position < length) {
      const isDark = vertical ? previewModules[position][line] : previewModules[line][position];
      if (!isDark) {
        position++;
        continue;
      }
      const start = position++;
      while (
        position < length
        && (vertical ? previewModules[position][line] : previewModules[line][position])
      ) position++;

      const x = (vertical ? line : start) * 6;
      const y = (vertical ? start : line) * 6;
      const width = vertical ? 6 : (position - start) * 6;
      const height = vertical ? (position - start) * 6 : 6;
      const tip = Math.min(height * 0.28, width * 0.2);
      const cap = Math.min(height * 0.12, width * 0.12);
      const inset = height * 0.025;
      if (vertical) {
        const verticalTip = Math.min(width * 0.28, height * 0.2);
        const verticalCap = Math.min(width * 0.12, height * 0.12);
        const verticalInset = width * 0.025;
        const centerX = x + width / 2;
        pencils.push(
          <path
            key={`pencil-${line}-${start}`}
            d={`M${centerX} ${y}L${x + width - verticalInset} ${y + verticalTip}V${y + height - verticalCap}Q${x + width - verticalInset} ${y + height} ${centerX} ${y + height}Q${x + verticalInset} ${y + height} ${x + verticalInset} ${y + height - verticalCap}V${y + verticalTip}Z`}
          />,
        );
      } else {
        pencils.push(
          <path
            key={`pencil-${line}-${start}`}
            d={`M${x} ${y + height / 2}L${x + tip} ${y + inset}H${x + width - cap}Q${x + width} ${y + inset} ${x + width} ${y + height / 2}Q${x + width} ${y + height - inset} ${x + width - cap} ${y + height - inset}H${x + tip}Z`}
          />,
        );
      }
    }
  }
  return pencils;
}

function renderTribalPreview(): React.JSX.Element {
  const segments: string[] = [];
  for (let row = 0; row < previewModules.length; row++) {
    for (let column = 0; column < previewModules[row].length; column++) {
      if (!previewModules[row][column]) continue;
      const centerX = column * 6 + 3;
      const centerY = row * 6 + 3;
      const hasRightNeighbor = previewModules[row][column + 1] === 1;
      const hasBottomNeighbor = previewModules[row + 1]?.[column] === 1;
      if (hasRightNeighbor) segments.push(`M${centerX} ${centerY}L${centerX + 6} ${centerY}`);
      if (hasBottomNeighbor) segments.push(`M${centerX} ${centerY}L${centerX} ${centerY + 6}`);
      if (!hasRightNeighbor && !hasBottomNeighbor) segments.push(`M${centerX} ${centerY}L${centerX} ${centerY}`);
    }
  }
  return (
    <path
      d={segments.join("")}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="5.4"
    />
  );
}

function renderPreviewModule(style: QrCodeStyle, row: number, column: number): React.JSX.Element {
  const x = column * 6;
  const y = row * 6;
  if (style === "dots") {
    return <circle key={`${row}-${column}`} cx={x + 3} cy={y + 3} r="2.98" />;
  }
  if (style === "vertical") {
    return <rect key={`${row}-${column}`} x={x + 0.12} y={y + 0.06} width="5.76" height="5.88" rx="2.88" />;
  }
  if (style === "horizontal") {
    return <rect key={`${row}-${column}`} x={x + 0.06} y={y + 0.12} width="5.88" height="5.76" rx="2.88" />;
  }
  if (style === "diamond") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.03} ${x + 5.97},${y + 3} ${x + 3},${y + 5.97} ${x + 0.03},${y + 3}`} />;
  }
  if (style === "octagon") {
    return <polygon key={`${row}-${column}`} points={`${x + 0.48},${y + 0.03} ${x + 5.52},${y + 0.03} ${x + 5.97},${y + 0.48} ${x + 5.97},${y + 5.52} ${x + 5.52},${y + 5.97} ${x + 0.48},${y + 5.97} ${x + 0.03},${y + 5.52} ${x + 0.03},${y + 0.48}`} />;
  }
  if (style === "leaf") {
    return <path key={`${row}-${column}`} d={`M${x + 3} ${y + 0.2}Q${x + 5.8} ${y + 1.6} ${x + 5.4} ${y + 3.8}Q${x + 5} ${y + 5.8} ${x + 3} ${y + 5.9}Q${x + 1} ${y + 5.8} ${x + 0.6} ${y + 3.8}Q${x + 0.2} ${y + 1.6} ${x + 3} ${y + 0.2}Z`} />;
  }
  if (style === "star") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.09} ${x + 4.44},${y + 1.56} ${x + 5.91},${y + 3} ${x + 4.44},${y + 4.44} ${x + 3},${y + 5.91} ${x + 1.56},${y + 4.44} ${x + 0.09},${y + 3} ${x + 1.56},${y + 1.56}`} />;
  }
  if (style === "heart") {
    return <path key={`${row}-${column}`} d={`M${x + 3} ${y + 5.88}C${x + 2.4} ${y + 5.16} ${x + 0.12} ${y + 3.72} ${x + 0.12} ${y + 2.04}C${x + 0.12} ${y + 0.24} ${x + 2.28} ${y - 0.12} ${x + 3} ${y + 1.5}C${x + 3.72} ${y - 0.12} ${x + 5.88} ${y + 0.24} ${x + 5.88} ${y + 2.04}C${x + 5.88} ${y + 3.72} ${x + 3.6} ${y + 5.16} ${x + 3} ${y + 5.88}Z`} />;
  }
  return (
    <rect
      key={`${row}-${column}`}
      x={x + 0.12}
      y={y + 0.12}
      width="5.76"
      height="5.76"
      rx={style === "mosaic" ? "0.36" : style === "rounded" ? "1.2" : "0"}
    />
  );
}

export default function QrCodeStylePicker({
  value,
  eyeFrameStyle,
  eyeBallStyle,
  eyeFrameColor,
  eyeBallColor,
  onChange,
  onEyeFrameStyleChange,
  onEyeBallStyleChange,
  onEyeFrameColorChange,
  onEyeBallColorChange,
  disabled = false,
}: {
  value: QrCodeStyle;
  eyeFrameStyle: QrCodeEyeStyle;
  eyeBallStyle: QrCodeEyeStyle;
  eyeFrameColor: string;
  eyeBallColor: string;
  onChange: (style: QrCodeStyle) => void;
  onEyeFrameStyleChange: (style: QrCodeEyeStyle) => void;
  onEyeBallStyleChange: (style: QrCodeEyeStyle) => void;
  onEyeFrameColorChange: (color: string) => void;
  onEyeBallColorChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="qr-style-picker" disabled={disabled}>
      <legend>Estilo dos traços</legend>
      <div className="qr-style-options">
        {qrCodeStyleOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className="qr-style-option"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            <svg
              aria-hidden="true"
              className={`qr-style-sample qr-style-sample-${option.id}`}
              viewBox="0 0 30 30"
            >
              {option.id === "tribal"
                ? renderTribalPreview()
                : option.id === "pencil"
                ? renderPencilPreviewModules(false)
                : option.id === "pencil-vertical"
                  ? renderPencilPreviewModules(true)
                  : previewModules.flatMap((row, rowIndex) =>
                    row.flatMap((isDark, columnIndex) => isDark
                      ? [renderPreviewModule(option.id, rowIndex, columnIndex)]
                      : []),
                  )}
            </svg>
            <span>{option.label}</span>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
      <div className="qr-eye-style-options">
        <label>
          Moldura dos marcadores
          <select
            value={eyeFrameStyle}
            onChange={(event) => {
              if (isQrCodeEyeStyle(event.target.value)) onEyeFrameStyleChange(event.target.value);
            }}
          >
            {qrCodeEyeStyleOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Centro dos marcadores
          <select
            value={eyeBallStyle}
            onChange={(event) => {
              if (isQrCodeEyeStyle(event.target.value)) onEyeBallStyleChange(event.target.value);
            }}
          >
            {qrCodeEyeStyleOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="qr-eye-color">
          Cor da moldura
          <input
            aria-label="Cor da moldura dos marcadores"
            onChange={(event) => onEyeFrameColorChange(event.target.value)}
            type="color"
            value={eyeFrameColor}
          />
          <output>{eyeFrameColor}</output>
        </label>
        <label className="qr-eye-color">
          Cor do centro
          <input
            aria-label="Cor do centro dos marcadores"
            onChange={(event) => onEyeBallColorChange(event.target.value)}
            type="color"
            value={eyeBallColor}
          />
          <output>{eyeBallColor}</output>
        </label>
      </div>
      <p className="qr-style-hint">
        Marcadores com coração usam cantos arredondados para preservar a leitura. O centro branco dos marcadores e a margem de segurança são mantidos.
      </p>
    </fieldset>
  );
}
