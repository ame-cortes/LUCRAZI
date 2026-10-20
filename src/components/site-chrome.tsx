import Link from "next/link";
import { qrCodeUrl } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <>
      <a className="skip-link" href="#main-content">Pular para o conteúdo principal</a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link className="wordmark" href="/" aria-label="Lucrazi, página inicial">
            lucr<span>a</span>zi<span className="wordmark-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Navegação principal">
            <Link href="/artigos">Guias</Link>
            <Link href={qrCodeUrl.pathname}>QR Code</Link>
            <Link href="/sobre">Sobre</Link>
          </nav>
          <Link className="header-cta" href="/#guias-iniciais">
            Começar <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <footer className="site-footer">
      <div className="wrap footer-main">
        <div className="footer-brand">
          <Link className="wordmark wordmark-light" href="/">
            lucr<span>a</span>zi<span className="wordmark-dot">.</span>
          </Link>
          <p>Ideias e informação para construir suas possibilidades.</p>
        </div>
        <div className="footer-links">
          <span>EXPLORE</span>
          <Link href="/artigos">Todos os guias</Link>
          <Link href={qrCodeUrl.pathname}>Gerador de QR Code</Link>
          <Link href="/#guias-iniciais">Destaques</Link>
          <Link href="/about">Sobre o Lucrazi</Link>
        </div>
        <div className="footer-links">
          <span>TRANSPARÊNCIA</span>
          <Link href="/privacy">Privacidade</Link>
          <Link href="/terms">Termos de uso</Link>
          <Link href="/contact">Fale com a redação</Link>
          {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© 2026 Lucrazi. Operado por Mateus Ferreira.</span>
        <span>Conteúdo informativo. Resultados financeiros variam.</span>
      </div>
    </footer>
  );
}
