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
  writeBatch,
} from "firebase/firestore";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  articles as starterArticles,
  deleteManagedArticle,
  loadManagedArticles,
  type ArticleStatus,
  type ManagedArticle,
} from "@/lib/articles";
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { ArticleSection } from "@/lib/article-types";
import NewsletterManager from "@/components/newsletter-manager";

type EditorArticle = ManagedArticle;

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
    sections: [{ heading: "", paragraphs: [""], bullets: [], note: "" }],
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

function validateArticle(article: EditorArticle): string | null {
  if (!article.title.trim()) return "Informe o título.";
  if (!isValidSlug(article.slug)) return "Use um slug com letras minúsculas, números e hífens.";
  if (!article.category.trim()) return "Informe a categoria.";
  if (!article.description.trim()) return "Informe a descrição para busca e compartilhamento.";
  if (!article.intro.trim() || !article.takeaway.trim()) return "Preencha a introdução e o resumo final.";
  if (!article.sections.length || article.sections.some((section) =>
    !section.heading.trim()
    || (!section.paragraphs.some((paragraph) => paragraph.trim())
      && !(section.bullets ?? []).some((bullet) => bullet.trim())),
  )) return "Cada seção precisa de título e ao menos um parágrafo.";
  const articleBlocks = [
    article.title,
    article.description,
    article.intro,
    article.takeaway,
    ...article.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
      ...(section.bullets ?? []),
      section.note ?? "",
    ]),
  ];
  if (articleBlocks.some((block) => /\bR\s+\d/iu.test(block))) {
    return "Revise valores em reais: use o símbolo R$ antes do valor e confirme dados financeiros ou tributários em fontes oficiais antes de publicar.";
  }
  if (articleBlocks.some((block) => (block.match(/\bteto de faturamento\b/giu) ?? []).length > 1)) {
    return "Revise o artigo: a expressão “teto de faturamento” aparece repetida. Remova a duplicação e confirme qualquer valor em fonte oficial.";
  }
  if (!article.imageAlt.trim() || !article.imageCreditUrl.trim()) return "Preencha o texto alternativo e a fonte da imagem.";
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
    setArticles(await loadManagedArticles());
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
      if (selected && selected.slug !== article.slug) {
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
    sections: article.sections,
    takeaway: article.takeaway,
    imageSrc: article.imageSrc,
    imageAlt: article.imageAlt,
    imageCreditUrl: article.imageCreditUrl,
  };
}

function statusLabel(status: ArticleStatus) {
  return status === "published" ? "Publicado" : status === "draft" ? "Rascunho" : "Excluído";
}

