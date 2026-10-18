"use client";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  articles as starterArticles,
  deleteManagedArticle,
  loadManagedArticles,
  defaultFeaturedArticleSlugs,
  maxFeaturedArticles,
  type ArticleActionCta,
  type ArticleStatus,
  type ManagedArticle,
} from "@/lib/articles";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { articleToMarkdown } from "@/lib/article-markdown";
import { getArticleDescription } from "@/lib/article-description";
import NewsletterManager from "@/components/newsletter-manager";

type EditorArticle = ManagedArticle;

const MarkdownEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <div className="admin-markdown-loading">Carregando editor…</div>,
});

function newArticle(): EditorArticle {
  const image = starterArticles[0];
  return {
    slug: "",
    category: "",
    title: "",
    description: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    author: "Redação Lucrazi",
    accent: "mint",
    intro: "",
    contentMarkdown: "",
    sections: [],
    takeaway: "",
    imageSrc: image.imageSrc,
    imageAlt: image.imageAlt,
    imageCreditUrl: image.imageCreditUrl,
    status: "draft",
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function hasActionCtaContent(actionCta?: ArticleActionCta) {
  return !!actionCta && Object.values(actionCta).some((field) => field.trim().length > 0);
}

function validateArticle(article: EditorArticle): string | null {
  if (!article.title.trim()) return "Informe o título.";
  if (!isValidSlug(article.slug)) return "Use um slug com letras minúsculas, números e hífens.";
  if (!article.category.trim()) return "Informe a categoria.";
  if (!article.description.trim()) return "Informe a descrição para busca e compartilhamento.";
  if (article.contentMarkdown !== undefined) {
    if (!article.contentMarkdown.trim()) return "Escreva o conteúdo completo do artigo.";
  } else {
    if (!article.intro.trim() || !article.takeaway.trim()) return "Preencha a introdução e o resumo final.";
    if (!article.sections.length || article.sections.some((section) =>
      !section.heading.trim()
      || (!section.paragraphs.some((paragraph) => paragraph.trim())
        && !(section.bullets ?? []).some((bullet) => bullet.trim())),
    )) return "Cada seção precisa de título e ao menos um parágrafo.";
  }
  const actionCta = hasActionCtaContent(article.actionCta) ? article.actionCta : undefined;
  if (actionCta && (
    !actionCta.title.trim()
    || !actionCta.description.trim()
    || !actionCta.buttonLabel.trim()
    || !actionCta.url.trim()
  )) return "Preencha título, texto, rótulo do botão e link da chamada para ação, ou deixe todos vazios.";
  if (actionCta && !(
    (actionCta.url.startsWith("/") && !actionCta.url.startsWith("//"))
    || (URL.canParse(actionCta.url) && new URL(actionCta.url).protocol === "https:")
  )) return "O link da chamada para ação precisa ser um caminho interno ou uma URL HTTPS.";
  const articleBlocks = [
    article.title,
    article.description,
    ...(actionCta ? [actionCta.title, actionCta.description, actionCta.buttonLabel] : []),
    ...(article.contentMarkdown !== undefined
      ? [article.contentMarkdown]
      : [
        article.intro,
        article.takeaway,
        ...article.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
          ...(section.bullets ?? []),
          section.note ?? "",
        ]),
      ]),
  ];
  if (articleBlocks.some((block) => /\bR\s+\d/iu.test(block))) {
    return "Revise valores em reais: use o símbolo R$ antes do valor e confirme dados financeiros ou tributários em fontes oficiais antes de publicar.";
  }
  if (articleBlocks.some((block) => (block.match(/\bteto de faturamento\b/giu) ?? []).length > 1)) {
    return "Revise o artigo: a expressão “teto de faturamento” aparece repetida. Remova a duplicação e confirme qualquer valor em fonte oficial.";
  }
  if (!article.imageAlt.trim() || !article.imageCreditUrl.trim()) return "Preencha o texto alternativo e a fonte da imagem.";
  if (getArticleDescription(article.description, article.imageAlt, article.imageCreditUrl) !== article.description.trim()) {
    return "Mantenha o texto alternativo e o crédito nos campos próprios da imagem, não na descrição do artigo.";
  }
  if (!URL.canParse(article.imageCreditUrl) || new URL(article.imageCreditUrl).protocol !== "https:") {
    return "O crédito da imagem precisa ser um link HTTPS.";
  }
  if (
    !article.imageSrc.startsWith("/images/")
    && (!URL.canParse(article.imageSrc) || new URL(article.imageSrc).protocol !== "https:")
  ) return "A imagem precisa ser um arquivo do site ou uma URL HTTPS.";
  if (Number.isNaN(Date.parse(`${article.publishedAt}T00:00:00Z`))) return "Informe uma data válida.";
  return null;
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    const messages: Record<string, string> = {
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/invalid-email": "O formato do e-mail não é válido.",
      "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
      "auth/email-already-in-use": "Esse e-mail já tem uma conta Firebase.",
      "auth/weak-password": "Use uma senha com pelo menos seis caracteres.",
      "auth/operation-not-allowed": "Ative o método E-mail/senha no Firebase Authentication.",
      "permission-denied": "Acesso negado. Confirme se o Firestore está criado, se publicou firestore.rules e se o UID está em admins com allowAdmin=true.",
      "unavailable": "O Firebase está indisponível no momento. Tente novamente.",
    };
    return messages[error.code] ?? `Falha ao acessar o Firebase (${error.code}).`;
  }
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(() => isFirebaseConfigured());
  const [articles, setArticles] = useState<ManagedArticle[]>([]);
  const [featuredSlugs, setFeaturedSlugs] = useState<string[]>(defaultFeaturedArticleSlugs);
  const [savedFeaturedSlugs, setSavedFeaturedSlugs] = useState<string[]>(defaultFeaturedArticleSlugs);
  const [selected, setSelected] = useState<EditorArticle | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ArticleStatus>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"articles" | "newsletter">("articles");

  const refreshArticles = useCallback(async () => {
    const [loadedArticles, featuredSettings] = await Promise.all([
      loadManagedArticles(),
      getDoc(doc(getFirebaseDb(), "siteSettings", "homepage")),
    ]);
    setArticles(loadedArticles);
    const publishedSlugs = new Set(loadedArticles
      .filter((article) => article.status === "published")
      .map((article) => article.slug));
    const storedFeaturedSlugs = featuredSettings.exists()
      ? featuredSettings.data().featuredSlugs
      : defaultFeaturedArticleSlugs;
    if (
      !Array.isArray(storedFeaturedSlugs)
      || storedFeaturedSlugs.length > maxFeaturedArticles
      || !storedFeaturedSlugs.every((slug) => typeof slug === "string")
      || new Set(storedFeaturedSlugs).size !== storedFeaturedSlugs.length
    ) {
      throw new Error("A configuração de artigos em destaque está inválida no Firestore.");
    }
    const nextFeaturedSlugs = storedFeaturedSlugs.filter((slug): slug is string =>
      typeof slug === "string" && publishedSlugs.has(slug),
    );
    const featuredSlots = [
      ...nextFeaturedSlugs,
      ...Array(maxFeaturedArticles - nextFeaturedSlugs.length).fill(""),
    ];
    setFeaturedSlugs(featuredSlots);
    setSavedFeaturedSlugs(featuredSlots);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setIsAdmin(false);
      setCheckingAuth(false);
      if (!nextUser) return;
      void getDoc(doc(getFirebaseDb(), "admins", nextUser.uid))
        .then((adminDoc) => {
          if (!adminDoc.exists()) {
            setError(`Sua conta ainda não está autorizada. No Firestore, crie admins/${nextUser.uid} e defina allowAdmin como true.`);
            return signOut(getFirebaseAuth());
          }
          setIsAdmin(true);
          return refreshArticles();
        })
        .catch((authError: unknown) => setError(errorMessage(authError)));
    });
  }, [refreshArticles]);

  const filteredArticles = useMemo(() => articles.filter((article) => {
    const matchesStatus = filter === "all" || article.status === filter;
    const matchesSearch = `${article.title} ${article.slug}`.toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR"));
    return matchesStatus && matchesSearch;
  }), [articles, filter, search]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function saveFeaturedArticles() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setDoc(doc(getFirebaseDb(), "siteSettings", "homepage"), {
        featuredSlugs: featuredSlugs.filter((slug) => slug !== ""),
      });
      setSavedFeaturedSlugs(featuredSlugs);
      setNotice("Artigos da página inicial atualizados.");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function notifyIndexNow(slugs: string[]) {
    if (!slugs.length) return;

    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) throw new Error("Sua sessão expirou. Entre novamente.");
      const response = await fetch("/api/admin/indexnow", {
        method: "POST",
        headers: {
          authorization: `Bearer ${await currentUser.getIdToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ slugs }),
        cache: "no-store",
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = typeof body === "object" && body !== null && "error" in body
          && typeof body.error === "string"
          ? body.error
          : `Falha ao enviar URLs para IndexNow (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof body !== "object"
        || body === null
        || !("submitted" in body)
        || body.submitted !== true
        || !("urlCount" in body)
        || typeof body.urlCount !== "number"
      ) {
        throw new Error("O servidor retornou uma confirmação inválida do IndexNow.");
      }
      const urlCount = body.urlCount;
      setNotice((current) => `${current} ${urlCount} URLs avisadas ao IndexNow. A indexação depende do buscador.`);
    } catch (indexNowError) {
      console.error("O conteúdo foi salvo, mas a notificação IndexNow falhou.", indexNowError);
      setError(`O conteúdo foi salvo, mas não foi possível avisar o IndexNow: ${errorMessage(indexNowError)}`);
    }
  }

  async function saveArticle(article: EditorArticle, status: ArticleStatus) {
    const validationError = validateArticle(article);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const db = getFirebaseDb();
      const destination = doc(db, "articles", article.slug);
      const existing = articles.find((item) => item.slug === article.slug);
      if (existing && existing.slug !== selected?.slug) {
        setError("Esse slug já está em uso. Escolha outro para o novo artigo.");
        return;
      }
      const indexNowSlugs = new Set<string>();
      if (status === "published") indexNowSlugs.add(article.slug);
      if (
        selected?.status === "published"
        && (status !== "published" || selected.slug !== article.slug)
      ) {
        indexNowSlugs.add(selected.slug);
      }
      const content = articleWithoutStatus(article);
      const batch = writeBatch(db);
      if (selected?.slug && selected.slug !== article.slug) {
        batch.delete(doc(db, "articles", selected.slug));
        batch.set(doc(db, "deletedArticles", selected.slug), {
          slug: selected.slug,
          updatedAt: serverTimestamp(),
        });
      }
      if (status === "published") {
        batch.delete(doc(db, "deletedArticles", article.slug));
      } else {
        batch.set(doc(db, "deletedArticles", article.slug), {
          slug: article.slug,
          updatedAt: serverTimestamp(),
        });
      }
      batch.set(destination, {
        slug: article.slug,
        status,
        article: content,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setNotice(status === "published" ? "Artigo publicado." : "Rascunho salvo.");
      setSelected(null);
      await refreshArticles();
      await notifyIndexNow([...indexNowSlugs]);
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  }

  async function deleteArticle(article: ManagedArticle) {
    if (!window.confirm(`Excluir “${article.title}”? O artigo deixará de aparecer no site.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteManagedArticle(article);
      setSelected(null);
      setNotice("Artigo excluído. Apenas o marcador do slug é mantido, para não expor conteúdo e evitar que o guia original reapareça.");
      await refreshArticles();
      if (article.status === "published") await notifyIndexNow([article.slug]);
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  async function importStarterArticles() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const db = getFirebaseDb();
      const [existing, deleted] = await Promise.all([
        getDocs(collection(db, "articles")),
        getDocs(collection(db, "deletedArticles")),
      ]);
      const existingSlugs = new Set([
        ...existing.docs.map((item) => item.id),
        ...deleted.docs.map((item) => item.id),
      ]);
      const missing = starterArticles.filter((article) => !existingSlugs.has(article.slug));
      if (!missing.length) {
        setNotice("Os 50 guias iniciais já estão no Firestore.");
        return;
      }
      const batch = writeBatch(db);
      for (const article of missing) {
        batch.set(doc(db, "articles", article.slug), {
          slug: article.slug,
          status: "published",
          article,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      setNotice(`${missing.length} guias importados e publicados no Firestore.`);
      await refreshArticles();
      await notifyIndexNow(missing.map((article) => article.slug));
    } catch (importError) {
      setError(errorMessage(importError));
    } finally {
      setBusy(false);
    }
  }

  async function updatePublishedGuideContent() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const db = getFirebaseDb();
      const snapshot = await getDocs(collection(db, "articles"));
      const storedBySlug = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
      const updates = starterArticles.flatMap((article) => {
        const stored = storedBySlug.get(article.slug);
        if (!stored || stored.status !== "published") return [];
        const content = articleWithoutStatus({ ...article, status: "published" });
        if (stableJson(stored.article) === stableJson(content)) return [];
        return [{ article, content }];
      });

      if (!updates.length) {
        setNotice("Os artigos publicados já estão alinhados com as versões editoriais atuais.");
        return;
      }
      const confirmed = window.confirm(
        `Atualizar o conteúdo de ${updates.length} artigo(s) publicado(s) com as versões editoriais atuais? Rascunhos e artigos excluídos serão preservados.`,
      );
      if (!confirmed) return;

      const batch = writeBatch(db);
      for (const { article, content } of updates) {
        batch.set(doc(db, "articles", article.slug), {
          slug: article.slug,
          status: "published",
          article: content,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        batch.delete(doc(db, "deletedArticles", article.slug));
      }
      await batch.commit();
      setNotice(`Conteúdo de ${updates.length} artigo(s) publicado(s) atualizado.`);
      await refreshArticles();
      await notifyIndexNow(updates.map(({ article }) => article.slug));
    } catch (updateError) {
      setError(errorMessage(updateError));
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <Link className="wordmark" href="/">lucr<span>a</span>zi<span className="wordmark-dot">.</span></Link>
          <h1>Configure o Firebase</h1>
          <p>Adicione as variáveis Firebase ao arquivo <code>.env.local</code> e reinicie o servidor.</p>
          <Link className="admin-back-link" href="/">Voltar ao site</Link>
        </section>
      </main>
    );
  }

  if (checkingAuth) {
    return <main className="admin-shell"><p className="admin-loading">Verificando acesso…</p></main>;
  }

  if (!user || !isAdmin) {
    return (
      <main className="admin-shell">
        <section className="admin-login">
          <Link className="wordmark" href="/">lucr<span>a</span>zi<span className="wordmark-dot">.</span></Link>
          <span className="eyebrow">ÁREA RESTRITA</span>
          <h1>Entrar no painel</h1>
          <p>Apenas contas autorizadas no Firestore podem editar os artigos.</p>
          <form className="admin-form" onSubmit={handleAuth}>
            <label>
              E-mail
              <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Senha
              <input autoComplete="current-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="button button-dark" disabled={busy} type="submit">
              {busy ? "Aguarde…" : "Entrar"}
            </button>
          </form>
          {error && <p className="admin-message admin-error" role="alert">{error}</p>}
          {notice && <p className="admin-message" role="status">{notice}</p>}
          <div className="admin-auth-links">
            <p>Crie a conta no Firebase Console e libere o acesso seguindo as instruções do README.</p>
            <Link className="admin-back-link" href="/">Voltar ao site</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell admin-dashboard">
      <header className="admin-topbar">
        <Link className="wordmark" href="/">lucr<span>a</span>zi<span className="wordmark-dot">.</span></Link>
        <div><span>{user.email}</span><button type="button" onClick={() => void signOut(getFirebaseAuth())}>Sair</button></div>
      </header>
      <section className="admin-content">
        <nav className="admin-tabs" aria-label="Seções administrativas">
          <button
            aria-current={activeTab === "articles" ? "page" : undefined}
            className={activeTab === "articles" ? "active" : ""}
            onClick={() => setActiveTab("articles")}
            type="button"
          >Artigos</button>
          <button
            aria-current={activeTab === "newsletter" ? "page" : undefined}
            className={activeTab === "newsletter" ? "active" : ""}
            onClick={() => setActiveTab("newsletter")}
            type="button"
          >E-mails</button>
        </nav>
        {activeTab === "newsletter" ? (
          <NewsletterManager
            articles={articles
              .filter((article) => article.status === "published")
              .map(({ slug, title, description }) => ({ slug, title, description }))}
          />
        ) : (
          <>
            <div className="admin-heading">
              <div><span className="eyebrow">CONTEÚDO LUCRAZI</span><h1>Artigos</h1><p>Gerencie rascunhos e publicações do blog.</p></div>
              <div className="admin-heading-actions">
                <button className="admin-secondary-button" disabled={busy} onClick={() => void importStarterArticles()} type="button">Importar os 50 guias</button>
                <button className="admin-secondary-button" disabled={busy} onClick={() => void updatePublishedGuideContent()} type="button">Atualizar conteúdo dos publicados</button>
                <button className="button button-dark" onClick={() => { setSelected(newArticle()); setError(""); }} type="button">Novo artigo <span aria-hidden="true">+</span></button>
              </div>
            </div>
            {error && <p className="admin-message admin-error" role="alert">{error}</p>}
            {notice && <p className="admin-message" role="status">{notice}</p>}
            <div className="admin-toolbar">
              <label className="admin-search">Buscar<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título ou slug" /></label>
              <label>Estado<select value={filter} onChange={(event) => setFilter(event.target.value as "all" | ArticleStatus)}><option value="all">Todos</option><option value="published">Publicados</option><option value="draft">Rascunhos</option><option value="deleted">Excluídos</option></select></label>
              <span>{filteredArticles.length} artigos</span>
            </div>
            <section className="admin-featured-manager" aria-labelledby="admin-featured-title">
              <div>
                <h2 id="admin-featured-title">Artigos da página inicial</h2>
                <p>Escolha até seis artigos publicados e defina a ordem em que aparecem na página inicial.</p>
              </div>
              <div className="admin-featured-slots">
                {Array.from({ length: maxFeaturedArticles }, (_, slot) => (
                  <label key={slot}>
                    Artigo {slot + 1}
                    <select
                      disabled={busy}
                      onChange={(event) => {
                        const slug = event.target.value;
                        setFeaturedSlugs((current) => {
                          const next = [...current];
                          next[slot] = slug;
                          return next;
                        });
                      }}
                      value={featuredSlugs[slot] ?? ""}
                    >
                      <option value="">Nenhum</option>
                      {articles
                        .filter((article) => article.status === "published")
                        .filter((article) => article.slug === featuredSlugs[slot]
                          || !featuredSlugs.includes(article.slug))
                        .map((article) => (
                          <option key={article.slug} value={article.slug}>{article.title}</option>
                        ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                className="admin-secondary-button"
                disabled={busy || stableJson(featuredSlugs) === stableJson(savedFeaturedSlugs)}
                onClick={() => void saveFeaturedArticles()}
                type="button"
              >
                {busy ? "Salvando…" : "Salvar seleção"}
              </button>
            </section>
            <div className="admin-list">
              {filteredArticles.map((article) => (
                <article className="admin-article-row" key={article.slug}>
                  <div><span className={`admin-status status-${article.status}`}>{statusLabel(article.status)}</span><h2>{article.title}</h2><p>/{article.slug}</p></div>
                  <div className="admin-row-actions">
                    <button type="button" onClick={() => { setSelected(article); setError(""); }}>{article.status === "deleted" ? "Editar/restaurar" : "Editar"}</button>
                    {article.status !== "deleted" && <button className="admin-delete-button" disabled={busy} onClick={() => void deleteArticle(article)} type="button">Excluir</button>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      {selected && (
        <ArticleEditor
          article={selected}
          busy={busy}
          error={error}
          onClose={() => setSelected(null)}
          onSave={(article, status) => void saveArticle(article, status)}
        />
      )}
    </main>
  );
}

function articleWithoutStatus(article: ManagedArticle): Omit<ManagedArticle, "status"> {
  return {
    slug: article.slug,
    category: article.category,
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    author: article.author,
    accent: article.accent,
    intro: article.intro,
    ...(article.contentMarkdown !== undefined ? { contentMarkdown: article.contentMarkdown } : {}),
    sections: article.sections,
    takeaway: article.takeaway,
    imageSrc: article.imageSrc,
    imageAlt: article.imageAlt,
    imageCreditUrl: article.imageCreditUrl,
    ...(hasActionCtaContent(article.actionCta) ? { actionCta: article.actionCta } : {}),
  };
}

function statusLabel(status: ArticleStatus) {
  return status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Excluído";
}

function ArticleEditor({
  article,
  busy,
  error,
  onClose,
  onSave,
}: {
  article: EditorArticle;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (article: EditorArticle, status: ArticleStatus) => void;
}) {
  const [value, setValue] = useState(() => article.contentMarkdown !== undefined
    ? article
    : { ...article, contentMarkdown: articleToMarkdown(article) });
  const [slugTouched, setSlugTouched] = useState(Boolean(article.slug));
  const [coverUrl, setCoverUrl] = useState(() => article.imageSrc.startsWith("https://") ? article.imageSrc : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageNumber, setImageNumber] = useState("1");
  const imageFileInput = useRef<HTMLInputElement>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState("");
  const [imageError, setImageError] = useState("");
  const setField = <K extends keyof EditorArticle>(key: K, nextValue: EditorArticle[K]) => {
    setValue((current) => ({ ...current, [key]: nextValue }));
  };
  const setActionCtaField = <K extends keyof ArticleActionCta>(key: K, nextValue: ArticleActionCta[K]) => {
    setValue((current) => ({
      ...current,
      actionCta: {
        title: "",
        description: "",
        buttonLabel: "",
        url: "",
        ...current.actionCta,
        [key]: nextValue,
      },
    }));
  };
  const applyCoverUrl = () => {
    const imageSrc = coverUrl.trim();
    if (!URL.canParse(imageSrc) || new URL(imageSrc).protocol !== "https:") {
      setImageError("Informe o link HTTPS direto da imagem.");
      setImageMessage("");
      return;
    }

    setImageError("");
    setImageMessage("");
    setLoadingImage(true);
    const image = new window.Image();
    image.onload = () => {
      setValue((current) => ({ ...current, imageSrc, imageCreditUrl: imageSrc }));
      setImageMessage("Imagem carregada. O link foi adicionado como crédito; você pode substituí-lo pelo link da página original da fonte.");
      setLoadingImage(false);
    };
    image.onerror = () => {
      setImageError("Não foi possível carregar a imagem. Use um link HTTPS direto para um arquivo de imagem acessível publicamente.");
      setLoadingImage(false);
    };
    image.src = imageSrc;
  };
  const uploadCoverImage = async () => {
    if (!imageFile) {
      setImageError("Selecione uma imagem para enviar.");
      setImageMessage("");
      return;
    }
    if (!/^[1-9]\d{0,2}$/.test(imageNumber)) {
      setImageError("Informe um número de imagem entre 1 e 999.");
      setImageMessage("");
      return;
    }

    const baseName = slugify(value.slug || value.title) || "imagem";
    const publicId = `${baseName}-${imageNumber}`;
    if (publicId.length > 200) {
      setImageError("O slug do artigo está longo demais para gerar o nome da imagem. Encurte o slug e tente novamente.");
      setImageMessage("");
      return;
    }
    setLoadingImage(true);
    setImageError("");
    setImageMessage("");
    try {
      const currentUser = getFirebaseAuth().currentUser;
      if (!currentUser) throw new Error("Sua sessão expirou. Entre novamente.");
      const formData = new FormData();
      formData.set("file", imageFile);
      formData.set("publicId", publicId);
      const response = await fetch("/api/admin/cloudinary", {
        method: "POST",
        headers: { authorization: `Bearer ${await currentUser.getIdToken()}` },
        body: formData,
        cache: "no-store",
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result
          && typeof result.error === "string"
          ? result.error
          : `Falha ao enviar a imagem (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (
        typeof result !== "object"
        || result === null
        || !("imageUrl" in result)
        || typeof result.imageUrl !== "string"
        || !("publicId" in result)
        || typeof result.publicId !== "string"
      ) {
        throw new Error("O servidor retornou uma confirmação inválida do Cloudinary.");
      }
      const imageUrl = result.imageUrl;
      const uploadedPublicId = result.publicId;
      setValue((current) => ({
        ...current,
        imageSrc: imageUrl,
        imageCreditUrl: imageUrl,
      }));
      setImageFile(null);
      if (imageFileInput.current) imageFileInput.current.value = "";
      setImageMessage(`Imagem enviada como “${uploadedPublicId}”. O link foi adicionado como crédito; você pode substituí-lo pelo link da página original da fonte.`);
    } catch (uploadError) {
      setImageError(errorMessage(uploadError));
    } finally {
      setLoadingImage(false);
    }
  };
  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-editor" aria-labelledby="admin-editor-title" role="dialog" aria-modal="true">
        <header className="admin-editor-header">
          <div><span className="eyebrow">EDITOR DE CONTEÚDO</span><h2 id="admin-editor-title">{article.title ? "Editar artigo" : "Novo artigo"}</h2></div>
          <button aria-label="Fechar editor" className="admin-close-button" disabled={busy || loadingImage} onClick={onClose} type="button">×</button>
        </header>
        <div className="admin-editor-body">
          {imageError && <p className="admin-message admin-error" role="alert">{imageError}</p>}
          {imageMessage && <p className="admin-message" role="status">{imageMessage}</p>}
          <div className="admin-fields-grid">
            <label className="admin-field-wide">Título<input value={value.title} onChange={(event) => {
              const title = event.target.value;
              setValue((current) => ({ ...current, title, ...(!slugTouched ? { slug: slugify(title) } : {}) }));
            }} /></label>
            <label>Slug<input value={value.slug} onChange={(event) => { setSlugTouched(true); setField("slug", slugify(event.target.value)); }} /></label>
            <label>Categoria<input value={value.category} onChange={(event) => setField("category", event.target.value)} /></label>
            <label className="admin-field-wide">Descrição para busca e compartilhamento<textarea rows={2} value={value.description} onChange={(event) => setField("description", event.target.value)} /><small>Use um resumo do artigo. Texto alternativo e crédito da capa têm campos próprios abaixo.</small></label>
            <label>Autor<input value={value.author} onChange={(event) => setField("author", event.target.value)} /></label>
            <label>Data de publicação<input type="date" value={value.publishedAt} onChange={(event) => setField("publishedAt", event.target.value)} /></label>
            <div className="admin-field-wide admin-action-cta-fields">
              <div><h3>Chamada para ação (opcional)</h3><p>Adicione um convite e um link específicos para este artigo. O botão aparece ao final do conteúdo.</p></div>
              <label>Título<input value={value.actionCta?.title ?? ""} onChange={(event) => setActionCtaField("title", event.target.value)} /></label>
              <label>Texto de apoio<textarea rows={2} value={value.actionCta?.description ?? ""} onChange={(event) => setActionCtaField("description", event.target.value)} /></label>
              <label>Texto do botão<input value={value.actionCta?.buttonLabel ?? ""} onChange={(event) => setActionCtaField("buttonLabel", event.target.value)} /></label>
              <label>Link de destino<input inputMode="url" placeholder="https:// ou /caminho" value={value.actionCta?.url ?? ""} onChange={(event) => setActionCtaField("url", event.target.value)} /></label>
            </div>
            <label>Imagem de capa<select value={value.imageSrc} onChange={(event) => {
              const image = starterArticles.find((candidate) => candidate.imageSrc === event.target.value);
              setValue((current) => ({
                ...current,
                imageSrc: event.target.value,
                imageAlt: image?.imageAlt ?? current.imageAlt,
                imageCreditUrl: image?.imageCreditUrl ?? current.imageCreditUrl,
              }));
              setCoverUrl("");
              setImageError("");
              setImageMessage("");
            }}>
              {!starterArticles.some((candidate) => candidate.imageSrc === value.imageSrc)
                && <option value={value.imageSrc}>Imagem adicionada</option>}
              {starterArticles.map((candidate) => <option key={candidate.slug} value={candidate.imageSrc}>{candidate.title}</option>)}
            </select></label>
            <div className="admin-cover-upload admin-field-wide">
              <label htmlFor="admin-cover-file">Enviar imagem para o Cloudinary</label>
              <input
                accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                disabled={busy || loadingImage}
                id="admin-cover-file"
                ref={imageFileInput}
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                  setImageError("");
                  setImageMessage("");
                }}
                type="file"
              />
              <label htmlFor="admin-cover-image-number">Número da imagem</label>
              <input
                disabled={busy || loadingImage}
                id="admin-cover-image-number"
                max={999}
                min={1}
                onChange={(event) => setImageNumber(event.target.value)}
                type="number"
                value={imageNumber}
              />
              <span>Nome SEO gerado: {slugify(value.slug || value.title) || "imagem"}-{imageNumber || "número"}. O arquivo será salvo na pasta lucrazi/artigos.</span>
              <button className="admin-secondary-button" disabled={busy || loadingImage || !imageFile} onClick={() => void uploadCoverImage()} type="button">
                {loadingImage ? "Enviando imagem…" : "Enviar imagem"}
              </button>
              <label htmlFor="admin-cover-url">URL direta da imagem de capa</label>
              <input
                disabled={busy || loadingImage}
                id="admin-cover-url"
                inputMode="url"
                onChange={(event) => setCoverUrl(event.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                type="url"
                value={coverUrl}
              />
              <button className="admin-secondary-button" disabled={busy || loadingImage} onClick={applyCoverUrl} type="button">
                {loadingImage ? "Carregando imagem…" : "Carregar imagem pela URL"}
              </button>
              <span>Você também pode carregar uma imagem por URL pública. Imagens enviadas pelo painel ficam no Cloudinary; o link da imagem será usado como crédito e pode ser substituído pela página original da fonte.</span>
            </div>
            <label>Cor do cartão<select value={value.accent} onChange={(event) => setField("accent", event.target.value as EditorArticle["accent"])}><option value="mint">Verde</option><option value="yellow">Amarelo</option><option value="lavender">Lavanda</option><option value="peach">Pêssego</option></select></label>
            <label className="admin-field-wide">Texto alternativo da imagem<input value={value.imageAlt} onChange={(event) => setField("imageAlt", event.target.value)} /></label>
            <label className="admin-field-wide">Crédito da imagem (URL)<input value={value.imageCreditUrl} onChange={(event) => setField("imageCreditUrl", event.target.value)} /></label>
          </div>
          <div className="admin-markdown-field">
            <div>
              <h3>Conteúdo completo</h3>
              <p>Escreva o artigo em um só lugar. Use títulos com ## para criar seções e o índice automático. O editor mostra a prévia ao lado.</p>
            </div>
            <div data-color-mode="light">
              <MarkdownEditor
                value={value.contentMarkdown ?? ""}
                onChange={(markdown) => setField("contentMarkdown", markdown ?? "")}
                preview="live"
                height={560}
                textareaProps={{ "aria-label": "Conteúdo completo do artigo em Markdown" }}
              />
            </div>
          </div>
        </div>
        <footer className="admin-editor-footer">
          {error && <p className="admin-message admin-error admin-editor-alert" role="alert">{error}</p>}
          <button className="admin-secondary-button" disabled={busy || loadingImage} onClick={onClose} type="button">Cancelar</button>
          <button className="admin-secondary-button" disabled={busy || loadingImage} onClick={() => onSave(value, "draft")} type="button">{busy ? "Salvando…" : "Salvar rascunho"}</button>
          <button className="button button-dark" disabled={busy || loadingImage} onClick={() => onSave(value, "published")} type="button">{busy ? "Salvando…" : "Publicar artigo"}</button>
        </footer>
      </section>
    </div>
  );
}
