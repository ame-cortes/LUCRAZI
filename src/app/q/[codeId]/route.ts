import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { getBillingAccess } from "@/lib/billing-plans";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";

interface ScanData {
  ip: string;
  userAgent: string;
  city?: string;
  country?: string;
  region?: string;
  deviceType?: string;
  os?: string;
  browser?: string;
  timestamp: Date;
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
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      city: data.city || undefined,
      country: data.country_name || undefined,
      region: data.region || undefined,
    };
  } catch {
    return null;
  }
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
          city: geoData?.city,
          country: geoData?.country,
          region: geoData?.region,
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
              Object.entries(scanData).filter(([_, value]) => value !== undefined)
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
