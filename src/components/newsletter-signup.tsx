"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [consented, setConsented] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const appCheckConfigured = Boolean(
    process.env.NEXT_PUBLIC_NEWSLETTER_SIGNUP_ENABLED === "true"
    && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!consented) {
      setMessage("Marque a autorização para receber atualizações por e-mail.");
      return;
    }

    setIsSubmitting(true);
    try {
      const [{ getFirebaseAppCheck }, { getToken }] = await Promise.all([
        import("@/lib/firebase"),
        import("firebase/app-check"),
      ]);
      const appCheck = await getFirebaseAppCheck();
      const { token } = await getToken(appCheck);
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Firebase-AppCheck": token,
        },
        body: JSON.stringify({ email, consent: consented }),
      });
      const result: unknown = await response.json();
      if (response.status === 409) {
        setMessage("Este e-mail já está cadastrado na lista de novidades.");
        return;
      }
      if (!response.ok) {
        throw new Error(`A inscrição foi recusada pelo servidor (HTTP ${response.status}).`);
      }
      setEmail("");
      setConsented(false);
      if (
        typeof result === "object"
        && result !== null
        && "welcomeSent" in result
        && result.welcomeSent === true
      ) {
        setMessage("Inscrição concluída! Enviamos uma mensagem de boas-vindas para o seu e-mail.");
      } else if (
        typeof result === "object"
        && result !== null
        && "emailConfigured" in result
        && result.emailConfigured === true
      ) {
        setMessage("Inscrição concluída, mas não conseguimos enviar as boas-vindas agora. Tente novamente mais tarde ou fale com a redação.");
      } else {
        setMessage("Inscrição concluída. O envio de e-mails está sendo configurado e as boas-vindas ainda não puderam ser enviadas.");
      }
    } catch (error) {
      console.error("Não foi possível registrar a inscrição da newsletter.", error);
      setMessage("Não foi possível concluir a inscrição. Tente novamente mais tarde ou fale com a redação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="newsletter-section wrap" aria-labelledby="newsletter-title">
      <div className="newsletter-mark" aria-hidden="true">L.</div>
      <div className="newsletter-copy">
        <span className="eyebrow">IDEIAS PARA QUEM ESTÁ COMEÇANDO</span>
        <h2 id="newsletter-title">Receba novidades do Lucrazi.</h2>
        <p>Deixe seu e-mail para receber novos guias e ideias práticas. Sem promessas de ganhos.</p>
      </div>
      <form className="newsletter-form" onSubmit={handleSubmit}>
        {!appCheckConfigured ? (
          <p role="status">
            Inscrições temporariamente indisponíveis enquanto a proteção do formulário é configurada.
          </p>
        ) : (
          <>
            <label className="visually-hidden" htmlFor="newsletter-email">Seu e-mail</label>
            <div className="newsletter-input-row">
              <input
                autoComplete="email"
                disabled={isSubmitting}
                id="newsletter-email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Seu melhor e-mail"
                required
                type="email"
                value={email}
              />
              <button className="button button-dark" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Enviando..." : "Quero receber"}
              </button>
            </div>
            <label className="newsletter-consent">
              <input
                checked={consented}
                disabled={isSubmitting}
                onChange={(event) => setConsented(event.target.checked)}
                required
                type="checkbox"
              />
              <span>
                Aceito receber novidades por e-mail. Posso cancelar pelo link em cada mensagem ou pelo{" "}
                <Link href="/contato">canal de contato</Link>.
              </span>
            </label>
            <p className="newsletter-privacy">
              Saiba como os dados são tratados na <Link href="/privacidade">política de privacidade</Link>.
            </p>
          </>
        )}
        {message && <p aria-live="polite" className="newsletter-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
