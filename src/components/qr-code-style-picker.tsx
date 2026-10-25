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
    return <circle key={`${row}-${column}`} cx={x + 3} cy={y + 3} r="2.4" />;
  }
  if (style === "vertical") {
    return <rect key={`${row}-${column}`} x={x + 1.2} y={y + 0.2} width="3" height="4.6" rx="1.5" />;
  }
  if (style === "horizontal") {
    return <rect key={`${row}-${column}`} x={x + 0.2} y={y + 1.2} width="4.6" height="3" rx="1.5" />;
  }
  if (style === "diamond") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.3} ${x + 5.7},${y + 3} ${x + 3},${y + 5.7} ${x + 0.3},${y + 3}`} />;
  }
  if (style === "octagon") {
    return <polygon key={`${row}-${column}`} points={`${x + 1.4},${y + 0.2} ${x + 3.6},${y + 0.2} ${x + 4.8},${y + 1.4} ${x + 4.8},${y + 3.6} ${x + 3.6},${y + 4.8} ${x + 1.4},${y + 4.8} ${x + 0.2},${y + 3.6} ${x + 0.2},${y + 1.4}`} />;
  }
  if (style === "leaf") {
    return <rect key={`${row}-${column}`} x={x + 1.4} y={y + 0.3} width="2.2" height="4.4" rx="1.1" transform={`rotate(45 ${x + 3} ${y + 3})`} />;
  }
  if (style === "star") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.2} ${x + 3.8},${y + 2.2} ${x + 5.8},${y + 3} ${x + 3.8},${y + 3.8} ${x + 3},${y + 5.8} ${x + 2.2},${y + 3.8} ${x + 0.2},${y + 3} ${x + 2.2},${y + 2.2}`} />;
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
