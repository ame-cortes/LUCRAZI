"use client";

import { getToken } from "firebase/app-check";
import { useEffect, useState, type FormEvent } from "react";
import { getFirebaseAppCheck } from "@/lib/firebase";

type EbookSignupFormProps = {
  campaignsEnabled: boolean;
  privacyUrl: string;
  signupEnabled: boolean;
};

export function EbookSignupForm({
  campaignsEnabled,
  privacyUrl,
  signupEnabled,
}: EbookSignupFormProps) {
  const [email, setEmail] = useState("");
  const [ebookConsented, setEbookConsented] = useState(false);
  const [marketingConsented, setMarketingConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [marketingNotice, setMarketingNotice] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => () => {
    if (downloadUrl) window.URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const appCheck = await getFirebaseAppCheck();
      const { token } = await getToken(appCheck);
      const response = await fetch("/api/ebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-AppCheck": token,
        },
        body: JSON.stringify({
          email,
          consent: ebookConsented,
          marketingConsent: marketingConsented,
        }),
      });

      if (!response.ok) {
        let message = "Não foi possível liberar o e-book. Tente novamente.";
        try {
          const result: unknown = await response.json();
          if (
            typeof result === "object"
            && result !== null
            && "error" in result
            && typeof result.error === "string"
          ) {
            message = result.error;
          }
        } catch {
          // Keep the generic message when the server does not return JSON.
        }
        throw new Error(message);
      }

      if (!response.headers.get("content-type")?.startsWith("application/pdf")) {
        throw new Error("A resposta do servidor não contém um arquivo PDF válido.");
      }

      const marketingStatus = response.headers.get("X-Lucrazi-Marketing-Status");
      if (marketingStatus === "subscribed") {
        setMarketingNotice("Pronto! Seu e-mail também foi inscrito para receber novidades e campanhas do Lucrazi. Você pode cancelar quando quiser.");
      } else if (marketingStatus === "already-subscribed") {
        setMarketingNotice("Seu e-mail já estava inscrito para receber novidades e campanhas do Lucrazi.");
      } else if (marketingStatus === "unavailable" || marketingStatus === "failed") {
        setMarketingNotice("O PDF está liberado, mas não foi possível confirmar sua inscrição nas campanhas. Seu pedido e autorização ficaram registrados; entre em contato para verificarmos.");
      } else {
        setMarketingNotice("");
      }

      const pdf = await response.blob();
      setDownloadUrl(window.URL.createObjectURL(pdf));
      setEmail("");
      setEbookConsented(false);
      setMarketingConsented(false);
      setIsComplete(true);
    } catch (submissionError) {
      console.error("Não foi possível registrar o pedido do e-book.", submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível liberar o e-book. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="ebook-form-card" id="baixar-ebook">
      {isComplete ? (
        <div aria-live="polite" className="ebook-success" role="status">
          <span aria-hidden="true" className="ebook-success-icon">✓</span>
          <div>
            <strong>Pronto. Seu e-book está liberado.</strong>
            <p>Obrigado! Clique para baixar o PDF no seu dispositivo.</p>
            {marketingNotice && <p aria-live="polite" className="ebook-marketing-notice" role="status">{marketingNotice}</p>}
            <a
              className="ebook-submit"
              download="como-faturar-seus-primeiros-1000-na-internet.pdf"
              href={downloadUrl}
            >
              Baixar meu e-book <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="ebook-form-heading">
            <span className="ebook-form-step">ACESSO GRATUITO</span>
            <h2>Receba o seu e-book</h2>
            <p>Informe seu e-mail para liberar o download do PDF.</p>
          </div>
          {signupEnabled ? (
            <form className="ebook-form" onSubmit={handleSubmit}>
              <label htmlFor="ebook-email">Seu melhor e-mail</label>
              <input
                autoComplete="email"
                disabled={isSubmitting}
                id="ebook-email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                required
                type="email"
                value={email}
              />
              <label className="ebook-consent">
                <input
                  checked={ebookConsented}
                  disabled={isSubmitting}
                  onChange={(event) => setEbookConsented(event.target.checked)}
                  required
                  type="checkbox"
                />
                <span>
                  Autorizo o uso do meu e-mail para registrar este pedido e liberar o e-book.
                  Essa autorização é necessária para receber o material.
                </span>
              </label>
              {campaignsEnabled && (
                <label className="ebook-consent ebook-campaign-consent">
                  <input
                    checked={marketingConsented}
                    disabled={isSubmitting}
                    onChange={(event) => setMarketingConsented(event.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Quero receber por e-mail guias, novidades e campanhas editoriais do Lucrazi.
                    Essa autorização é opcional e posso cancelar a qualquer momento.
                  </span>
                </label>
              )}
              <button className="ebook-submit" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Liberando seu e-book..." : "Quero baixar meu e-book"}
                {!isSubmitting && <span aria-hidden="true">↗</span>}
              </button>
              {error && <p aria-live="polite" className="ebook-form-error" role="alert">{error}</p>}
              <p className="ebook-privacy">
                {campaignsEnabled
                  ? marketingConsented
                    ? "Sua autorização para campanhas fica registrada separadamente do pedido do e-book."
                    : "Sem a autorização opcional, seu e-mail é usado somente para este pedido."
                  : "Seu e-mail é usado somente para este pedido."}{" "}
                <a href={privacyUrl}>Saiba mais na política de privacidade.</a>
              </p>
            </form>
          ) : (
            <p className="ebook-form-unavailable" role="status">
              A liberação do e-book está sendo configurada. Volte em breve.
            </p>
          )}
        </>
      )}
    </div>
  );
}
