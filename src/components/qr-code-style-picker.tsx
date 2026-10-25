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

function renderPencilPreviewRow(row: number[], rowIndex: number): React.JSX.Element[] {
  const y = rowIndex * 6;
  const pencils: React.JSX.Element[] = [];
  let column = 0;
  while (column < row.length) {
    if (!row[column]) {
      column++;
      continue;
    }
    const start = column;
    column++;
    while (column < row.length && row[column]) column++;

    const x = start * 6;
    const width = (column - start) * 6;
    const tip = Math.min(1.68, width * 0.2);
    const cap = Math.min(0.72, width * 0.12);
    pencils.push(
      <path
        key={`pencil-${rowIndex}-${start}`}
        d={`M${x} ${y + 3}L${x + tip} ${y + 0.15}H${x + width - cap}Q${x + width} ${y + 0.15} ${x + width} ${y + 3}Q${x + width} ${y + 5.85} ${x + width - cap} ${y + 5.85}H${x + tip}Z`}
      />,
    );
  }
  return pencils;
}

function renderPreviewModule(style: QrCodeStyle, row: number, column: number): React.JSX.Element {
  const x = column * 6;
  const y = row * 6;
  if (style === "dots") {
    return <circle key={`${row}-${column}`} cx={x + 3} cy={y + 3} r="2.94" />;
  }
  if (style === "vertical") {
    return <rect key={`${row}-${column}`} x={x + 0.36} y={y + 0.12} width="5.28" height="5.76" rx="2.64" />;
  }
  if (style === "horizontal") {
    return <rect key={`${row}-${column}`} x={x + 0.12} y={y + 0.36} width="5.76" height="5.28" rx="2.64" />;
  }
  if (style === "diamond") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.12} ${x + 5.88},${y + 3} ${x + 3},${y + 5.88} ${x + 0.12},${y + 3}`} />;
  }
  if (style === "octagon") {
    return <polygon key={`${row}-${column}`} points={`${x + 0.84},${y + 0.12} ${x + 5.16},${y + 0.12} ${x + 5.88},${y + 0.84} ${x + 5.88},${y + 5.16} ${x + 5.16},${y + 5.88} ${x + 0.84},${y + 5.88} ${x + 0.12},${y + 5.16} ${x + 0.12},${y + 0.84}`} />;
  }
  if (style === "leaf") {
    return <path key={`${row}-${column}`} d={`M${x + 3} ${y + 0.2}Q${x + 5.8} ${y + 1.6} ${x + 5.4} ${y + 3.8}Q${x + 5} ${y + 5.8} ${x + 3} ${y + 5.9}Q${x + 1} ${y + 5.8} ${x + 0.6} ${y + 3.8}Q${x + 0.2} ${y + 1.6} ${x + 3} ${y + 0.2}Z`} />;
  }
  if (style === "star") {
    return <polygon key={`${row}-${column}`} points={`${x + 3},${y + 0.12} ${x + 4.2},${y + 1.8} ${x + 5.88},${y + 3} ${x + 4.2},${y + 4.2} ${x + 3},${y + 5.88} ${x + 1.8},${y + 4.2} ${x + 0.12},${y + 3} ${x + 1.8},${y + 1.8}`} />;
  }
  return (
    <rect
      key={`${row}-${column}`}
      x={x + 0.12}
      y={y + 0.12}
      width="5.76"
      height="5.76"
      rx={style === "rounded" ? "1.2" : "0"}
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
                option.id === "pencil"
                  ? renderPencilPreviewRow(row, rowIndex)
                  : row.flatMap((isDark, columnIndex) => isDark
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
