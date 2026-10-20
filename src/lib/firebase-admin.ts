import "server-only";

import { decodeProtectedHeader, importX509, jwtVerify, type CryptoKey } from "jose";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const firebaseAuthCertUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

type SecureTokenCertificates = Record<string, string>;

let certificateCache: { certificates: SecureTokenCertificates; expiresAt: number } | undefined;
const publicKeyCache = new Map<string, Promise<CryptoKey>>();

type ServiceAccountJson = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringRecord(value: unknown): value is SecureTokenCertificates {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

export function getFirebaseAdminApp() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON não está configurada.");
  }

  let account: ServiceAccountJson;
  try {
    const parsed: unknown = JSON.parse(rawServiceAccount);
    if (!isRecord(parsed)) {
      throw new Error("A credencial precisa ser um objeto JSON.");
    }
    account = parsed;
  } catch (error) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido.", error);
    throw new Error("A credencial Firebase do servidor está inválida.");
  }

  if (
    typeof account.project_id !== "string"
    || typeof account.client_email !== "string"
    || typeof account.private_key !== "string"
  ) {
    throw new Error("A credencial Firebase do servidor não contém os campos necessários.");
  }

  const expectedProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!expectedProjectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID não está configurada.");
  }
  if (account.project_id !== expectedProjectId) {
    throw new Error("A credencial Firebase do servidor pertence a outro projeto.");
  }

  const existingApp = getApps().find((app) => app.name === "newsletter-server");
  if (existingApp) return existingApp;

  const serviceAccount: ServiceAccount = {
    projectId: account.project_id,
    clientEmail: account.client_email,
    privateKey: account.private_key,
  };

  return initializeApp(
    { credential: cert(serviceAccount), projectId: account.project_id },
    "newsletter-server",
  );
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

async function getSecureTokenCertificates(forceRefresh = false) {
  if (!forceRefresh && certificateCache && certificateCache.expiresAt > Date.now()) {
    return certificateCache.certificates;
  }

  const response = await fetch(firebaseAuthCertUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Não foi possível obter os certificados do Firebase Auth (HTTP ${response.status}).`);
  }
  const certificates: unknown = await response.json();
  if (!isStringRecord(certificates)) {
    throw new Error("O Firebase Auth retornou certificados em formato inválido.");
  }

  const maxAge = response.headers.get("cache-control")?.match(/max-age=(\d+)/i)?.[1];
  const cacheDuration = maxAge ? Number(maxAge) * 1000 : 60 * 60 * 1000;
  certificateCache = {
    certificates,
    expiresAt: Date.now() + cacheDuration,
  };
  publicKeyCache.clear();
  return certificateCache.certificates;
}

async function resolveFirebaseAuthKey(kid: string, forceRefresh = false): Promise<CryptoKey> {
  const certificates = await getSecureTokenCertificates(forceRefresh);
  const certificate = certificates[kid];
  if (!certificate) {
    if (!forceRefresh) return resolveFirebaseAuthKey(kid, true);
    throw new Error("O token Firebase Auth usa um certificado desconhecido.");
  }

  const cachedKey = publicKeyCache.get(kid);
  if (cachedKey) return cachedKey;
  const key = importX509(certificate, "RS256");
  publicKeyCache.set(kid, key);
  return key;
}

export async function verifyFirebaseIdToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return null;

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID não está configurada.");
    const untrustedHeader = decodeProtectedHeader(match[1]);
    if (
      untrustedHeader.alg !== "RS256"
      || untrustedHeader.typ !== "JWT"
      || typeof untrustedHeader.kid !== "string"
    ) return null;
    const { payload, protectedHeader } = await jwtVerify(
      match[1],
      async (header) => {
        if (typeof header.kid !== "string") {
          throw new Error("O token Firebase Auth não tem identificador de chave.");
        }
        return resolveFirebaseAuthKey(header.kid);
      },
      {
        algorithms: ["RS256"],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        requiredClaims: ["exp", "iat", "auth_time", "sub"],
      },
    );
    const now = Math.floor(Date.now() / 1000);
    if (
      protectedHeader.typ !== "JWT"
      || typeof payload.sub !== "string"
      || payload.sub.length === 0
      || payload.sub.length > 128
      || typeof payload.iat !== "number"
      || payload.iat > now + 60
      || typeof payload.auth_time !== "number"
      || payload.auth_time > now + 60
    ) return null;

    return { uid: payload.sub };
  } catch (error) {
    console.warn("A solicitação não apresentou um token Firebase Auth válido.", error);
    return null;
  }
}

export async function verifyNewsletterAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer (.+)$/);
  if (!match) return null;

  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID não está configurada.");
    const untrustedHeader = decodeProtectedHeader(match[1]);
    if (
      untrustedHeader.alg !== "RS256"
      || untrustedHeader.typ !== "JWT"
      || typeof untrustedHeader.kid !== "string"
    ) return null;
    const { payload, protectedHeader } = await jwtVerify(
      match[1],
      async (header) => {
        if (typeof header.kid !== "string") {
          throw new Error("O token Firebase Auth não tem identificador de chave.");
        }
        return resolveFirebaseAuthKey(header.kid);
      },
      {
        algorithms: ["RS256"],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`,
        requiredClaims: ["exp", "iat", "auth_time", "sub"],
      },
    );
    const now = Math.floor(Date.now() / 1000);
    if (
      protectedHeader.typ !== "JWT"
      || typeof payload.sub !== "string"
      || payload.sub.length === 0
      || payload.sub.length > 128
      || typeof payload.iat !== "number"
      || payload.iat > now + 60
      || typeof payload.auth_time !== "number"
      || payload.auth_time > now + 60
    ) return null;

    const admin = await getFirestore(getFirebaseAdminApp()).doc(`admins/${payload.sub}`).get();
    if (admin.data()?.allowAdmin !== true) return null;
    return { uid: payload.sub };
  } catch (error) {
    console.warn("A solicitação não apresentou uma credencial administrativa válida.", error);
    return null;
  }
}
