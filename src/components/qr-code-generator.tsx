"use client";

import { getToken } from "firebase/app-check";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { type SocialIconId } from "@/lib/social-icons";
import { renderSocialIconDataUrl, socialIconOptions } from "@/lib/qr-code-social-icons";
import { getFirebaseAppCheck } from "@/lib/firebase";
import QrCodeStylePicker from "@/components/qr-code-style-picker";
import {
  createQrCodeSvg,
  isQrCodeContentTooLongError,
  renderQrCodeCanvas,
  validateQrCodeContent,
  type QrCodeEyeStyle,
  type QrCodeStyle,
} from "@/lib/qr-code-styling";
import { isQrCodeStylingShape } from "@/lib/qr-code-styling-adapter";
import { createQrCodeStylingSvg } from "@/lib/qr-code-styling-client";

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const socialIconRequestRef = useRef(0);
  const [contentType, setContentType] = useState<"url" | "text">("url");
  const [content, setContent] = useState("https://www.lucrazi.com.br");
  const [foregroundColor, setForegroundColor] = useState("#243B2B");
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientEndColor, setGradientEndColor] = useState("#C8F169");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [qrStyle, setQrStyle] = useState<QrCodeStyle>("square");
  const [eyeFrameStyle, setEyeFrameStyle] = useState<QrCodeEyeStyle>("square");
  const [eyeBallStyle, setEyeBallStyle] = useState<QrCodeEyeStyle>("square");
  const [eyeFrameColor, setEyeFrameColor] = useState("#243B2B");
  const [eyeBallColor, setEyeBallColor] = useState("#243B2B");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [socialIcon, setSocialIcon] = useState<SocialIconId | "">("");
  const [socialIconColor, setSocialIconColor] = useState("#243B2B");
  const [renderingSocialIcon, setRenderingSocialIcon] = useState(false);
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
    gradientEnabled,
    gradientEndColor,
    backgroundColor,
    qrStyle,
    eyeFrameStyle,
    eyeBallStyle,
    eyeFrameColor,
    eyeBallColor,
    socialIcon,
    socialIconColor,
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
      ...(gradientEnabled ? { gradientEndColor } : {}),
      backgroundColor,
      style: qrStyle,
      eyeFrameStyle,
      eyeBallStyle,
      eyeFrameColor,
      eyeBallColor,
      logoDataUrl,
    }).catch((error: unknown) => {
      if (cancelled) return;
      if (isQrCodeContentTooLongError(error)) {
        setPreviewError(error instanceof Error ? error.message : "O conteúdo é longo demais para caber em um QR Code.");
        return;
      }
      console.error("Não foi possível gerar a prévia do QR Code.", error);
      setPreviewError("Não foi possível gerar a prévia. Confira o conteúdo informado.");
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, content, eyeBallColor, eyeBallStyle, eyeFrameColor, eyeFrameStyle, foregroundColor, gradientEnabled, gradientEndColor, logoDataUrl, qrStyle]);

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    setPreviewError("");
    const input = event.currentTarget;
    const file = input.files?.[0];
    const requestId = ++socialIconRequestRef.current;
    if (!file) {
      setSocialIcon("");
      setLogoDataUrl("");
      return;
    }

    if (file.size > 256 * 1024 || !["image/png", "image/jpeg"].includes(file.type)) {
      setLogoDataUrl("");
      setSocialIcon("");
      setRenderingSocialIcon(false);
      setPreviewError("Escolha um logo PNG ou JPEG de até 256 KB.");
      input.value = "";
      return;
    }
    setSocialIcon("");

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch (error) {
      if (requestId !== socialIconRequestRef.current) return;
      console.error("Não foi possível ler o arquivo do logo.", error);
      setPreviewError("Não foi possível ler o arquivo do logo. Tente novamente.");
      input.value = "";
      return;
    }
    if (requestId !== socialIconRequestRef.current) return;
    const isPng = bytes.length >= 8
      && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if ((file.type === "image/png" && !isPng) || (file.type === "image/jpeg" && !isJpeg)) {
      setLogoDataUrl("");
      setRenderingSocialIcon(false);
      setPreviewError("O arquivo não corresponde a uma imagem PNG ou JPEG válida.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== socialIconRequestRef.current) return;
      if (typeof reader.result !== "string") {
        setPreviewError("Não foi possível ler o arquivo do logo.");
        return;
      }
      const dataUrl = reader.result;
      const image = new Image();
      image.onload = () => {
        if (requestId !== socialIconRequestRef.current) return;
        if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
          setPreviewError("O logo precisa ter dimensões de até 2048 x 2048 pixels.");
          input.value = "";
          return;
        }
        setLogoDataUrl(dataUrl);
      };
      image.onerror = () => {
        if (requestId === socialIconRequestRef.current) {
          setPreviewError("O arquivo não contém uma imagem PNG ou JPEG válida.");
        }
      };
      image.src = dataUrl;
    };
    reader.onerror = () => {
      if (requestId === socialIconRequestRef.current) setPreviewError("Não foi possível ler o arquivo do logo.");
    };
    reader.readAsDataURL(file);
  }

  async function selectSocialIcon(iconId: SocialIconId | "") {
    socialIconRequestRef.current++;
    const requestId = socialIconRequestRef.current;
    setPreviewError("");
    setSocialIcon(iconId);
    setLogoDataUrl("");
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (!iconId) {
      setSocialIconColor(foregroundColor);
      setRenderingSocialIcon(false);
      return;
    }

    setSocialIconColor(foregroundColor);
    setRenderingSocialIcon(true);
    try {
      const dataUrl = await renderSocialIconDataUrl(iconId, foregroundColor);
      if (requestId === socialIconRequestRef.current) setLogoDataUrl(dataUrl);
    } catch (iconError) {
      if (requestId === socialIconRequestRef.current) {
        console.error("Não foi possível preparar o ícone social do QR Code.", iconError);
        setPreviewError(iconError instanceof Error ? iconError.message : "Não foi possível preparar o ícone social.");
      }
    } finally {
      if (requestId === socialIconRequestRef.current) setRenderingSocialIcon(false);
    }
  }

  async function handleSocialIconColorChange(event: ChangeEvent<HTMLInputElement>) {
    const color = event.currentTarget.value;
    setSocialIconColor(color);
    if (!socialIcon) return;
    const iconId = socialIcon;
    const requestId = ++socialIconRequestRef.current;
    setRenderingSocialIcon(true);
    try {
      const dataUrl = await renderSocialIconDataUrl(iconId, color);
      if (requestId === socialIconRequestRef.current) setLogoDataUrl(dataUrl);
    } catch (iconError) {
      if (requestId === socialIconRequestRef.current) {
        console.error("Não foi possível atualizar a cor do ícone social.", iconError);
        setPreviewError(iconError instanceof Error ? iconError.message : "Não foi possível atualizar a cor do ícone.");
      }
    } finally {
      if (requestId === socialIconRequestRef.current) setRenderingSocialIcon(false);
    }
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
      const options = {
        foregroundColor,
        ...(gradientEnabled ? { gradientEndColor } : {}),
        backgroundColor,
        style: qrStyle,
        eyeFrameStyle,
        eyeBallStyle,
        eyeFrameColor,
        eyeBallColor,
        logoDataUrl,
      };
      const svg = isQrCodeStylingShape(qrStyle)
        ? await createQrCodeStylingSvg(content.trim() || " ", qrStyle, options)
        : createQrCodeSvg(content.trim() || " ", options);
      downloadFile("qr-code-lucrazi.svg", svg, "image/svg+xml;charset=utf-8");
    } catch (error) {
      console.error("Não foi possível exportar o QR Code como SVG.", error);
      setPreviewError("Não foi possível baixar o SVG. Tente novamente.");
    }
  }

  async function handleEmailDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (renderingSocialIcon) {
      setFormError("Aguarde o ícone terminar de carregar antes de enviar.");
      return;
    }
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
    try {
      validateQrCodeContent(trimmedContent || " ");
    } catch (error) {
      if (isQrCodeContentTooLongError(error)) {
        setFormError(error instanceof Error ? error.message : "O conteúdo é longo demais para caber em um QR Code.");
        return;
      }
      console.error("Não foi possível validar o conteúdo do QR Code.", error);
      setFormError("Não foi possível validar o conteúdo. Confira o texto e tente novamente.");
      return;
    }

    setIsSubmitting(true);
    const submittedRequestKey = requestKey;
    try {
      // Gera SVG no cliente para suportar ícone/logo com estilos elegantes
      const options = {
        foregroundColor,
        ...(gradientEnabled ? { gradientEndColor } : {}),
        backgroundColor,
        style: qrStyle,
        eyeFrameStyle,
        eyeBallStyle,
        eyeFrameColor,
        eyeBallColor,
        logoDataUrl: logoDataUrl || undefined,
      };
      const svg = isQrCodeStylingShape(qrStyle)
        ? await createQrCodeStylingSvg(trimmedContent || " ", qrStyle, options)
        : createQrCodeSvg(trimmedContent || " ", options);
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
          ...(gradientEnabled ? { gradientEndColor } : {}),
          backgroundColor,
          qrStyle,
          eyeFrameStyle,
          eyeBallStyle,
          eyeFrameColor,
          eyeBallColor,
          ...(logoDataUrl ? { logoDataUrl } : {}),
          consent: consented,
          svg,
        }),
      });

      const responseText = await response.text();
      let result: unknown = null;
      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText) as unknown;
        } catch {
          console.error("A API de entrega do QR Code retornou uma resposta que não é JSON.", {
            status: response.status,
            contentType: response.headers.get("content-type"),
          });
        }
      }
      if (!response.ok) {
        const errorMessage = typeof result === "object"
          && result !== null
          && "error" in result
          && typeof result.error === "string"
          ? result.error
          : `O servidor não conseguiu confirmar o envio (HTTP ${response.status}). Tente novamente mais tarde.`;
        throw new Error(errorMessage);
      }
      if (
        typeof result !== "object"
        || result === null
        || !("status" in result)
        || result.status !== "sent"
      ) {
        throw new Error("O servidor não confirmou o envio. Verifique sua caixa de entrada antes de tentar novamente.");
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
          <label className="qr-gradient-option" htmlFor="qr-gradient-enabled">
            <input
              checked={gradientEnabled}
              disabled={isSubmitting}
              id="qr-gradient-enabled"
              onChange={(event) => setGradientEnabled(event.target.checked)}
              type="checkbox"
            />
            Aplicar degradê
          </label>
          {gradientEnabled && (
            <div className="qr-color-row">
              <label htmlFor="qr-gradient-end">Cor final</label>
              <input
                disabled={isSubmitting}
                id="qr-gradient-end"
                onChange={(event) => setGradientEndColor(event.target.value)}
                type="color"
                value={gradientEndColor}
              />
              <output htmlFor="qr-gradient-end">{gradientEndColor}</output>
            </div>
          )}
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

        <QrCodeStylePicker
          value={qrStyle}
          eyeFrameStyle={eyeFrameStyle}
          eyeBallStyle={eyeBallStyle}
          eyeFrameColor={eyeFrameColor}
          eyeBallColor={eyeBallColor}
          onChange={setQrStyle}
          onEyeFrameStyleChange={setEyeFrameStyle}
          onEyeBallStyleChange={setEyeBallStyle}
          onEyeFrameColorChange={setEyeFrameColor}
          onEyeBallColorChange={setEyeBallColor}
          disabled={isSubmitting}
        />

        <div className="qr-field">
          <span className="qr-field-label">Ícone de rede social no centro (grátis)</span>
          <div className="qr-social-icons" role="group" aria-label="Escolher ícone de rede social">
            <button
              aria-pressed={socialIcon === ""}
              className="qr-social-icon-option qr-social-icon-none"
              disabled={isSubmitting || renderingSocialIcon}
              onClick={() => void selectSocialIcon("")}
              type="button"
            >
              <span aria-hidden="true">×</span>
              Sem ícone
            </button>
            {socialIconOptions.map(({ id, label, Icon }) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={socialIcon === id}
                className="qr-social-icon-option"
                disabled={isSubmitting || renderingSocialIcon}
                onClick={() => void selectSocialIcon(id)}
                title={label}
                type="button"
              >
                <Icon aria-hidden="true" color={socialIcon === id ? socialIconColor : foregroundColor} size={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          {socialIcon && (
            <div className="qr-color-row qr-social-icon-color">
              <label htmlFor="qr-public-social-icon-color">Cor do ícone</label>
              <input
                id="qr-public-social-icon-color"
                type="color"
                value={socialIconColor}
                disabled={isSubmitting || renderingSocialIcon}
                onChange={(event) => void handleSocialIconColorChange(event)}
              />
              <output htmlFor="qr-public-social-icon-color">{socialIconColor}</output>
            </div>
          )}
          <span className="qr-field-hint">
            Escolha um ícone para aparecer no QR Code estático, sem precisar de plano de métricas.
            {renderingSocialIcon ? " Preparando ícone…" : ""}
          </span>
        </div>

        <div className="qr-field">
          <label htmlFor="qr-logo">Logo (opcional)</label>
          <input
            accept="image/png,image/jpeg"
            disabled={isSubmitting}
            id="qr-logo"
            ref={logoInputRef}
            onChange={(event) => void handleLogoChange(event)}
            type="file"
          />
          <span className="qr-field-hint">
            PNG ou JPEG, até 256 KB. Selecione um logo próprio para substituir o ícone social. Usado na prévia e no envio solicitado; não é armazenado.
          </span>
        </div>
      </section>

      <section aria-label="Prévia e exportação do QR Code" className="qr-preview-card">
        <span className="qr-preview-label">PRÉVIA EM TEMPO REAL</span>
        <canvas
          aria-label="Prévia do QR Code"
          className="qr-preview-canvas"
          height={720}
          ref={canvasRef}
          role="img"
          width={720}
        />
        <p className="qr-preview-hint">A estrutura dos marcadores de leitura e a margem branca são preservadas. Teste a leitura antes de imprimir.</p>
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
              <button className="button button-dark" disabled={isSubmitting || renderingSocialIcon} type="submit">
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

      <section aria-label="Exemplos de estilos de QR Code" className="qr-examples">
        <h3>Exemplos de estilos disponíveis</h3>
        <div className="qr-examples-grid">
          <div className="qr-example-card">
            <img
              alt="Exemplo de QR Code com gradiente e estilo elegante"
              src="/images/qr-exemplo-1.png"
              width={280}
              height={280}
            />
            <p>Elegante com gradiente</p>
          </div>
          <div className="qr-example-card">
            <img
              alt="Exemplo de QR Code com pontos e estilo clássico"
              src="/images/qr-exemplo-2.png"
              width={280}
              height={280}
            />
            <p>Pontos e logo central</p>
          </div>
          <div className="qr-example-card">
            <img
              alt="Exemplo de QR Code com padrão quadrado"
              src="/images/qr-exemplo-3.png"
              width={280}
              height={280}
            />
            <p>Clássico com ícone</p>
          </div>
          <div className="qr-example-card">
            <img
              alt="Exemplo de QR Code com estilo elegante vermelho"
              src="/images/qr-exemplo-4.png"
              width={280}
              height={280}
            />
            <p>Elegante vermelho</p>
          </div>
        </div>
      </section>
    </div>
  );
}
