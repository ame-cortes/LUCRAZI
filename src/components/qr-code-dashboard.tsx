"use client";

import QRCode from "qrcode";
import { createElement, useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaPinterestP,
  FaSnapchat,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
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
import { getPersistentFirebaseAuth, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { billingPlans, type BillingAccess, type PaidPlanId } from "@/lib/billing-plans";
import { isSocialIconId, type SocialIconId } from "@/lib/social-icons";
import { siteUrl } from "@/lib/site-config";
import QrMetricsDashboard from "@/components/qr-metrics-dashboard";

type SavedQrCode = {
  id: string;
  publicId: string;
  name: string;
  content: string;
  contentType: "url" | "text";
  foregroundColor: string;
  backgroundColor: string;
  logoDataUrl: string;
  socialIcon: SocialIconId | "";
  socialIconColor: string;
  trackingEnabled: boolean;
  scanCount: number;
  createdAt: string | null;
  qrImage?: string;
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

const SOCIAL_ICONS: {
  id: SocialIconId;
  label: string;
  Icon: IconType;
}[] = [
  { id: "instagram", label: "Instagram", Icon: FaInstagram },
  { id: "facebook", label: "Facebook", Icon: FaFacebookF },
  { id: "tiktok", label: "TikTok", Icon: FaTiktok },
  { id: "whatsapp", label: "WhatsApp", Icon: FaWhatsapp },
  { id: "youtube", label: "YouTube", Icon: FaYoutube },
  { id: "linkedin", label: "LinkedIn", Icon: FaLinkedinIn },
  { id: "x", label: "X", Icon: FaXTwitter },
  { id: "telegram", label: "Telegram", Icon: FaTelegram },
  { id: "pinterest", label: "Pinterest", Icon: FaPinterestP },
  { id: "snapchat", label: "Snapchat", Icon: FaSnapchat },
  { id: "discord", label: "Discord", Icon: FaDiscord },
];

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
    socialIcon: isSocialIconId(value.socialIcon) ? value.socialIcon : "",
    socialIconColor: typeof value.socialIconColor === "string" && /^#[\da-f]{6}$/i.test(value.socialIconColor)
      ? value.socialIconColor
      : value.foregroundColor,
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
    ...(typeof value.trialEndsAt === "string" ? { trialEndsAt: value.trialEndsAt } : {}),
    ...(value.isTrial === true ? { isTrial: true } : {}),
    ...(typeof value.subscriptionId === "string" ? { subscriptionId: value.subscriptionId } : {}),
    ...(typeof value.nextPaymentDate === "string" ? { nextPaymentDate: value.nextPaymentDate } : {}),
  };
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function getTrialTimeRemaining(trialEndsAt: string, now: Date): string | null {
  const endTime = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(endTime)) return null;

  const remainingMinutes = Math.floor((endTime - now.getTime()) / (1000 * 60));
  if (remainingMinutes < 0) return "Período de teste encerrado";
  if (remainingMinutes === 0) return "Menos de 1 minuto restante";

  const days = Math.floor(remainingMinutes / (60 * 24));
  const hours = Math.floor((remainingMinutes % (60 * 24)) / 60);
  const minutes = remainingMinutes % 60;
  const parts: string[] = [];

  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (hours > 0 || days > 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  if (minutes > 0 && (days === 0 || hours === 0)) {
    parts.push(`${minutes} ${minutes === 1 ? "minuto" : "minutos"}`);
  }

  return `Restam ${parts.join(" e ")}`;
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

function getSavedQrContent(code: SavedQrCode) {
  return code.trackingEnabled
    ? new URL(`/q/${code.publicId}`, siteUrl).toString()
    : code.content;
}

async function renderSavedQrCode(code: SavedQrCode) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, getSavedQrContent(code), {
    errorCorrectionLevel: "H",
    margin: 4,
    width: 720,
    color: { dark: code.foregroundColor, light: code.backgroundColor },
  });

  if (code.logoDataUrl) {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível carregar o logo deste QR Code."));
      image.src = code.logoDataUrl;
    });
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar a imagem do QR Code.");

    const logoSize = canvas.width * 0.2;
    const backingSize = logoSize * 1.25;
    const center = canvas.width / 2;
    context.fillStyle = code.backgroundColor;
    context.beginPath();
    context.roundRect(
      center - backingSize / 2,
      center - backingSize / 2,
      backingSize,
      backingSize,
      backingSize * 0.12,
    );
    context.fill();
    context.drawImage(image, center - logoSize / 2, center - logoSize / 2, logoSize, logoSize);
  }

  return canvas;
}

