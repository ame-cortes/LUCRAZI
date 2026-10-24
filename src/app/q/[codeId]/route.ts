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
  deviceType?: string;
  os?: string;
  browser?: string;
  timestamp: Date;
}

interface GeoLocation {
  city: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

function geoField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function geoCoordinate(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
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
    
    console.log("QR Code encontrado:", { 
      codeId, 
      contentType: data.contentType, 
      destination, 
      trackingEnabled: data.trackingEnabled,
      allData: data 
    });
    
    if (data.contentType !== "url" || !/^https?:\/\//i.test(destination)) {
      console.error("QR Code não possui destino válido:", { contentType: data.contentType, destination });
      return NextResponse.json({ error: "Este QR Code não possui um destino web válido." }, { status: 404 });
    }

    if (data.trackingEnabled === true) {
      const userId = codeDoc.ref.parent.parent?.id;
      console.log("Tentando registrar scan para userId:", userId);
      
      if (userId) {
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
          || request.headers.get("x-real-ip") 
          || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";
        const { os, browser, deviceType } = parseUserAgent(userAgent);
        
        console.log("Dados do scan:", { ip, os, browser, deviceType });
        
        // Get geo location (async, don't block redirect)
        const geoData = await getGeoLocation(ip);
        console.log("Geo location:", geoData);
        
        const scanData: ScanData = {
          ip,
          userAgent,
          city: geoData?.city || null,
          country: geoData?.country || null,
          region: geoData?.region || null,
          latitude: geoData?.latitude ?? null,
          longitude: geoData?.longitude ?? null,
          deviceType,
          os,
          browser,
          timestamp: new Date(),
        };

        try {
          await db.runTransaction(async (transaction) => {
            const billingRef = db.collection("users").doc(userId).collection("billing").doc("current");
            const [currentCode, billing] = await Promise.all([
              transaction.get(codeDoc.ref),
              transaction.get(billingRef),
            ]);
            
            const billingAccess = getBillingAccess(billing.data());
            console.log("Billing access:", { 
              hasMetrics: billingAccess.hasMetrics, 
              userId,
              billingData: billing.data()
            });
            
            if (!currentCode.exists) {
              console.error("QR Code não existe na transação");
              return;
            }
            
            if (!billingAccess.hasMetrics) {
              console.log("Skipping tracking - no metrics access");
              return;
            }
            
            console.log("Registrando scan...");
            
            // Increment scan count
            transaction.update(codeDoc.ref, {
              scanCount: FieldValue.increment(1),
              lastScannedAt: FieldValue.serverTimestamp(),
            });

            // Add detailed scan data to scans subcollection
            // Filter out undefined values to avoid Firestore errors
            const filteredScanData = Object.fromEntries(
              Object.entries(scanData).filter(([, value]) => value !== undefined)
            );
            const scanRef = codeDoc.ref.collection("scans").doc();
            transaction.set(scanRef, {
              ...filteredScanData,
              createdAt: FieldValue.serverTimestamp(),
            });
            
            console.log("Scan registrado com sucesso");
          });
        } catch (transactionError) {
          console.error("Erro na transação de tracking:", transactionError);
          // Não bloqueia o redirect se o tracking falhar
        }
      } else {
        console.error("userId não encontrado");
      }
    } else {
      console.log("Tracking não habilitado para este QR Code");
    }

    console.log("Redirecionando para:", destination);
    return NextResponse.redirect(destination, { status: 302 });
  } catch (error) {
    console.error("Não foi possível encaminhar o QR Code:", error);
    return NextResponse.json({ error: "Este QR Code está temporariamente indisponível." }, { status: 503 });
  }
}
