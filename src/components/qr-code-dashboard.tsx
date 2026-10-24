"use client";

import QRCode from "qrcode";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { getPersistentFirebaseAuth, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { billingPlans, type BillingAccess, type PaidPlanId, type PlanId } from "@/lib/billing-plans";
import { siteUrl } from "@/lib/site-config";

type SavedQrCode = {
  id: string;
  publicId: string;
  name: string;
  content: string;
  contentType: "url" | "text";
  foregroundColor: string;
  backgroundColor: string;
  logoDataUrl: string;
  trackingEnabled: boolean;
  scanCount: number;
  createdAt: string | null;
};

type ApiResult = Record<string, unknown>;

const freeAccess: BillingAccess = {
  planId: "free",
  billingInterval: null,
  status: "free",
  qrLimit: 1,
  hasMetrics: false,
  hasLogo: false,
};

const paidPlanIds: PaidPlanId[] = ["solo", "duo", "studio"];

function isRecord(value: unknown): value is ApiResult {
  return typeof value === "object" && value !== null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Ocorreu um erro inesperado. Tente novamente.";
}

function readSavedCode(value: unknown): SavedQrCode | null {
  if (!isRecord(value)
    || typeof value.id !== "string"
    || typeof value.publicId !== "string"
    || typeof value.name !== "string"
    || typeof value.content !== "string"
    || (value.contentType !== "url" && value.contentType !== "text")
    || typeof value.foregroundColor !== "string"
    || typeof value.backgroundColor !== "string") return null;

  return {
    id: value.id,
    publicId: value.publicId,
    name: value.name,
    content: value.content,
    contentType: value.contentType,
    foregroundColor: value.foregroundColor,
    backgroundColor: value.backgroundColor,
    logoDataUrl: typeof value.logoDataUrl === "string" ? value.logoDataUrl : "",
    trackingEnabled: value.trackingEnabled === true,
    scanCount: typeof value.scanCount === "number" ? value.scanCount : 0,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : null,
  };
}

function readAccess(value: unknown): BillingAccess | null {
  if (!isRecord(value)
    || (value.planId !== "free" && value.planId !== "solo" && value.planId !== "duo" && value.planId !== "studio")
    || typeof value.status !== "string"
    || typeof value.qrLimit !== "number"
    || typeof value.hasMetrics !== "boolean"
    || typeof value.hasLogo !== "boolean") return null;

  return {
    planId: value.planId,
    status: value.status,
    qrLimit: value.qrLimit,
    hasMetrics: value.hasMetrics,
    hasLogo: value.hasLogo,
    billingInterval: value.billingInterval === "monthly" || value.billingInterval === "quarterly"
      ? value.billingInterval
      : null,
    ...(typeof value.subscriptionId === "string" ? { subscriptionId: value.subscriptionId } : {}),
    ...(typeof value.nextPaymentDate === "string" ? { nextPaymentDate: value.nextPaymentDate } : {}),
  };
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

async function accountRequest(user: User, url: string, init: RequestInit = {}) {
  const idToken = await user.getIdToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${idToken}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    cache: "no-store",
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`);
  }
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === "string"
      ? body.error
      : `A solicitação falhou (HTTP ${response.status}).`;
    throw new Error(message);
  }
  if (!isRecord(body)) throw new Error("O servidor retornou dados inválidos.");
  return body;
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function QrCodeDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(firebaseConfigured);
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<SavedQrCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [refreshingCodes, setRefreshingCodes] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [codeSearch, setCodeSearch] = useState("");
  const [access, setAccess] = useState<BillingAccess>(freeAccess);
  const [pendingCheckoutUrl, setPendingCheckoutUrl] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [publicId, setPublicId] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<"url" | "text">("url");
  const [foregroundColor, setForegroundColor] = useState("#243B2B");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [billingInterval, setBillingInterval] = useState<"monthly" | "quarterly">("monthly");
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [error, setError] = useState(firebaseConfigured ? "" : "O painel ainda não está configurado. Tente novamente mais tarde.");
  const [notice, setNotice] = useState("");
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  const refreshCodes = useCallback(async (currentUser: User) => {
    const body = await accountRequest(currentUser, "/api/account/qr-codes");
    if (!Array.isArray(body.codes)) throw new Error("A lista de QR Codes retornada é inválida.");
    const nextAccess = readAccess(body.access);
    if (!nextAccess) throw new Error("O plano da conta retornado é inválido.");
    setCodes(body.codes.map(readSavedCode).filter((code): code is SavedQrCode => code !== null));
    setAccess(nextAccess);
    setPendingCheckoutUrl(typeof body.checkoutUrl === "string" ? body.checkoutUrl : "");
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setCheckingAuth(false);
      if (!nextUser) {
        setCodes([]);
        setAccess(freeAccess);
        setLoadingCodes(false);
        setLastUpdated(null);
        return;
      }
      setError("");
      setCodes([]);
      setLoadingCodes(true);
      void refreshCodes(nextUser).then(() => {
        setLastUpdated(new Date());
      }).catch((loadError: unknown) => {
        console.error("Não foi possível carregar os QR Codes salvos.", loadError);
        setError(`Não foi possível carregar seus QR Codes: ${errorMessage(loadError)}`);
      }).finally(() => {
        setLoadingCodes(false);
      });
    });
  }, [firebaseConfigured, refreshCodes]);

  const previewContent = access.hasMetrics && publicId
    ? new URL(`/q/${publicId}`, siteUrl).toString()
    : content.trim();
  const qrCanvasContent = previewContent || siteUrl.toString();
  const canDownloadPreview = Boolean(previewContent);
  const totalScans = codes.reduce((total, code) => total + (code.trackingEnabled ? code.scanCount : 0), 0);
  const dynamicCodes = codes.filter((code) => code.trackingEnabled).length;
  const filteredCodes = codes.filter((code) =>
    `${code.name} ${code.content}`.toLocaleLowerCase("pt-BR").includes(codeSearch.trim().toLocaleLowerCase("pt-BR")),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    void QRCode.toCanvas(canvas, qrCanvasContent, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 360,
      color: { dark: foregroundColor, light: backgroundColor },
    }).then(() => {
      if (cancelled || !logoDataUrl) return;
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) {
          setError("Seu navegador não conseguiu preparar a prévia do logo.");
          return;
        }
        const center = canvas.width / 2;
        const logoSize = canvas.width * 0.2;
        const backingSize = logoSize * 1.25;
        context.fillStyle = backgroundColor;
        context.fillRect(center - backingSize / 2, center - backingSize / 2, backingSize, backingSize);
        context.drawImage(image, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
      };
      image.onerror = () => setError("Não foi possível carregar o logo salvo.");
      image.src = logoDataUrl;
    }).catch((previewError: unknown) => {
      if (cancelled) return;
      console.error("Não foi possível gerar a prévia do QR Code salvo.", previewError);
      setError(`Não foi possível gerar a prévia: ${errorMessage(previewError)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [backgroundColor, foregroundColor, logoDataUrl, qrCanvasContent]);

  function resetEditor() {
    setSelectedId("");
    setPublicId("");
    setName("");
    setContent("");
    setContentType("url");
    setForegroundColor("#243B2B");
    setBackgroundColor("#FFFFFF");
    setLogoDataUrl("");
  }

  async function refreshDashboard() {
    if (!user || refreshingCodes) return;
    setRefreshingCodes(true);
    setError("");
    try {
      await refreshCodes(user);
      setLastUpdated(new Date());
    } catch (loadError) {
      console.error("Não foi possível atualizar os QR Codes salvos.", loadError);
      setError(`Não foi possível atualizar seus QR Codes: ${errorMessage(loadError)}`);
    } finally {
      setRefreshingCodes(false);
    }
  }

  function editCode(code: SavedQrCode) {
    setSelectedId(code.id);
    setPublicId(code.publicId);
    setName(code.name);
    setContent(code.content);
    setContentType(code.contentType);
    setForegroundColor(code.foregroundColor);
    setBackgroundColor(code.backgroundColor);
    setLogoDataUrl(code.logoDataUrl || "");
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const auth = await getPersistentFirebaseAuth();
      if (registering) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        setNotice("Conta criada. Seus QR Codes salvos ficarão disponíveis neste painel.");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleAuth() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const auth = await getPersistentFirebaseAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (authError) {
      setError(errorMessage(authError));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      setLogoDataUrl("");
      return;
    }
    if (file.size > 256 * 1024 || !["image/png", "image/jpeg"].includes(file.type)) {
      setError("Escolha um logo PNG ou JPEG de até 256 KB.");
      input.value = "";
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const validPng = bytes.length >= 8
        && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
      const validJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if ((file.type === "image/png" && !validPng) || (file.type === "image/jpeg" && !validJpeg)) {
        throw new Error("O arquivo não corresponde a uma imagem PNG ou JPEG válida.");
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          setError("Não foi possível ler o logo.");
          return;
        }
        const dataUrl = reader.result;
        const image = new Image();
        image.onload = () => {
          if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
            setError("O logo precisa ter no máximo 2048 por 2048 pixels.");
            input.value = "";
            return;
          }
          setLogoDataUrl(dataUrl);
        };
        image.onerror = () => setError("O arquivo não contém uma imagem PNG ou JPEG válida.");
        image.src = dataUrl;
      };
      reader.onerror = () => setError("Não foi possível ler o logo.");
      reader.readAsDataURL(file);
    } catch (logoError) {
      setError(errorMessage(logoError));
      input.value = "";
    }
  }

  async function saveCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const normalizedContent = content.trim();
    if (contentType === "url") {
      try {
        const url = new URL(normalizedContent);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError("Informe um endereço válido iniciado por http:// ou https://.");
        return;
      }
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = await accountRequest(
        user,
        selectedId ? `/api/account/qr-codes/${selectedId}` : "/api/account/qr-codes",
        {
          method: selectedId ? "PATCH" : "POST",
          body: JSON.stringify({
            name: name.trim(),
            content: normalizedContent,
            contentType,
            foregroundColor,
            backgroundColor,
            logoDataUrl: access.hasLogo ? logoDataUrl : "",
          }),
        },
      );
      if (!selectedId) {
        if (typeof body.id !== "string" || typeof body.publicId !== "string") {
          throw new Error("O servidor não confirmou o novo QR Code.");
        }
        setSelectedId(body.id);
        setPublicId(body.publicId);
      }
      await refreshCodes(user);
      setNotice(selectedId ? "QR Code atualizado." : "QR Code salvo na sua conta.");
    } catch (saveError) {
      setError(`Não foi possível salvar seu QR Code: ${errorMessage(saveError)}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeCode(code: SavedQrCode) {
    if (!user || !window.confirm(`Excluir o QR Code "${code.name}"? Essa ação não pode ser desfeita.`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await accountRequest(user, `/api/account/qr-codes/${code.id}`, { method: "DELETE" });
      setCodes((currentCodes) => currentCodes.filter((item) => item.id !== code.id));
      if (selectedId === code.id) resetEditor();
      setNotice("QR Code excluído da sua conta.");
    } catch (deleteError) {
      setError(`Não foi possível excluir o QR Code: ${errorMessage(deleteError)}`);
    } finally {
      setBusy(false);
    }
  }

  async function startCheckout(planId: PaidPlanId) {
    if (!user) return;
    setBillingBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await accountRequest(user, "/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      if (typeof result.checkoutUrl !== "string") throw new Error("O servidor não retornou o link do checkout.");
      const checkoutUrl = new URL(result.checkoutUrl);
      if (checkoutUrl.protocol !== "https:"
        || !(checkoutUrl.hostname === "mercadopago.com.br"
          || checkoutUrl.hostname.endsWith(".mercadopago.com.br")
          || checkoutUrl.hostname === "mercadopago.com"
          || checkoutUrl.hostname.endsWith(".mercadopago.com"))) {
        throw new Error("O Mercado Pago retornou um endereço de checkout inválido.");
      }
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      setError(`Não foi possível abrir o checkout: ${errorMessage(checkoutError)}`);
      setBillingBusy(false);
    }
  }

  function getNextPlanId(currentPlanId: PlanId): PaidPlanId {
    if (currentPlanId === "free") return "solo";
    if (currentPlanId === "solo") return "duo";
    return "studio";
  }

  async function cancelSubscription() {
    if (!user) return;
    const pendingCheckout = access.status === "pending";
    const confirmation = pendingCheckout
      ? "Deseja cancelar o checkout pendente?"
      : "Deseja cancelar sua assinatura? Os QR Codes existentes continuarão redirecionando, mas as métricas serão desativadas.";
    if (!window.confirm(confirmation)) return;
    setBillingBusy(true);
    setError("");
    setNotice("");
    try {
      await accountRequest(user, "/api/billing/cancel", { method: "POST" });
      await refreshCodes(user);
      setNotice(pendingCheckout
        ? "Checkout cancelado."
        : "Assinatura cancelada. O plano gratuito já está ativo.");
    } catch (cancelError) {
      setError(`Não foi possível cancelar a assinatura: ${errorMessage(cancelError)}`);
    } finally {
      setBillingBusy(false);
    }
  }

  async function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas || !canDownloadPreview) return;
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("O navegador não conseguiu preparar o PNG."));
        }, "image/png");
      });
      downloadFile("qr-code-lucrazi.png", blob, "image/png");
    } catch (downloadError) {
      setError(`Não foi possível baixar o PNG: ${errorMessage(downloadError)}`);
    }
  }

  async function downloadSvg() {
    if (!canDownloadPreview) return;
    try {
      let svg = await QRCode.toString(previewContent, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 4,
        width: 360,
        color: { dark: foregroundColor, light: backgroundColor },
      });
      if (logoDataUrl) {
        const overlay = `<rect x="38%" y="38%" width="24%" height="24%" rx="3%" fill="${backgroundColor}"/><image href="${logoDataUrl}" x="40%" y="40%" width="20%" height="20%" preserveAspectRatio="xMidYMid meet"/>`;
        svg = svg.replace("</svg>", `${overlay}</svg>`);
      }
      downloadFile("qr-code-lucrazi.svg", svg, "image/svg+xml;charset=utf-8");
    } catch (downloadError) {
      setError(`Não foi possível baixar o SVG: ${errorMessage(downloadError)}`);
    }
  }

  if (checkingAuth) {
    return <main className="qr-account-page"><p role="status">Verificando sua conta…</p></main>;
  }

  return (
    <main className="qr-account-page">
      <header className="qr-account-header">
        <Link className="wordmark" href="/">lucr<span>a</span>zi<span className="wordmark-dot">.</span></Link>
        <Link className="qr-account-back" href="/ferramentas/gerador-qrcode-gratuito">Voltar ao gerador</Link>
      </header>
      <div className="qr-account-content">
        {!user ? (
          <section className="qr-account-card qr-account-login">
            <span className="eyebrow">SUA CONTA LUCrazi</span>
            <h1>{registering ? "Crie sua conta." : "Entre para gerenciar seus QR Codes."}</h1>
            <p>Salve seus códigos e volte para editar ou baixar quando precisar.</p>
            <form className="admin-form" onSubmit={(event) => void handleAuth(event)}>
              <label>
                E-mail
                <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Senha
                <input autoComplete={registering ? "new-password" : "current-password"} type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <button className="button button-dark" disabled={busy} type="submit">
                {busy ? "Aguarde…" : registering ? "Criar conta" : "Entrar"}
              </button>
            </form>
            <div className="qr-account-login-divider"><span>ou</span></div>
            <button
              className="qr-google-button"
              disabled={busy}
              onClick={() => void handleGoogleAuth()}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.71 7.18l7.64 5.93c4.46-4.12 7.11-10.18 7.11-17.58Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.64-5.93c-2.13 1.43-4.86 2.28-8.26 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
              {busy ? "Aguarde…" : "Continuar com Google"}
            </button>
            <button className="qr-account-switch" disabled={busy} onClick={() => setRegistering((value) => !value)} type="button">
              {registering ? "Já tem conta? Entrar" : "Ainda não tem conta? Criar conta"}
            </button>
            {error && <p className="admin-message admin-error" role="alert">{error}</p>}
          </section>
        ) : (
          <>
            <header className="qr-account-title">
              <div>
                <span className="eyebrow">MEUS QR CODES</span>
                <h1>Gerencie seus códigos</h1>
                <p>Crie, edite e acompanhe o desempenho dos seus QR Codes</p>
              </div>
              <div className="qr-account-user">
                <span>{user.email}</span>
                <button className="qr-secondary-button" disabled={busy || billingBusy} onClick={() => void signOut(getFirebaseAuth())} type="button">Sair</button>
              </div>
            </header>
            <section className="qr-billing-card" aria-labelledby="qr-plan-heading">
              <div className="qr-billing-current">
                <div>
                  <span className="eyebrow">SEU PLANO</span>
                  <h2 id="qr-plan-heading">
                    {access.planId === "free" ? "Grátis" : billingPlans[access.planId].name}
                    <span> · {codes.length}/{access.qrLimit} QR Codes</span>
                  </h2>
                  <p>
                    {access.hasMetrics
                      ? `Métricas de escaneamento ativadas${access.nextPaymentDate ? ` · Próxima cobrança: ${new Date(access.nextPaymentDate).toLocaleDateString("pt-BR")}` : ""}.`
                      : "1 QR Code personalizado, sem métricas de escaneamento."}
                  </p>
                </div>
                {access.status === "authorized" ? (
                  <div className="qr-billing-actions">
                    <button className="qr-secondary-button" disabled={billingBusy} onClick={() => void cancelSubscription()} type="button">
                      {billingBusy ? "Aguarde…" : "Cancelar"}
                    </button>
                  </div>
                ) : access.status === "pending" ? (
                  <div className="qr-pending-checkout">
                    <p>Há um checkout pendente.</p>
                    {pendingCheckoutUrl && <a className="button button-dark" href={pendingCheckoutUrl}>Continuar <span aria-hidden="true">↗</span></a>}
                    <button className="qr-secondary-button" disabled={billingBusy} onClick={() => void cancelSubscription()} type="button">Cancelar</button>
                  </div>
                ) : access.status === "creating" ? (
                  <p className="qr-plan-contact">Preparando checkout…</p>
                ) : (
                  <button className="qr-upgrade-button" disabled={billingBusy} onClick={() => void startCheckout(access.planId === "free" ? "solo" : getNextPlanId(access.planId))} type="button">
                    {billingBusy ? "Aguarde…" : "Fazer upgrade"}
                  </button>
                )}
              </div>
              {access.status !== "authorized" && access.status !== "pending" && access.status !== "creating" && showPlanSelector && (
                <div className="qr-plan-selector">
                  <div className="qr-plan-interval" role="group" aria-label="Frequência de cobrança">
                    <button aria-pressed={billingInterval === "monthly"} onClick={() => setBillingInterval("monthly")} type="button">Mensal</button>
                    <button aria-pressed={billingInterval === "quarterly"} onClick={() => setBillingInterval("quarterly")} type="button">Trimestral · 5% off</button>
                  </div>
                  <div className="qr-plan-grid">
                    {paidPlanIds.map((planId) => {
                      const plan = billingPlans[planId];
                      const price = billingInterval === "monthly" ? plan.monthlyPriceCents : plan.quarterlyPriceCents;
                      return (
                        <article className={`qr-plan-option${planId === "solo" ? " qr-plan-option-test" : ""}`} key={planId}>
                          <span>{planId === "solo" ? "Premium · teste" : plan.name}</span>
                          <strong>{money(price)}<small>/{billingInterval === "monthly" ? "mês" : "trim"}</small></strong>
                          <p>{plan.qrLimit} QR Code{plan.qrLimit > 1 ? "s" : ""} · Logo · Métricas</p>
                          <button className="button button-dark" disabled={billingBusy} onClick={() => void startCheckout(planId)} type="button">
                            {billingBusy ? "Abrindo…" : "Assinar"}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  <p className="qr-plan-contact">Precisa de QR Codes ilimitados? <Link href="/contato">Fale conosco.</Link></p>
                </div>
              )}
            </section>
            {notice && <p className="admin-message" role="status">{notice}</p>}
            {error && <p className="admin-message admin-error" role="alert">{error}</p>}
            <section className="qr-account-stats" aria-label="Resumo da conta">
              <article className="qr-stat-card">
                <div className="qr-stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                  </svg>
                </div>
                <div>
                  <span>QR Codes</span>
                  <strong>{codes.length}<small> de {access.qrLimit}</small></strong>
                  <div className="qr-stat-progress">
                    <div className="qr-stat-bar" style={{ width: `${(codes.length / access.qrLimit) * 100}%` }}></div>
                  </div>
                </div>
              </article>
              <article className="qr-stat-card">
                <div className="qr-stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <div>
                  <span>Escaneamentos</span>
                  <strong>{access.hasMetrics ? totalScans.toLocaleString("pt-BR") : "—"}</strong>
                  {!access.hasMetrics && <small>Upgrade para ver métricas</small>}
                </div>
              </article>
              <article className="qr-stat-card">
                <div className="qr-stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <div>
                  <span>Códigos dinâmicos</span>
                  <strong>{access.hasMetrics ? dynamicCodes : "—"}</strong>
                  {!access.hasMetrics && <small>Upgrade para ativá-los</small>}
                </div>
              </article>
            </section>
            <div className="qr-account-grid">
              <section className="qr-account-card">
                <div className="qr-editor-heading">
                  <div>
                    <h2>{selectedId ? "Editar QR Code" : "Criar QR Code"}</h2>
                    <p>{selectedId ? "Modifique as configurações do seu código" : "Configure seu novo QR Code"}</p>
                  </div>
                  {selectedId && <button className="qr-account-switch" onClick={resetEditor} type="button">+ Novo</button>}
                </div>
                <form className="qr-account-form" onSubmit={(event) => void saveCode(event)}>
                  <div className="qr-field">
                    <label htmlFor="qr-name">Nome para identificar</label>
                    <input
                      id="qr-name"
                      maxLength={80}
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex.: Cardápio da loja"
                    />
                  </div>
                  <div className="qr-field">
                    <label htmlFor="qr-content-type">Tipo de conteúdo</label>
                    <select
                      id="qr-content-type"
                      value={contentType}
                      onChange={(event) => setContentType(event.target.value === "text" ? "text" : "url")}
                    >
                      <option value="url">Link (URL)</option>
                      <option value="text">Texto</option>
                    </select>
                  </div>
                  <div className="qr-field">
                    <label htmlFor="qr-content">{contentType === "url" ? "Endereço do site" : "Texto"}</label>
                    <textarea
                      id="qr-content"
                      maxLength={2048}
                      required
                      rows={4}
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder={contentType === "url" ? "https://exemplo.com" : "Digite o texto"}
                    />
                    <span className="qr-field-hint">{content.length}/2048 caracteres</span>
                  </div>
                  <fieldset className="qr-color-fields">
                    <legend>Cores do QR Code</legend>
                    <div className="qr-color-row">
                      <label htmlFor="qr-foreground">Código</label>
                      <input
                        id="qr-foreground"
                        type="color"
                        value={foregroundColor}
                        onChange={(event) => setForegroundColor(event.target.value)}
                      />
                      <output htmlFor="qr-foreground">{foregroundColor}</output>
                    </div>
                    <div className="qr-color-row">
                      <label htmlFor="qr-background">Fundo</label>
                      <input
                        id="qr-background"
                        type="color"
                        value={backgroundColor}
                        onChange={(event) => setBackgroundColor(event.target.value)}
                      />
                      <output htmlFor="qr-background">{backgroundColor}</output>
                    </div>
                  </fieldset>
                  <div className="qr-field">
                    <label htmlFor="qr-logo">Logo no centro (PNG ou JPEG, até 256 KB)</label>
                    <input
                      id="qr-logo"
                      accept="image/png,image/jpeg"
                      onChange={(event) => void handleLogoChange(event)}
                      type="file"
                    />
                    <span className="qr-field-hint">
                      O logo será aplicado na prévia e no download. No plano gratuito, o logo não será salvo no servidor.
                    </span>
                  </div>
                  {access.hasMetrics && contentType === "url" && (
                    <p className="qr-plan-contact qr-plan-contact-info">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      Este QR Code será dinâmico: os escaneamentos serão contabilizados e encaminhados ao seu link.
                    </p>
                  )}
                  <div className="qr-account-form-actions">
                    <button
                      className="button button-dark"
                      disabled={busy || !content.trim() || (!selectedId && codes.length >= access.qrLimit)}
                      type="submit"
                    >
                      {busy ? "Salvando…" : selectedId ? "Salvar alterações" : codes.length >= access.qrLimit ? "Limite do plano atingido" : "Salvar QR Code"}
                    </button>
                    {selectedId && (
                      <button className="qr-secondary-button" disabled={busy} onClick={resetEditor} type="button">
                        Cancelar edição
                      </button>
                    )}
                  </div>
                </form>
                <div className="qr-account-preview">
                  <span className="qr-preview-label">PRÉVIA EM TEMPO REAL</span>
                  <canvas aria-label="Prévia do QR Code" className="qr-preview-canvas" ref={canvasRef} role="img" />
                  <p className="qr-preview-hint">Escaneie o código com a câmera antes de imprimir ou compartilhar.</p>
                  {!canDownloadPreview && <p className="qr-preview-notice">Digite um link ou texto para atualizar a prévia.</p>}
                  {canDownloadPreview && (
                    <div className="qr-download-actions">
                      <button className="button button-dark" disabled={!canDownloadPreview} onClick={() => void downloadPng()} type="button">
                        Baixar PNG <span aria-hidden="true">↓</span>
                      </button>
                      <button className="qr-secondary-button" disabled={!canDownloadPreview} onClick={() => void downloadSvg()} type="button">
                        Baixar SVG
                      </button>
                    </div>
                  )}
                  {!access.hasMetrics && contentType === "url" && (
                    <div className="qr-preview-upsell">
                      <p>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v20M2 12h20"></path>
                        </svg>
                        Ative métricas de escaneamento com um plano pago
                      </p>
                    </div>
                  )}
                </div>
              </section>
              <section className="qr-account-card qr-saved-list">
                <div className="qr-saved-heading">
                  <div>
                    <h2>Seus QR Codes</h2>
                    <p className="qr-saved-count">{filteredCodes.length} código{filteredCodes.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button className="qr-secondary-button" disabled={refreshingCodes || loadingCodes} onClick={() => void refreshDashboard()} type="button">
                    {refreshingCodes || loadingCodes ? "Atualizando…" : "Atualizar"}
                  </button>
                </div>
                <p className="qr-saved-updated">
                  {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Sincronize para ver os dados mais recentes."}
                </p>
                <label className="qr-code-search">
                  Buscar por nome ou conteúdo
                  <input type="search" value={codeSearch} onChange={(event) => setCodeSearch(event.target.value)} placeholder="Ex.: cardápio ou site.com" />
                </label>
                {loadingCodes && codes.length === 0 ? (
                  <p className="qr-saved-empty" role="status">Carregando seus QR Codes…</p>
                ) : codes.length === 0 ? (
                  <p className="qr-saved-empty">Você ainda não salvou nenhum QR Code.</p>
                ) : filteredCodes.length === 0 ? (
                  <p className="qr-saved-empty">Nenhum QR Code corresponde à busca.</p>
                ) : (
                  <ul>
                    {filteredCodes.map((code) => (
                      <li key={code.id} className="qr-code-item">
                        <div className="qr-code-info">
                          <div className="qr-code-header">
                            <strong>{code.name}</strong>
                            {code.trackingEnabled && (
                              <span className="qr-code-badge">Dinâmico</span>
                            )}
                          </div>
                          <span className="qr-code-content">{code.contentType === "url" ? code.content : `${code.content.slice(0, 90)}${code.content.length > 90 ? "…" : ""}`}</span>
                          <div className="qr-code-metrics">
                            {code.trackingEnabled ? (
                              <>
                                <span className="qr-metric">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  {code.scanCount} escaneamentos
                                </span>
                                {code.createdAt && (
                                  <span className="qr-metric">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="16" y1="2" x2="16" y2="6"></line>
                                      <line x1="8" y1="2" x2="8" y2="6"></line>
                                      <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    Criado em {new Date(code.createdAt).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="qr-metric qr-metric-static">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                  <polyline points="13 2 13 9 20 9"></polyline>
                                </svg>
                                Estático (sem métricas)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="qr-saved-actions">
                          <button onClick={() => editCode(code)} disabled={busy} type="button" className="qr-action-button qr-action-edit">Editar</button>
                          <button onClick={() => void removeCode(code)} disabled={busy} type="button" className="qr-action-button qr-action-delete">Excluir</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
