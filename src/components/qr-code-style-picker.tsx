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

const previewConnectorWidths: Record<QrCodeStyle, number> = {
  square: 0,
  dots: 4.68,
  star: 2.28,
  mosaic: 0.96,
  heart: 3.48,
  relief: 3.12,
  classy: 0,
  "classy-rounded": 0,
  "extra-rounded": 0,
};

const previewConnectorCaps: Record<QrCodeStyle, "round" | "square"> = {
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

function renderGroupedPreviewConnectors(style: QrCodeStyle): React.JSX.Element {
  const segments: string[] = [];
  for (let row = 0; row < previewModules.length; row++) {
    for (let column = 0; column < previewModules[row].length; column++) {
      if (!previewModules[row][column]) continue;
      const centerX = column * 6 + 3;
      const centerY = row * 6 + 3;
      if (previewModules[row][column + 1]) segments.push(`M${centerX} ${centerY}L${centerX + 6} ${centerY}`);
      if (previewModules[row + 1]?.[column]) segments.push(`M${centerX} ${centerY}L${centerX} ${centerY + 6}`);
    }
  }
  return (
    <path
      d={segments.join("")}
      fill="none"
      stroke="currentColor"
      strokeLinecap={previewConnectorCaps[style]}
      strokeWidth={previewConnectorWidths[style]}
    />
  );
}

/** Preview module rendering */
function renderPreviewModule(style: QrCodeStyle, row: number, column: number): React.JSX.Element {
  const x = column * 6;
  const y = row * 6;
  if (style === "dots") {
    return <circle key={`${row}-${column}`} cx={x + 3} cy={y + 3} r="2.98" />;
  }
  if (style === "star") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.09} ${x + 4.44},${y + 1.56} ${x + 5.91},${y + 3} ${x + 4.44},${y + 4.44} ${x + 3},${y + 5.91} ${x + 1.56},${y + 4.44} ${x + 0.09},${y + 3} ${x + 1.56},${y + 1.56}`} />;
  }
  if (style === "heart") {
    return <path key={`${row}-${column}`} d={`M${x + 3} ${y + 5.88}C${x + 2.4} ${y + 5.16} ${x + 0.12} ${y + 3.72} ${x + 0.12} ${y + 2.04}C${x + 0.12} ${y + 0.24} ${x + 2.28} ${y - 0.12} ${x + 3} ${y + 1.5}C${x + 3.72} ${y - 0.12} ${x + 5.88} ${y + 0.24} ${x + 5.88} ${y + 2.04}C${x + 5.88} ${y + 3.72} ${x + 3.6} ${y + 5.16} ${x + 3} ${y + 5.88}Z`} />;
  }
  if (style === "relief") {
    return <path key={`${row}-${column}`} d={`M${x + 0.78} ${y + 0.12}H${x + 2.28}Q${x + 3} ${y + 0.84} ${x + 3.72} ${y + 0.12}H${x + 5.22}Q${x + 5.88} ${y + 0.12} ${x + 5.88} ${y + 0.78}V${y + 2.28}Q${x + 5.16} ${y + 3} ${x + 5.88} ${y + 3.72}V${y + 5.22}Q${x + 5.88} ${y + 5.88} ${x + 5.22} ${y + 5.88}H${x + 3.72}Q${x + 3} ${y + 5.16} ${x + 2.28} ${y + 5.88}H${x + 0.78}Q${x + 0.12} ${y + 5.88} ${x + 0.12} ${y + 5.22}V${y + 3.72}Q${x + 0.84} ${y + 3} ${x + 0.12} ${y + 2.28}V${y + 0.78}Q${x + 0.12} ${y + 0.12} ${x + 0.78} ${y + 0.12}Z`} />;
  }
  if (style === "classy") {
    return <path key={`${row}-${column}`} d={`M${x + 0.12} ${y + 0.12}H${x + 4.2}L${x + 5.88} ${y + 1.8}V${y + 5.88}H${x + 1.8}L${x + 0.12} ${y + 4.2}Z`} />;
  }
  return (
    <rect
      key={`${row}-${column}`}
      x={x + 0.12}
      y={y + 0.12}
      width="5.76"
      height="5.76"
      rx={style === "mosaic" ? "0.36" : style === "classy-rounded" ? "0.6" : style === "extra-rounded" ? "1.44" : "0"}
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
              {option.id !== "square" && renderGroupedPreviewConnectors(option.id)}
              {previewModules.flatMap((row, rowIndex) =>
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
        Módulos vizinhos se conectam em traços agrupados, mantendo a forma de cada estilo. A moldura em coração e o centro branco dos marcadores são preservados.
      </p>
    </fieldset>
  );
}
