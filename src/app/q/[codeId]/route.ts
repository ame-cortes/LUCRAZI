import { isIP } from "node:net";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getBillingAccess } from "@/lib/billing-plans";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

interface ScanData {
  ip: string;
  userAgent: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationSource?: "browser" | "ip";
  deviceType?: string;
  os?: string;
  browser?: string;
}

interface GeoLocation {
  city: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function geoField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function geoCoordinate(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
}

function blurCoordinate(value: number, cellSize: number): number {
  return (Math.floor(value / cellSize) + 0.5) * cellSize;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "\"": return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

function createGeolocationBridgePage(codeId: string, destination: string): Response {
  const safeDestination = escapeHtml(destination);
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Redirecionando…</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:#f5f6f0;color:#243127;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
    main{width:min(100%,360px);padding:24px;border:1px solid #e0e3d8;border-radius:16px;background:#fff;text-align:center}
    p{margin:0;color:#667064;font-size:14px;line-height:1.5}a{display:inline-block;margin-top:14px;color:#4e6c2d;font-size:13px}
    #fallback[hidden]{display:none}
  </style>
</head>
<body>
  <main>
    <p role="status" aria-live="polite">Se o navegador perguntar, permita a localização para mostrar uma área aproximada nas métricas. Se não permitir, o QR Code continua abrindo; nesse caso, usamos somente cidade/região estimada pelo IP.</p>
    <a id="fallback" href="${safeDestination}" rel="noreferrer" hidden>Abrir destino</a>
  </main>
  <script>
    (() => {
      const fallback = document.getElementById("fallback");
      let completed = false;

      async function finishScan(position) {
        if (completed) return;
        completed = true;
        const body = position ? {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        } : {};
        try {
          const response = await fetch("/q/${codeId}", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            cache: "no-store",
            credentials: "same-origin"
          });
          const result = await response.json();
          if (!response.ok || typeof result.redirectUrl !== "string") {
            throw new Error("Não foi possível concluir o redirecionamento.");
          }
          window.location.replace(result.redirectUrl);
        } catch {
          fallback.hidden = false;
          window.location.replace(fallback.href);
        }
      }

      if (!navigator.geolocation) {
        finishScan(null);
        return;
      }
      window.setTimeout(() => finishScan(null), 7000);
      navigator.geolocation.getCurrentPosition(
        (position) => finishScan(position),
        () => finishScan(null),
        { enableHighAccuracy: true, maximumAge: 300000, timeout: 6000 }
      );
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, private",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "permissions-policy": "geolocation=(self)",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}

function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase();
  
  // Detect OS
  let os = "Other";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os") || ua.includes("macos")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  // Detect Browser
  let browser = "Other";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("instagram")) browser = "Instagram";
  else if (ua.includes("whatsapp")) browser = "WhatsApp";

  // Detect Device Type
  let deviceType = "Desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    deviceType = "Mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "Tablet";
  }

  return { os, browser, deviceType };
}

async function getGeoLocation(ip: string) {
  if (isIP(ip) === 0 || ip === "127.0.0.1" || ip === "::1") {
    return null;
  }

  const providers = [
    {
      name: "ipwho.is",
      url: `https://ipwho.is/${encodeURIComponent(ip)}`,
      parse(data: Record<string, unknown>): GeoLocation | null {
        if (data.success !== true) return null;
        return {
          city: geoField(data.city),
          country: geoField(data.country),
          region: geoField(data.region),
          latitude: geoCoordinate(data.latitude, -90, 90),
          longitude: geoCoordinate(data.longitude, -180, 180),
        };
      },
    },
    {
      name: "ipapi.co",
      url: `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
      parse(data: Record<string, unknown>): GeoLocation | null {
        if (data.error === true) return null;
        return {
          city: geoField(data.city),
          country: geoField(data.country_name) || geoField(data.country),
          region: geoField(data.region),
          latitude: geoCoordinate(data.latitude, -90, 90),
          longitude: geoCoordinate(data.longitude, -180, 180),
        };
      },
    },
  ];
  const deadline = Date.now() + 5000;

  for (const provider of providers) {
    try {
      const remainingTime = deadline - Date.now();
      if (remainingTime <= 0) break;

      const response = await fetch(provider.url, {
        signal: AbortSignal.timeout(remainingTime),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Invalid response body");
      }

      const geoLocation = provider.parse(data as Record<string, unknown>);
      if (geoLocation && (geoLocation.city || geoLocation.country || geoLocation.region)) {
        return geoLocation;
      }
      throw new Error("Provider returned no location data");
    } catch (error) {
      console.error(`Geolocation provider ${provider.name} failed:`, error);
    }
  }

  console.error("Geolocation unavailable for scan");
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ codeId: string }> },
) {
  const { codeId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(codeId)) {
    return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
  }

  try {
    const db = getFirebaseAdminDb();
    const result = await db.collectionGroup("qrCodes")
      .where("publicId", "==", codeId)
      .limit(1)
      .get();
    const codeDoc = result.docs[0];
    if (!codeDoc) {
      console.error("QR Code não encontrado:", codeId);
      return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
    }

    const data = codeDoc.data();
    const destination = typeof data.content === "string" ? data.content : "";
    if (data.contentType !== "url" || !/^https?:\/\//i.test(destination)) {
      return NextResponse.json({ error: "Este QR Code não possui um destino web válido." }, { status: 404 });
    }

    const userId = codeDoc.ref.parent.parent?.id;
    if (data.trackingEnabled === true && userId) {
      const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
      const billing = await billingRef.get();
      if (getBillingAccess(billing.data()).hasMetrics) {
        return createGeolocationBridgePage(codeId, destination);
      }
    }

    return NextResponse.redirect(destination, { status: 302 });
  } catch (error) {
    console.error("Não foi possível encaminhar o QR Code:", error);
    return NextResponse.json({ error: "Este QR Code está temporariamente indisponível." }, { status: 503 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ codeId: string }> },
) {
  const { codeId } = await params;
  if (!/^[a-f\d-]{36}$/i.test(codeId)) {
    return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origem da solicitação inválida." }, { status: 403 });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 2048) {
    return NextResponse.json({ error: "Dados de localização inválidos." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados de localização inválidos." }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Dados de localização inválidos." }, { status: 400 });
  }

  const hasLatitude = body.latitude !== undefined;
  const hasLongitude = body.longitude !== undefined;
  const latitude = hasLatitude ? geoCoordinate(body.latitude, -90, 90) : null;
  const longitude = hasLongitude ? geoCoordinate(body.longitude, -180, 180) : null;
  const accuracy = geoCoordinate(body.accuracy, 0, 500);
  if (hasLatitude !== hasLongitude || (hasLatitude && (latitude === null || longitude === null))) {
    return NextResponse.json({ error: "Coordenadas de localização inválidas." }, { status: 400 });
  }

  try {
    const db = getFirebaseAdminDb();
    const result = await db.collectionGroup("qrCodes")
      .where("publicId", "==", codeId)
      .limit(1)
      .get();
    const codeDoc = result.docs[0];
    if (!codeDoc) {
      return NextResponse.json({ error: "QR Code não encontrado." }, { status: 404 });
    }

    const data = codeDoc.data();
    const destination = typeof data.content === "string" ? data.content : "";
    if (data.contentType !== "url" || !/^https?:\/\//i.test(destination)) {
      return NextResponse.json({ error: "Este QR Code não possui um destino web válido." }, { status: 404 });
    }

    const userId = codeDoc.ref.parent.parent?.id;
    if (data.trackingEnabled !== true || !userId) {
      return NextResponse.json({ redirectUrl: destination });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const { os, browser, deviceType } = parseUserAgent(userAgent);
    const geoData = await getGeoLocation(ip);
    const browserLocationProvided = latitude !== null && longitude !== null && accuracy !== null;
    const scanData: ScanData = {
      ip,
      userAgent,
      city: geoData?.city ?? null,
      country: geoData?.country ?? null,
      region: geoData?.region ?? null,
      latitude: browserLocationProvided
        ? blurCoordinate(latitude, 0.0025)
        : geoData?.latitude !== null && geoData?.latitude !== undefined
          ? blurCoordinate(geoData.latitude, 0.1)
          : null,
      longitude: browserLocationProvided
        ? blurCoordinate(longitude, 0.0025)
        : geoData?.longitude !== null && geoData?.longitude !== undefined
          ? blurCoordinate(geoData.longitude, 0.1)
          : null,
      locationSource: browserLocationProvided ? "browser" : "ip",
      deviceType,
      os,
      browser,
    };

    try {
      await db.runTransaction(async (transaction) => {
        const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
        const [currentCode, billing] = await Promise.all([
          transaction.get(codeDoc.ref),
          transaction.get(billingRef),
        ]);
        if (!currentCode.exists || !getBillingAccess(billing.data()).hasMetrics) return;

        transaction.update(codeDoc.ref, {
          scanCount: FieldValue.increment(1),
          lastScannedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(codeDoc.ref.collection("scans").doc(), {
          ...scanData,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (transactionError) {
      console.error("Não foi possível registrar as métricas do scan.", transactionError);
    }

    return NextResponse.json({ redirectUrl: destination });
  } catch (error) {
    console.error("Não foi possível processar o scan do QR Code.", error);
    return NextResponse.json({ error: "Este QR Code está temporariamente indisponível." }, { status: 503 });
  }
}
