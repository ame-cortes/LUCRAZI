import {
  qrCodeStyleOptions,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";

const previewModules = [
  [1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1],
  [0, 0, 0, 1, 0],
  [1, 1, 1, 0, 1],
];

export default function QrCodeStylePicker({
  value,
  onChange,
  disabled = false,
}: {
  value: QrCodeStyle;
  onChange: (style: QrCodeStyle) => void;
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
                  ? [option.id === "dots" ? (
                    <circle
                      key={`${rowIndex}-${columnIndex}`}
                      cx={columnIndex * 6 + 3}
                      cy={rowIndex * 6 + 3}
                      r="2.4"
                    />
                  ) : (
                    <rect
                      key={`${rowIndex}-${columnIndex}`}
                      x={columnIndex * 6}
                      y={rowIndex * 6}
                      width="5"
                      height="5"
                      rx={option.id === "rounded" ? "1.4" : "0"}
                    />
                  )]
                  : []),
              )}
            </svg>
            <span>{option.label}</span>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
      <p className="qr-style-hint">
        Os marcadores de leitura ficam quadrados. Prefira alto contraste e teste com a câmera antes de imprimir.
      </p>
    </fieldset>
  );
}
