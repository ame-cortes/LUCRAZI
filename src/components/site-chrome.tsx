import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="wordmark" href="/" aria-label="Lucrazi, página inicial">
          lucr<span>a</span>zi<span className="wordmark-dot">.</span>
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <Link href="/#ultimos-artigos">Artigos</Link>
          <Link href="/sobre">Sobre</Link>
        </nav>
        <Link className="header-cta" href="/#ultimos-artigos">
          Descobrir ideias <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
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
          <Link href="/#ultimos-artigos">Artigos</Link>
          <Link href="/sobre">Sobre o Lucrazi</Link>
        </div>
        <div className="footer-links">
          <span>TRANSPARÊNCIA</span>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/contato">Fale com a redação</Link>
          {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
        </div>
      </div>
      <div className="wrap footer-bottom">
        <span>© Lucrazi. Todos os direitos reservados.</span>
        <span>Conteúdo informativo. Resultados financeiros variam.</span>
      </div>
    </footer>
  );
}
