"use client";

import { getToken } from "firebase/app-check";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { getFirebaseAppCheck } from "@/lib/firebase";
import QrCodeStylePicker from "@/components/qr-code-style-picker";
import {
  createQrCodeSvg,
  renderQrCodeCanvas,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";

type QrCodeGeneratorProps = {
  emailDeliveryEnabled: boolean;
};

const rememberedEmailStorageKey = "lucrazi.qr-code.email";

function downloadFile(filename: string, content: BlobPart, type: string) {
  const url = window.URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function QrCodeGenerator({ emailDeliveryEnabled }: QrCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contentType, setContentType] = useState<"url" | "text">("url");
  const [content, setContent] = useState("https://www.lucrazi.com.br");
  const [foregroundColor, setForegroundColor] = useState("#243B2B");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [qrStyle, setQrStyle] = useState<QrCodeStyle>("square");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveredRequestKey, setDeliveredRequestKey] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [formError, setFormError] = useState("");
  const [emailStorageError, setEmailStorageError] = useState("");
  const requestKey = JSON.stringify([
    email.trim().toLowerCase(),
    content.trim(),
    contentType,
    foregroundColor,
    backgroundColor,
    qrStyle,
    logoDataUrl,
  ]);
  const downloadsUnlocked = deliveredRequestKey !== "" && deliveredRequestKey === requestKey;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const rememberedEmail = window.localStorage.getItem(rememberedEmailStorageKey);
        if (rememberedEmail) setEmail((currentEmail) => currentEmail || rememberedEmail);
      } catch (error) {
        console.warn("Não foi possível recuperar o e-mail lembrado neste navegador.", error);
        setEmailStorageError("Este navegador não permitiu lembrar seu e-mail.");
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const value = content.trim() || " ";
    if (!canvas) return;

    let cancelled = false;
    setPreviewError("");
    void renderQrCodeCanvas(canvas, value, {
      foregroundColor,
      backgroundColor,
      style: qrStyle,
      logoDataUrl,
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error("Não foi possível gerar a prévia do QR Code.", error);
      setPreviewError("Não foi possível gerar a prévia. Confira o conteúdo informado.");
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, content, foregroundColor, logoDataUrl, qrStyle]);

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    setPreviewError("");
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      setLogoDataUrl("");
      return;
    }

    if (file.size > 256 * 1024 || !["image/png", "image/jpeg"].includes(file.type)) {
      setLogoDataUrl("");
      setPreviewError("Escolha um logo PNG ou JPEG de até 256 KB.");
      input.value = "";
      return;
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      console.error("Não foi possível ler o arquivo do logo.", error);
      setPreviewError("Não foi possível ler o arquivo do logo. Tente novamente.");
      input.value = "";
      return;
    }
    const isPng = bytes.length >= 8
      && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if ((file.type === "image/png" && !isPng) || (file.type === "image/jpeg" && !isJpeg)) {
      setLogoDataUrl("");
      setPreviewError("O arquivo não corresponde a uma imagem PNG ou JPEG válida.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setPreviewError("Não foi possível ler o arquivo do logo.");
        return;
      }
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
          setPreviewError("O logo precisa ter dimensões de até 2048 x 2048 pixels.");
          input.value = "";
          return;
        }
        setLogoDataUrl(dataUrl);
      };
      image.onerror = () => setPreviewError("O arquivo não contém uma imagem PNG ou JPEG válida.");
      image.src = dataUrl;
    };
    reader.onerror = () => setPreviewError("Não foi possível ler o arquivo do logo.");
    reader.readAsDataURL(file);
  }

  async function handleDownloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("O navegador não conseguiu criar o arquivo PNG."));
        }, "image/png");
      });
      downloadFile("qr-code-lucrazi.png", blob, "image/png");
    } catch (error) {
      console.error("Não foi possível exportar o QR Code como PNG.", error);
      setPreviewError("Não foi possível baixar o PNG. Tente novamente.");
    }
  }

  async function handleDownloadSvg() {
    try {
      const svg = createQrCodeSvg(content.trim() || " ", {
        foregroundColor,
        backgroundColor,
        style: qrStyle,
        logoDataUrl,
      });
      downloadFile("qr-code-lucrazi.svg", svg, "image/svg+xml;charset=utf-8");
    } catch (error) {
      console.error("Não foi possível exportar o QR Code como SVG.", error);
      setPreviewError("Não foi possível baixar o SVG. Tente novamente.");
    }
  }

  async function handleEmailDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (!consented) {
      setFormError("Autorize o uso do e-mail para receber o arquivo solicitado.");
      return;
    }
    let trimmedContent = content.trim();
    if (contentType === "url") {
      // Adiciona https:// automaticamente se o usuário não colocou protocolo
      if (!/^https?:\/\//i.test(trimmedContent)) {
        trimmedContent = `https://${trimmedContent}`;
      }
      try {
        const url = new URL(trimmedContent);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("invalid protocol");
      } catch {
        setFormError("Informe um endereço web válido.");
        return;
      }
    }

    setIsSubmitting(true);
    const submittedRequestKey = requestKey;
    try {
      const appCheck = await getFirebaseAppCheck();
      const { token } = await getToken(appCheck);
      const response = await fetch("/api/qr-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-AppCheck": token,
        },
        body: JSON.stringify({
          email,
          content: trimmedContent,
          contentType,
          foregroundColor,
          backgroundColor,
          qrStyle,
          ...(logoDataUrl ? { logoDataUrl } : {}),
          consent: consented,
        }),
      });

      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = typeof result === "object"
          && result !== null
          && "error" in result
          && typeof result.error === "string"
          ? result.error
          : "Não foi possível enviar seu QR Code.";
        throw new Error(errorMessage);
      }

      try {
        window.localStorage.setItem(rememberedEmailStorageKey, email.trim().toLowerCase());
        setEmailStorageError("");
      } catch (error) {
        console.warn("O QR Code foi enviado, mas não foi possível lembrar o e-mail neste navegador.", error);
        setEmailStorageError("O envio deu certo, mas este navegador não conseguiu salvar seu e-mail.");
      }
      setDeliveredRequestKey(submittedRequestKey);
      setConsented(false);
    } catch (error) {
      console.error("Não foi possível solicitar a entrega do QR Code.", error);
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar seu QR Code. Tente novamente mais tarde.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function forgetRememberedEmail() {
    try {
      window.localStorage.removeItem(rememberedEmailStorageKey);
      setEmail("");
      setEmailStorageError("");
    } catch (error) {
      console.error("Não foi possível apagar o e-mail lembrado neste navegador.", error);
      setEmailStorageError("Não foi possível apagar o e-mail salvo neste navegador.");
    }
  }

  return (
    <div className="qr-tool">
      <section aria-label="Personalização do QR Code" className="qr-settings">
        <div className="qr-field">
          <label htmlFor="qr-content-type">Tipo de conteúdo</label>
          <select
            id="qr-content-type"
            disabled={isSubmitting}
            onChange={(event) => setContentType(event.target.value === "text" ? "text" : "url")}
            value={contentType}
          >
            <option value="url">Link (URL)</option>
            <option value="text">Texto</option>
          </select>
        </div>

        <div className="qr-field">
          <label htmlFor="qr-content">{contentType === "url" ? "Endereço do site" : "Texto para incluir"}</label>
          <textarea
            id="qr-content"
            maxLength={2048}
            disabled={isSubmitting}
            onChange={(event) => setContent(event.target.value)}
            placeholder={contentType === "url" ? "exemplo.com ou https://exemplo.com" : "Digite o texto"}
            required
            rows={contentType === "url" ? 2 : 4}
            value={content}
          />
          <span className="qr-field-hint">
            {content.length}/2048 caracteres. {contentType === "url" ? "O https:// será adicionado automaticamente se necessário." : "Usado para gerar e enviar seu QR Code; não é armazenado."}
          </span>
        </div>

        <fieldset className="qr-color-fields">
          <legend>Cores do QR Code</legend>
          <div className="qr-color-row">
            <label htmlFor="qr-foreground">Código</label>
            <input
              id="qr-foreground"
              disabled={isSubmitting}
              onChange={(event) => setForegroundColor(event.target.value)}
              type="color"
              value={foregroundColor}
            />
            <output htmlFor="qr-foreground">{foregroundColor}</output>
          </div>
          <div className="qr-color-row">
            <label htmlFor="qr-background">Fundo</label>
            <input
              id="qr-background"
              disabled={isSubmitting}
              onChange={(event) => setBackgroundColor(event.target.value)}
              type="color"
              value={backgroundColor}
            />
            <output htmlFor="qr-background">{backgroundColor}</output>
          </div>
        </fieldset>

        <QrCodeStylePicker value={qrStyle} onChange={setQrStyle} disabled={isSubmitting} />

        <div className="qr-field">
          <label htmlFor="qr-logo">Logo (opcional)</label>
          <input
            accept="image/png,image/jpeg"
            disabled={isSubmitting}
            id="qr-logo"
            onChange={(event) => void handleLogoChange(event)}
            type="file"
          />
          <span className="qr-field-hint">
            PNG ou JPEG, até 256 KB. Usado na prévia e no envio solicitado; não é armazenado.
          </span>
        </div>
      </section>

      <section aria-label="Prévia e exportação do QR Code" className="qr-preview-card">
        <span className="qr-preview-label">PRÉVIA EM TEMPO REAL</span>
        <canvas
          aria-label="Prévia do QR Code"
          className="qr-preview-canvas"
          height={360}
          ref={canvasRef}
          role="img"
          width={360}
        />
        <p className="qr-preview-hint">Os três marcadores de leitura e a margem branca são preservados. Faça um teste de leitura antes de imprimir.</p>
        {downloadsUnlocked ? (
          <>
            <p aria-live="polite" className="qr-success" role="status">
              QR Code enviado para {email.trim()}. Os downloads locais estão liberados.
            </p>
            <div className="qr-download-actions">
              <button className="button button-dark" onClick={() => void handleDownloadPng()} type="button">
                Baixar PNG <span aria-hidden="true">↓</span>
              </button>
              <button className="qr-secondary-button" onClick={() => void handleDownloadSvg()} type="button">
                Baixar SVG
              </button>
            </div>
          </>
        ) : (
          <p aria-live="polite" className="qr-delivery-notice" role="status">
            Informe seu e-mail e confirme a entrega para liberar os downloads locais.
          </p>
        )}
        {previewError && <p aria-live="polite" className="qr-error" role="alert">{previewError}</p>}
      </section>

      <section aria-labelledby="qr-email-heading" className="qr-email-card">
        <span className="qr-preview-label">ENTREGA POR E-MAIL</span>
        <h2 id="qr-email-heading">Informe seu e-mail para receber e baixar o QR Code.</h2>
        {emailDeliveryEnabled ? (
          downloadsUnlocked ? (
            <>
              <p aria-live="polite" className="qr-success" role="status">
                Enviado para {email.trim()}. Agora você pode baixar o PNG ou SVG na prévia acima.
              </p>
              {emailStorageError && (
                <p aria-live="polite" className="qr-delivery-notice" role="status">{emailStorageError}</p>
              )}
            </>
          ) : (
            <form className="qr-email-form" onSubmit={(event) => void handleEmailDelivery(event)}>
              <label htmlFor="qr-email">Seu e-mail</label>
              <input
                autoComplete="email"
                disabled={isSubmitting}
                id="qr-email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
                type="email"
                value={email}
              />
              <span className="qr-field-hint">
                Depois do primeiro envio confirmado, este navegador poderá lembrar seu e-mail para próximos pedidos.
              </span>
              {email && (
                <button className="qr-secondary-button" onClick={forgetRememberedEmail} type="button">
                  Esquecer e-mail neste navegador
                </button>
              )}
              {emailStorageError && (
                <p aria-live="polite" className="qr-delivery-notice" role="status">{emailStorageError}</p>
              )}
              <label className="qr-email-consent">
                <input
                  checked={consented}
                  disabled={isSubmitting}
                  onChange={(event) => setConsented(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  Autorizo o uso do meu e-mail para registrar este pedido e enviar o QR Code solicitado.
                  Isso não me inscreve em campanhas.
                </span>
              </label>
              <button className="button button-dark" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Enviando..." : "Enviar e liberar downloads"} <span aria-hidden="true">↗</span>
              </button>
              {formError && <p aria-live="polite" className="qr-error" role="alert">{formError}</p>}
              <p className="qr-privacy">
                Depois do envio confirmado, você poderá baixar o PNG ou SVG aqui. Seu e-mail não será inscrito em campanhas.
                A autorização é solicitada a cada pedido.
                Consulte a <Link href="/privacidade">política de privacidade</Link>.
              </p>
            </form>
          )
        ) : (
          <p aria-live="polite" className="qr-delivery-notice" role="status">
            O envio por e-mail e os downloads estão temporariamente indisponíveis. Tente novamente mais tarde.
          </p>
        )}
      </section>
    </div>
  );
}