async function renderSocialIconDataUrl(iconId: SocialIconId, color: string): Promise<string> {
  const option = SOCIAL_ICONS.find((item) => item.id === iconId);
  if (!option) throw new Error("Selecione um ícone de rede social válido.");

  const svg = renderToStaticMarkup(createElement(option.Icon, { color, size: 180 }));
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível preparar o ícone escolhido."));
      image.src = imageUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("O navegador não conseguiu preparar o ícone.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

export default function QrCodeDashboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const socialIconRequestRef = useRef(0);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const firebaseConfigured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
  const [content, setContent] = useState("seu-site-aqui.com.br");
  const [contentType, setContentType] = useState<"url" | "text">("url");
  const [foregroundColor, setForegroundColor] = useState("#243B2B");
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [socialIcon, setSocialIcon] = useState<SocialIconId | "">("");
  const [socialIconColor, setSocialIconColor] = useState("#243B2B");
  const [renderingSocialIcon, setRenderingSocialIcon] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "quarterly">("monthly");
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [error, setError] = useState(firebaseConfigured ? "" : "O painel ainda não está configurado. Tente novamente mais tarde.");
  const [notice, setNotice] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metricsCodeId, setMetricsCodeId] = useState("");
  const [metricsCodeName, setMetricsCodeName] = useState("");

  useEffect(() => {
    const initialTimeoutId = window.setTimeout(() => setToday(new Date()), 0);
    const intervalId = window.setInterval(() => setToday(new Date()), 60_000);
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!showProfileMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowProfileMenu(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showProfileMenu]);

  const refreshCodes = useCallback(async (currentUser: User) => {
    const body = await accountRequest(currentUser, "/api/account/qr-codes");
    if (!Array.isArray(body.codes)) throw new Error("A lista de QR Codes retornada é inválida.");
    const nextAccess = readAccess(body.access);
    if (!nextAccess) throw new Error("O plano da conta retornado é inválido.");

    const codesWithImages = await Promise.all(
      body.codes.map(async (code: unknown) => {
        const savedCode = readSavedCode(code);
        if (!savedCode) return null;

        // Gerar imagem do QR Code para preview
        try {
          const qrDataUrl = await QRCode.toDataURL(getSavedQrContent(savedCode), {
            width: 120,
            margin: 1,
            color: {
              dark: savedCode.foregroundColor,
              light: savedCode.backgroundColor,
            },
          });
          return { ...savedCode, qrImage: qrDataUrl };
        } catch {
          return savedCode;
        }
      })
    );

    setCodes(codesWithImages.filter((code): code is SavedQrCode => code !== null));
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
  const qrCanvasContent = previewContent || "https://www.lucrazi.com.br";
  const totalScans = codes.reduce((total, code) => total + (code.trackingEnabled ? code.scanCount : 0), 0);
  const dynamicCodes = codes.filter((code) => code.trackingEnabled).length;
  const trialTimeRemaining = access.isTrial && access.trialEndsAt
    ? today ? getTrialTimeRemaining(access.trialEndsAt, today) : null
    : null;
  const filteredCodes = codes.filter((code) =>
    `${code.name} ${code.content}`.toLocaleLowerCase("pt-BR").includes(codeSearch.trim().toLocaleLowerCase("pt-BR")),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setError("");
    QRCode.toCanvas(canvas, qrCanvasContent, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 360,
      color: { dark: foregroundColor, light: backgroundColor },
    }).then(() => {
      if (cancelled) return;
      if (!logoDataUrl) return;

      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) {
          setError("Seu navegador não conseguiu desenhar a prévia.");
          return;
        }
        const logoSize = canvas.width * 0.2;
        const backingSize = logoSize * 1.25;
        const center = canvas.width / 2;
        context.fillStyle = backgroundColor;
        context.beginPath();
        context.roundRect(
          center - backingSize / 2,
          center - backingSize / 2,
          backingSize,
          backingSize,
          backingSize * 0.12,
        );
        context.fill();
        context.drawImage(
          image,
          center - logoSize / 2,
          center - logoSize / 2,
          logoSize,
          logoSize,
        );
      };
      image.onerror = () => {
        if (!cancelled) setError("Não foi possível carregar o logo escolhido.");
      };
      image.src = logoDataUrl;
    }).catch((error: unknown) => {
      if (cancelled) return;
      console.error("Não foi possível gerar a prévia do QR Code.", error);
      setError("Não foi possível gerar a prévia. Confira o conteúdo informado.");
    });

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, foregroundColor, logoDataUrl, qrCanvasContent]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let cancelled = false;
      setError("");
      QRCode.toCanvas(canvas, qrCanvasContent, {
        errorCorrectionLevel: "H",
        margin: 4,
        width: 360,
        color: { dark: foregroundColor, light: backgroundColor },
      }).then(() => {
        if (cancelled) return;
        if (!logoDataUrl) return;

        const image = new Image();
        image.onload = () => {
          if (cancelled) return;
          const context = canvas.getContext("2d");
          if (!context) {
            setError("Seu navegador não conseguiu desenhar a prévia.");
            return;
          }
          const logoSize = canvas.width * 0.2;
          const backingSize = logoSize * 1.25;
          const center = canvas.width / 2;
          context.fillStyle = backgroundColor;
          context.beginPath();
          context.roundRect(
            center - backingSize / 2,
            center - backingSize / 2,
            backingSize,
            backingSize,
            backingSize * 0.12,
          );
          context.fill();
          context.drawImage(
            image,
            center - logoSize / 2,
            center - logoSize / 2,
            logoSize,
            logoSize,
          );
        };
        image.onerror = () => {
          if (!cancelled) setError("Não foi possível carregar o logo escolhido.");
        };
        image.src = logoDataUrl;
      }).catch((error: unknown) => {
        if (cancelled) return;
        console.error("Não foi possível gerar a prévia do QR Code.", error);
        setError("Não foi possível gerar a prévia. Confira o conteúdo informado.");
      });

      return () => {
        cancelled = true;
      };
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, backgroundColor, foregroundColor, logoDataUrl, qrCanvasContent]);

  function resetEditor() {
    socialIconRequestRef.current++;
    setSelectedId("");
    setPublicId("");
    setName("");
    setContent("seu-site-aqui.com.br");
    setContentType("url");
    setForegroundColor("#243B2B");
    setBackgroundColor("#FFFFFF");
    setLogoDataUrl("");
    setSocialIcon("");
    setSocialIconColor("#243B2B");
    setRenderingSocialIcon(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
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
    socialIconRequestRef.current++;
    setRenderingSocialIcon(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
    setSelectedId(code.id);
    setPublicId(code.publicId);
    setName(code.name);
    setContent(code.content);
    setContentType(code.contentType);
    setForegroundColor(code.foregroundColor);
    setBackgroundColor(code.backgroundColor);
    setLogoDataUrl(code.logoDataUrl || "");
    setSocialIcon(code.socialIcon);
    setSocialIconColor(code.socialIconColor);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function viewMetrics(code: SavedQrCode) {
    setMetricsCodeId(code.id);
    setMetricsCodeName(code.name);
    setShowMetricsModal(true);
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
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    const requestId = ++socialIconRequestRef.current;
    setError("");
    setRenderingSocialIcon(false);
    setSocialIcon("");
    setLogoDataUrl("");
    setSocialIconColor(foregroundColor);
    try {
      if (file.size > 256 * 1024 || !["image/png", "image/jpeg"].includes(file.type)) {
        throw new Error("Escolha um logo PNG ou JPEG de até 256 KB.");
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      if (requestId !== socialIconRequestRef.current) return;
      const validPng = bytes.length >= 8
        && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
      const validJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if ((file.type === "image/png" && !validPng) || (file.type === "image/jpeg" && !validJpeg)) {
        throw new Error("O arquivo não corresponde a uma imagem PNG ou JPEG válida.");
      }

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Não foi possível ler o logo."));
        };
        reader.onerror = () => reject(new Error("Não foi possível ler o logo."));
        reader.readAsDataURL(file);
      });
      if (requestId !== socialIconRequestRef.current) return;

      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("O arquivo não contém uma imagem PNG ou JPEG válida."));
        image.src = dataUrl;
      });
      if (requestId !== socialIconRequestRef.current) return;
      if (image.naturalWidth > 2048 || image.naturalHeight > 2048) {
        throw new Error("O logo precisa ter no máximo 2048 por 2048 pixels.");
      }
      setLogoDataUrl(dataUrl);
    } catch (logoError) {
      if (requestId === socialIconRequestRef.current) {
        setError(errorMessage(logoError));
        input.value = "";
      }
    }
  }

  async function selectSocialIcon(iconId: SocialIconId | "") {
    if (!iconId) {
      socialIconRequestRef.current++;
      setSocialIcon("");
      setLogoDataUrl("");
      setSocialIconColor(foregroundColor);
      setRenderingSocialIcon(false);
      setError("");
      if (logoInputRef.current) logoInputRef.current.value = "";
      return;
    }

    setSocialIcon(iconId);
    setLogoDataUrl("");
    setSocialIconColor(foregroundColor);
    setError("");
    if (logoInputRef.current) logoInputRef.current.value = "";
    const requestId = ++socialIconRequestRef.current;
    setRenderingSocialIcon(true);
    try {
      const dataUrl = await renderSocialIconDataUrl(iconId, foregroundColor);
      if (requestId === socialIconRequestRef.current) setLogoDataUrl(dataUrl);
    } catch (iconError) {
      if (requestId === socialIconRequestRef.current) setError(errorMessage(iconError));
    } finally {
      if (requestId === socialIconRequestRef.current) setRenderingSocialIcon(false);
    }
  }

  function handleForegroundColorChange(event: ChangeEvent<HTMLInputElement>) {
    const color = event.currentTarget.value;
    setForegroundColor(color);
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
      if (requestId === socialIconRequestRef.current) setError(errorMessage(iconError));
    } finally {
      if (requestId === socialIconRequestRef.current) setRenderingSocialIcon(false);
    }
  }

  async function saveCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    let normalizedContent = content.trim();
    if (contentType === "url") {
      // Adiciona https:// automaticamente se o usuário não colocou protocolo
      if (!/^https?:\/\//i.test(normalizedContent)) {
        normalizedContent = `https://${normalizedContent}`;
      }
      try {
        const url = new URL(normalizedContent);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        setError("Informe um endereço web válido.");
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
            socialIcon: access.hasLogo ? socialIcon : "",
            socialIconColor: access.hasLogo ? socialIconColor : "",
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

  async function downloadSavedPng(code: SavedQrCode) {
    try {
      const canvas = await renderSavedQrCode(code);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("O navegador não conseguiu preparar o PNG."));
        }, "image/png");
      });
      downloadFile(`qr-code-${code.name.trim().replace(/[^\p{L}\p{N}-]+/gu, "-") || code.id}.png`, blob, "image/png");
    } catch (downloadError) {
      setError(`Não foi possível baixar o PNG: ${errorMessage(downloadError)}`);
    }
  }

  async function downloadSavedSvg(code: SavedQrCode) {
    try {
      let svg = await QRCode.toString(getSavedQrContent(code), {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 4,
        width: 720,
        color: { dark: code.foregroundColor, light: code.backgroundColor },
      });
      if (code.logoDataUrl) {
        const escapedBackground = code.backgroundColor.replace(/[&<>"']/g, (character) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\"": "&quot;",
          "'": "&apos;",
        })[character] || character);
        const escapedLogo = code.logoDataUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        const overlay = `<rect x="38%" y="38%" width="24%" height="24%" rx="3%" fill="${escapedBackground}"/><image href="${escapedLogo}" x="40%" y="40%" width="20%" height="20%" preserveAspectRatio="xMidYMid meet"/>`;
        svg = svg.replace("</svg>", `${overlay}</svg>`);
      }
      const filename = code.name.trim().replace(/[^\p{L}\p{N}-]+/gu, "-") || code.id;
      downloadFile(`qr-code-${filename}.svg`, svg, "image/svg+xml;charset=utf-8");
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
        <div className="qr-account-nav">
          <Link className="qr-account-back" href="/ferramentas/gerador-qrcode-gratuito">Voltar ao gerador</Link>
          {user && (
            <div className="qr-profile-menu-wrap" ref={profileMenuRef}>
              <button
                aria-label="Abrir menu do perfil"
                aria-expanded={showProfileMenu}
                aria-haspopup="menu"
                className="qr-profile-trigger"
                onClick={() => setShowProfileMenu((open) => !open)}
                type="button"
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4"></circle>
                  <path d="M5 21v-2a7 7 0 0 1 14 0v2"></path>
                </svg>
              </button>
              {showProfileMenu && (
                <div className="qr-profile-menu" role="menu">
                  <span className="qr-profile-email">{user.email}</span>
                  <button
                    className="qr-profile-signout"
                    disabled={busy || billingBusy}
                    onClick={() => {
                      setShowProfileMenu(false);
                      void signOut(getFirebaseAuth());
                    }}
                    role="menuitem"
                    type="button"
                  >
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
            </header>
            <section className="qr-billing-card" aria-labelledby="qr-plan-heading">
              <div className="qr-billing-current">
                <div>
                  <span className="eyebrow">SEU PLANO</span>
                  <h2 id="qr-plan-heading">
                    {access.isTrial ? `Trial (${billingPlans[access.planId as PaidPlanId].name})` : access.planId === "free" ? "Grátis" : billingPlans[access.planId as PaidPlanId].name}
                    <span> · {codes.length}/{access.qrLimit} QR Codes</span>
                  </h2>
                  {access.isTrial && access.trialEndsAt ? (
                    <p className="qr-trial-summary">
                      {trialTimeRemaining && (
                        <span className="qr-trial-countdown" title={`Trial termina em ${new Date(access.trialEndsAt).toLocaleDateString("pt-BR")}`}>
                          {trialTimeRemaining}
                        </span>
                      )}
                      {trialTimeRemaining && " · "}
                      Trial válido até {new Date(access.trialEndsAt).toLocaleDateString("pt-BR")}
                    </p>
                  ) : (
                    <p>
                      {access.hasMetrics
                      ? `Métricas de escaneamento ativadas${access.nextPaymentDate ? ` · Próxima cobrança: ${new Date(access.nextPaymentDate).toLocaleDateString("pt-BR")}` : ""}.`
                      : "1 QR Code personalizado, sem métricas de escaneamento."}
                    </p>
                  )}
                </div>
                {access.isTrial ? (
                  <div className="qr-billing-actions">
                    <button className="qr-upgrade-button qr-trial-action" disabled={billingBusy} onClick={() => setShowUpgradeModal(true)} type="button">
                      {billingBusy ? "Aguarde…" : "Assinar após trial"}
                    </button>
                  </div>
                ) : access.status === "authorized" ? (
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
                  <button className="qr-upgrade-button" disabled={billingBusy} onClick={() => setShowUpgradeModal(true)} type="button">
                    {billingBusy ? "Aguarde…" : "Fazer upgrade"}
                  </button>
                )}
              </div>
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
                      placeholder={contentType === "url" ? "exemplo.com ou https://exemplo.com" : "Digite o texto"}
                    />
                    <span className="qr-field-hint">{content.length}/2048 caracteres. {contentType === "url" ? "O https:// será adicionado automaticamente se necessário." : ""}</span>
                  </div>
                  <fieldset className="qr-color-fields">
                    <legend>Cores do QR Code</legend>
                    <div className="qr-color-row">
                      <label htmlFor="qr-foreground">Código</label>
                      <input
                        id="qr-foreground"
                        type="color"
                        value={foregroundColor}
                        onChange={handleForegroundColorChange}
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
                    <span className="qr-field-label">Ícone no centro do QR Code</span>
                    <div className="qr-social-icons" role="group" aria-label="Escolher ícone de rede social">
                      <button
                        aria-pressed={socialIcon === ""}
                        className="qr-social-icon-option qr-social-icon-none"
                        disabled={renderingSocialIcon}
                        onClick={() => void selectSocialIcon("")}
                        type="button"
                      >
                        <span aria-hidden="true">×</span>
                        Sem ícone
                      </button>
                      {SOCIAL_ICONS.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          aria-label={label}
                          aria-pressed={socialIcon === id}
                          className="qr-social-icon-option"
                          disabled={renderingSocialIcon}
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
                        <label htmlFor="qr-social-icon-color">Ícone</label>
                        <input
                          id="qr-social-icon-color"
                          type="color"
                          value={socialIconColor}
                          disabled={renderingSocialIcon}
                          onChange={(event) => void handleSocialIconColorChange(event)}
                        />
                        <output htmlFor="qr-social-icon-color">{socialIconColor}</output>
                      </div>
                    )}
                    <span className="qr-field-hint">Ou envie seu próprio logo PNG ou JPEG (até 256 KB):</span>
                    <input
                      id="qr-logo"
                      ref={logoInputRef}
                      accept="image/png,image/jpeg"
                      onChange={(event) => void handleLogoChange(event)}
                      type="file"
                    />
                    <span className="qr-field-hint">
                      O ícone ou logo aparece na prévia e nos downloads. Para salvar essa personalização na conta, é necessário um plano pago.
                      {renderingSocialIcon ? " Preparando ícone…" : ""}
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
                      disabled={busy || renderingSocialIcon || !content.trim() || (!selectedId && codes.length >= access.qrLimit)}
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
              </section>
              <section className="qr-account-card qr-preview-section">
                <div className="qr-preview-header">
                  <span className="qr-preview-label">PRÉVIA EM TEMPO REAL</span>
                </div>
                <canvas
                  aria-label="Prévia do QR Code"
                  className="qr-preview-canvas"
                  ref={canvasRef}
                  role="img"
                  width={360}
                  height={360}
                />
                <p className="qr-preview-hint">Escaneie o código com a câmera antes de imprimir ou compartilhar.</p>
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
                        {code.qrImage && (
                          <div className="qr-code-preview">
                            <img src={code.qrImage} alt={`QR Code: ${code.name}`} />
                          </div>
                        )}
                        <div className="qr-code-details">
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
                            {code.trackingEnabled && (
                              <button onClick={() => viewMetrics(code)} disabled={busy} type="button" className="qr-action-button qr-action-metrics">Métricas</button>
                            )}
                            <button onClick={() => void downloadSavedPng(code)} disabled={busy} type="button" className="qr-action-button qr-action-download">Baixar PNG</button>
                            <button onClick={() => void downloadSavedSvg(code)} disabled={busy} type="button" className="qr-action-button qr-action-download">Baixar SVG</button>
                            <button onClick={() => editCode(code)} disabled={busy} type="button" className="qr-action-button qr-action-edit">Editar</button>
                            <button onClick={() => void removeCode(code)} disabled={busy} type="button" className="qr-action-button qr-action-delete">Excluir</button>
                          </div>
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

      {showUpgradeModal && (
        <div className="qr-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h2>Escolha seu plano</h2>
              <button className="qr-modal-close" onClick={() => setShowUpgradeModal(false)} type="button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="qr-modal-body">
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
                      <button className="button button-dark" disabled={billingBusy} onClick={() => {
                        setShowUpgradeModal(false);
                        void startCheckout(planId);
                      }} type="button">
                        {billingBusy ? "Abrindo…" : "Assinar"}
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="qr-plan-contact">Precisa de QR Codes ilimitados? <Link href="/contato">Fale conosco.</Link></p>
            </div>
          </div>
        </div>
      )}

      {showMetricsModal && user && (
        <QrMetricsDashboard
          user={user}
          codeId={metricsCodeId}
          codeName={metricsCodeName}
          onClose={() => setShowMetricsModal(false)}
        />
      )}
    </main>
  );
}
