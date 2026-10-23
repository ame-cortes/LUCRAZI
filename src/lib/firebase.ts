import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let appCheck: AppCheck | undefined;

function getFirebaseConfig() {
  const values = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  const required = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", values.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", values.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", values.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", values.appId],
  ] as const;
  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Configure as variáveis Firebase ausentes: ${missing.join(", ")}.`);
  }

  return values;
}

export function isFirebaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    && process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    && process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  );
}

export function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function getPersistentFirebaseAuth() {
  const auth = getFirebaseAuth();
  await setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}

export async function getFirebaseAppCheck() {
  if (typeof window === "undefined") {
    throw new Error("A proteção do formulário só pode ser inicializada no navegador.");
  }

  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  if (!siteKey) {
    throw new Error("Configure NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY antes de habilitar inscrições.");
  }

  if (!appCheck) {
    appCheck = initializeAppCheck(getFirebaseApp(), {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  return appCheck;
}
