"use client";

import { getFirebaseAuth } from "@/lib/firebase";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ManagedArticle } from "@/lib/articles";

type NewsletterArticle = Pick<ManagedArticle, "slug" | "title" | "description">;

type Subscriber = {
  id: string;
  email: string;
  status: string;
  consent: boolean;
  createdAt: string | null;
  welcomeEmailStatus: string;
  brevoSynced: boolean;
};

type Campaign = {
  id: string;
  subject: string;
  status: string;
  recipientCount: number;
  createdAt: string | null;
};

type QrCodeLead = {
  id: string;
  email: string;
  source: string;
  consent: boolean;
  createdAt: string | null;
  consentAt: string | null;
  lastRequestAt: string | null;
  requestCount: number;
  deliveryStatus: string;
};

type NewsletterData = {
  subscribers: Subscriber[];
  campaigns: Campaign[];
  qrCodeLeads: QrCodeLead[];
  qrCodeLeadCount: number;
  activeCount: number;
  brevoConfigured: boolean;
};

async function newsletterRequest(path: string, init: RequestInit = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = typeof body === "object" && body !== null && "error" in body
      && typeof body.error === "string"
      ? body.error
      : `Falha ao acessar o servidor (HTTP ${response.status}).`;
    throw new Error(error);
  }
  return body;
}

function dateLabel(value: string | null) {
  if (!value) return "Data não registrada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

const campaignStatus: Record<string, string> = {
  preparing: "Preparando",
  syncing_contacts: "Sincronizando contatos",
  sending: "Enviando",
  sent: "Aceita para envio",
  failed: "Falhou",
  provider_error: "Erro na Brevo",
};

const qrDeliveryStatus: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado pela Brevo",
  failed: "Falha no envio",
  unknown: "Status indisponível",
};

