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

function renderPreviewModule(style: QrCodeStyle, row: number, column: number): React.JSX.Element {
  const x = column * 6;
  const y = row * 6;
  if (style === "dots") {
    return <circle key={`${row}-${column}`} cx={x + 3} cy={y + 3} r="2.76" />;
  }
  if (style === "vertical") {
    return <rect key={`${row}-${column}`} x={x + 0.84} y={y + 0.2} width="4.32" height="4.6" rx="2.16" />;
  }
  if (style === "horizontal") {
    return <rect key={`${row}-${column}`} x={x + 0.2} y={y + 0.84} width="4.6" height="4.32" rx="2.16" />;
  }
  if (style === "diamond") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.3} ${x + 5.7},${y + 3} ${x + 3},${y + 5.7} ${x + 0.3},${y + 3}`} />;
  }
  if (style === "octagon") {
    return <polygon key={`${row}-${column}`} points={`${x + 1.4},${y + 0.2} ${x + 3.6},${y + 0.2} ${x + 4.8},${y + 1.4} ${x + 4.8},${y + 3.6} ${x + 3.6},${y + 4.8} ${x + 1.4},${y + 4.8} ${x + 0.2},${y + 3.6} ${x + 0.2},${y + 1.4}`} />;
  }
  if (style === "leaf") {
    return <path key={`${row}-${column}`} d={`M${x + 3} ${y + 0.2}Q${x + 5.8} ${y + 1.6} ${x + 5.4} ${y + 3.8}Q${x + 5} ${y + 5.8} ${x + 3} ${y + 5.9}Q${x + 1} ${y + 5.8} ${x + 0.6} ${y + 3.8}Q${x + 0.2} ${y + 1.6} ${x + 3} ${y + 0.2}Z`} />;
  }
  if (style === "star") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.3} ${x + 3.96},${y + 2.04} ${x + 5.7},${y + 3} ${x + 3.96},${y + 3.96} ${x + 3},${y + 5.7} ${x + 2.04},${y + 3.96} ${x + 0.3},${y + 3} ${x + 2.04},${y + 2.04}`} />;
  }
  if (style === "pencil") {
    return (
      <g key={`${row}-${column}`}>
        <path d={`M${x + 1.68} ${y + 1.44}H${x + 4.32}V${y + 4.32}L${x + 3} ${y + 5.88}L${x + 1.68} ${y + 4.32}Z`} />
        <path d={`M${x + 1.68} ${y + 1.44}V${y + 0.72}Q${x + 3} ${y + 0.24} ${x + 4.32} ${y + 0.72}V${y + 1.44}Z`} />
      </g>
    );
  }
  return (
    <rect
      key={`${row}-${column}`}
      x={x}
      y={y}
      width="5"
      height="5"
      rx={style === "rounded" ? "1.4" : "0"}
    />
  );
}

export default function QrCodeStylePicker({
  value,
  eyeFrameStyle,
  eyeBallStyle,
  onChange,
  onEyeFrameStyleChange,
  onEyeBallStyleChange,
  disabled = false,
}: {
  value: QrCodeStyle;
  eyeFrameStyle: QrCodeEyeStyle;
  eyeBallStyle: QrCodeEyeStyle;
  onChange: (style: QrCodeStyle) => void;
  onEyeFrameStyleChange: (style: QrCodeEyeStyle) => void;
  onEyeBallStyleChange: (style: QrCodeEyeStyle) => void;
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
      </div>
      <p className="qr-style-hint">
        A estrutura dos três marcadores e a margem branca são preservadas. Teste a leitura antes de imprimir.
      </p>
    </fieldset>
  );
}