function ArticleEditor({
  article,
  busy,
  onClose,
  onSave,
}: {
  article: EditorArticle;
  busy: boolean;
  onClose: () => void;
  onSave: (article: EditorArticle, status: ArticleStatus) => void;
}) {
  const [value, setValue] = useState(article);
  const [slugTouched, setSlugTouched] = useState(Boolean(article.slug));
  const setField = <K extends keyof EditorArticle>(key: K, nextValue: EditorArticle[K]) => {
    setValue((current) => ({ ...current, [key]: nextValue }));
  };
  const updateSection = (index: number, section: ArticleSection) => {
    setValue((current) => ({
      ...current,
      sections: current.sections.map((item, itemIndex) => itemIndex === index ? section : item),
    }));
  };

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-editor" aria-labelledby="admin-editor-title" role="dialog" aria-modal="true">
        <header className="admin-editor-header">
          <div><span className="eyebrow">EDITOR DE CONTEÚDO</span><h2 id="admin-editor-title">{article.title ? "Editar artigo" : "Novo artigo"}</h2></div>
          <button aria-label="Fechar editor" className="admin-close-button" onClick={onClose} type="button">×</button>
        </header>
        <div className="admin-editor-body">
          <div className="admin-fields-grid">
            <label className="admin-field-wide">Título<input value={value.title} onChange={(event) => {
              const title = event.target.value;
              setValue((current) => ({ ...current, title, ...(!slugTouched ? { slug: slugify(title) } : {}) }));
            }} /></label>
            <label>Slug<input value={value.slug} onChange={(event) => { setSlugTouched(true); setField("slug", slugify(event.target.value)); }} /></label>
            <label>Categoria<input value={value.category} onChange={(event) => setField("category", event.target.value)} /></label>
            <label className="admin-field-wide">Descrição para busca e compartilhamento<textarea rows={2} value={value.description} onChange={(event) => setField("description", event.target.value)} /></label>
            <label>Autor<input value={value.author} onChange={(event) => setField("author", event.target.value)} /></label>
            <label>Data de publicação<input type="date" value={value.publishedAt} onChange={(event) => setField("publishedAt", event.target.value)} /></label>
            <label className="admin-field-wide">Introdução<textarea rows={3} value={value.intro} onChange={(event) => setField("intro", event.target.value)} /></label>
            <label>Imagem de capa<select value={value.imageSrc} onChange={(event) => {
              const image = starterArticles.find((candidate) => candidate.imageSrc === event.target.value);
              setValue((current) => ({
                ...current,
                imageSrc: event.target.value,
                imageAlt: image?.imageAlt ?? current.imageAlt,
                imageCreditUrl: image?.imageCreditUrl ?? current.imageCreditUrl,
              }));
            }}>{starterArticles.map((candidate) => <option key={candidate.slug} value={candidate.imageSrc}>{candidate.title}</option>)}</select></label>
            <label>Cor do cartão<select value={value.accent} onChange={(event) => setField("accent", event.target.value as EditorArticle["accent"])}><option value="mint">Verde</option><option value="yellow">Amarelo</option><option value="lavender">Lavanda</option><option value="peach">Pêssego</option></select></label>
            <label className="admin-field-wide">Texto alternativo da imagem<input value={value.imageAlt} onChange={(event) => setField("imageAlt", event.target.value)} /></label>
            <label className="admin-field-wide">Crédito da imagem (URL)<input value={value.imageCreditUrl} onChange={(event) => setField("imageCreditUrl", event.target.value)} /></label>
          </div>
          <div className="admin-sections-heading"><div><h3>Conteúdo</h3><p>Organize o artigo em seções. Um parágrafo por linha.</p></div><button className="admin-secondary-button" onClick={() => setValue((current) => ({ ...current, sections: [...current.sections, { heading: "", paragraphs: [""], bullets: [], note: "" }] }))} type="button">Adicionar seção</button></div>
          {value.sections.map((section, index) => (
            <fieldset className="admin-section-editor" key={`section-${index}`}>
              <legend>Seção {index + 1}</legend>
              <div className="admin-section-title"><label>Título da seção<input value={section.heading} onChange={(event) => updateSection(index, { ...section, heading: event.target.value })} /></label><button aria-label={`Remover seção ${index + 1}`} className="admin-delete-button" disabled={value.sections.length === 1} onClick={() => setValue((current) => ({ ...current, sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index) }))} type="button">Remover</button></div>
              <label>Parágrafos (um por linha)<textarea rows={5} value={section.paragraphs.join("\n")} onChange={(event) => updateSection(index, { ...section, paragraphs: event.target.value.split("\n") })} /></label>
              <label>Lista opcional (um item por linha)<textarea rows={3} value={(section.bullets ?? []).join("\n")} onChange={(event) => updateSection(index, { ...section, bullets: event.target.value.split("\n").filter(Boolean) })} /></label>
              <label>Dica ou observação opcional<input value={section.note ?? ""} onChange={(event) => updateSection(index, { ...section, note: event.target.value })} /></label>
            </fieldset>
          ))}
          <label className="admin-editor-takeaway">Resumo final<textarea rows={2} value={value.takeaway} onChange={(event) => setField("takeaway", event.target.value)} /></label>
        </div>
        <footer className="admin-editor-footer">
          <button className="admin-secondary-button" disabled={busy} onClick={onClose} type="button">Cancelar</button>
          <button className="admin-secondary-button" disabled={busy} onClick={() => onSave(value, "draft")} type="button">{busy ? "Salvando…" : "Salvar rascunho"}</button>
          <button className="button button-dark" disabled={busy} onClick={() => onSave(value, "published")} type="button">{busy ? "Salvando…" : "Publicar artigo"}</button>
        </footer>
      </section>
    </div>
  );
}