export default function NewsletterManager({ articles }: { articles: NewsletterArticle[] }) {
  const [data, setData] = useState<NewsletterData | null>(null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [articleSlug, setArticleSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    try {
      const response = await newsletterRequest("/api/admin/newsletter") as NewsletterData;
      setData(response);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados de e-mail.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void newsletterRequest("/api/admin/newsletter")
      .then((response) => {
        if (!active) return;
        setData(response as NewsletterData);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar os dados de e-mail.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredSubscribers = useMemo(() => (data?.subscribers ?? []).filter((subscriber) =>
    subscriber.email.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
  ), [data?.subscribers, search]);
  const filteredQrCodeLeads = useMemo(() => (data?.qrCodeLeads ?? []).filter((lead) =>
    lead.email.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
  ), [data?.qrCodeLeads, search]);

  async function updateSubscriber(subscriber: Subscriber, action: "unsubscribe" | "welcome") {
    if (action === "unsubscribe" && !window.confirm(`Cancelar a inscrição de ${subscriber.email}?`)) return;
    setError("");
    setNotice("");
    try {
      const result = await newsletterRequest("/api/admin/newsletter", {
        method: "PATCH",
        body: JSON.stringify({ subscriberId: subscriber.id, action }),
      }) as { status: string; brevoSuppressed?: boolean };
      setNotice(action === "welcome"
        ? `E-mail de boas-vindas enviado para ${subscriber.email}.`
        : `Inscrição de ${subscriber.email} cancelada${result.brevoSuppressed ? " e sincronizada com a Brevo" : ""}.`);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Não foi possível concluir a ação.");
    }
  }

  async function sendCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.activeCount || !data.brevoConfigured) return;
    const confirmed = window.confirm(
      `Enviar agora “${subject.trim()}” para ${data.activeCount} assinante(s) ativo(s)? A campanha não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setSending(true);
    setError("");
    setNotice("");
    try {
      const result = await newsletterRequest("/api/admin/newsletter/campaigns", {
        method: "POST",
        body: JSON.stringify({
          campaignId: crypto.randomUUID(),
          subject,
          message,
          ...(articleSlug ? { articleSlug } : {}),
        }),
      }) as { recipientCount: number };
      setSubject("");
      setMessage("");
      setArticleSlug("");
      setNotice(`Campanha enviada à Brevo para ${result.recipientCount} assinante(s). A entrega pode levar alguns minutos.`);
      await loadData();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Não foi possível enviar a campanha.");
      await loadData();
    } finally {
      setSending(false);
    }
  }

  function prepareArticleCampaign(slug: string) {
    setArticleSlug(slug);
    const article = articles.find((item) => item.slug === slug);
    if (!article) return;
    setSubject(`Novo guia no Lucrazi: ${article.title}`.slice(0, 150));
    setMessage("Publicamos um novo guia no Lucrazi, com orientações práticas para você explorar essa possibilidade com mais clareza.");
  }

  return (
    <div className="newsletter-admin">
      {error && <p className="admin-message admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-message" role="status">{notice}</p>}
      {!data?.brevoConfigured && !loading && (
        <aside className="newsletter-setup-note">
          <strong>Integração Brevo ainda não configurada.</strong>
          <p>O painel já pode consultar e cancelar inscrições. Para enviar boas-vindas e campanhas, configure as credenciais privadas no Vercel conforme o README.</p>
        </aside>
      )}

      <section className="newsletter-campaign-panel" aria-labelledby="newsletter-campaign-heading">
        <div>
          <span className="eyebrow">ENVIO EM MASSA</span>
          <h2 id="newsletter-campaign-heading">Nova campanha</h2>
          <p>A campanha vai somente para assinantes ativos com consentimento. O link de cancelamento é incluído automaticamente.</p>
        </div>
        <form className="newsletter-campaign-form" onSubmit={(event) => void sendCampaign(event)}>
          <label>
            Modelo
            <select
              onChange={(event) => prepareArticleCampaign(event.target.value)}
              value={articleSlug}
            >
              <option value="">Campanha livre</option>
              {articles.map((article) => (
                <option key={article.slug} value={article.slug}>Aviso de artigo: {article.title}</option>
              ))}
            </select>
          </label>
          <label>
            Assunto
            <input
              maxLength={150}
              onChange={(event) => setSubject(event.target.value)}
              required
              value={subject}
            />
          </label>
          <label>
            Mensagem
            <textarea
              maxLength={8000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Revise ou escreva a mensagem. Cada linha será formatada como um parágrafo."
              required
              rows={7}
              value={message}
            />
          </label>
          <div className="newsletter-campaign-actions">
            <span>{data?.activeCount ?? 0} assinantes ativos</span>
            <button className="button button-dark" disabled={sending || loading || !data?.brevoConfigured || !data.activeCount} type="submit">
              {sending ? "Enviando…" : "Enviar campanha"}
            </button>
          </div>
        </form>
      </section>

      <section className="newsletter-subscribers" aria-labelledby="newsletter-subscribers-heading">
        <div className="newsletter-section-heading">
          <div>
            <span className="eyebrow">LISTA DE E-MAILS</span>
            <h2 id="newsletter-subscribers-heading">Assinantes</h2>
          </div>
          <button className="admin-secondary-button" disabled={loading} onClick={() => { setLoading(true); void loadData(); }} type="button">
            {loading ? "Atualizando…" : "Atualizar lista"}
          </button>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">Buscar por e-mail
            <input onChange={(event) => setSearch(event.target.value)} placeholder="nome@exemplo.com" value={search} />
          </label>
          <span>{data?.subscribers.length ?? 0} no total · {data?.activeCount ?? 0} ativos</span>
        </div>
        {loading ? <p className="admin-loading">Carregando assinantes…</p> : (
          <div className="admin-list">
            {filteredSubscribers.length === 0 ? <p className="newsletter-empty">Nenhum assinante encontrado.</p> :
              filteredSubscribers.map((subscriber) => (
                <article className="admin-article-row newsletter-subscriber-row" key={subscriber.id}>
                  <div>
                    <span className={`admin-status status-${subscriber.status === "subscribed" ? "published" : "deleted"}`}>
                      {subscriber.status === "subscribed" ? "Ativo" : subscriber.status === "unsubscribed" ? "Cancelado" : "Revisar"}
                    </span>
                    <h3>{subscriber.email}</h3>
                    <p>Inscrito em {dateLabel(subscriber.createdAt)} · Boas-vindas: {subscriber.welcomeEmailStatus === "sent" ? "enviadas" : subscriber.welcomeEmailStatus === "failed" ? "falha" : "pendentes"}</p>
                  </div>
                  <div className="admin-row-actions">
                    {subscriber.status === "subscribed" && subscriber.consent && (
                      <button disabled={sending} onClick={() => void updateSubscriber(subscriber, "welcome")} type="button">
                        {subscriber.welcomeEmailStatus === "sent" ? "Reenviar boas-vindas" : "Enviar boas-vindas"}
                      </button>
                    )}
                    {subscriber.status === "subscribed" && (
                      <button className="admin-delete-button" onClick={() => void updateSubscriber(subscriber, "unsubscribe")} type="button">
                        Cancelar inscrição
                      </button>
                    )}
                  </div>
                </article>
              ))
            }
          </div>
        )}
      </section>

      <section className="newsletter-qr-leads" aria-labelledby="newsletter-qr-leads-heading">
        <div className="newsletter-section-heading">
          <div>
            <span className="eyebrow">CAPTURA DE LEADS · GERADOR QR</span>
            <h2 id="newsletter-qr-leads-heading">Pedidos de QR Code</h2>
          </div>
          <span>{data?.qrCodeLeadCount ?? 0} e-mails capturados</span>
        </div>
        <p className="newsletter-qr-leads-note">
          Pessoas que solicitaram o SVG por e-mail no gerador. Esse consentimento vale apenas para
          a entrega pedida: esses endereços não são assinantes da newsletter e não recebem campanhas.
        </p>
        <div className="admin-list">
          {loading ? <p className="admin-loading">Carregando pedidos de QR Code…</p> :
            filteredQrCodeLeads.length === 0
              ? <p className="newsletter-empty">
                  {search ? "Nenhum pedido de QR Code corresponde à busca." : "Nenhum e-mail capturado pelo gerador de QR Code ainda."}
                </p>
              : filteredQrCodeLeads.map((lead) => (
                  <article className="admin-article-row newsletter-qr-lead-row" key={lead.id}>
                    <div>
                      <span className={`admin-status ${lead.deliveryStatus === "sent" ? "status-published" : lead.deliveryStatus === "failed" ? "status-deleted" : "status-draft"}`}>
                        {qrDeliveryStatus[lead.deliveryStatus] ?? "Status indisponível"}
                      </span>
                      <span className="admin-status newsletter-qr-source">Gerador QR Code</span>
                      <h3>{lead.email}</h3>
                      <p>
                        Pedido inicial: {dateLabel(lead.createdAt)} · Último pedido: {dateLabel(lead.lastRequestAt)}
                        {" · "}{lead.requestCount} solicitação(ões)
                      </p>
                      <p>
                        Consentimento de entrega: {lead.consent ? "registrado" : "ausente"}
                        {lead.consentAt ? ` em ${dateLabel(lead.consentAt)}` : ""}
                        {" · Fonte: "}{lead.source}
                      </p>
                    </div>
                  </article>
                ))
          }
        </div>
      </section>

      <section className="newsletter-campaign-history" aria-labelledby="newsletter-history-heading">
        <span className="eyebrow">ATIVIDADE</span>
        <h2 id="newsletter-history-heading">Campanhas recentes</h2>
        {!data?.campaigns.length ? <p className="newsletter-empty">Nenhuma campanha enviada ainda.</p> : (
          <div className="admin-list">
            {data.campaigns.map((campaign) => (
              <article className="admin-article-row" key={campaign.id}>
                <div><span className="admin-status status-draft">{campaignStatus[campaign.status] ?? campaign.status}</span><h3>{campaign.subject}</h3><p>{dateLabel(campaign.createdAt)} · {campaign.recipientCount} destinatário(s)</p></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
