import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para acessar as métricas.", 401);

  const { id } = await params;

  try {
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(account.uid);
    const codeRef = userRef.collection("qrCodes").doc(id);
    
    const codeDoc = await codeRef.get();
    if (!codeDoc.exists) {
      return jsonError("QR Code não encontrado.", 404);
    }

    const codeData = codeDoc.data();
    if (!codeData?.trackingEnabled) {
      return jsonError("Este QR Code não tem métricas ativadas.", 400);
    }

    // Get all scans
    const scansSnapshot = await codeRef.collection("scans")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .get();

    const scans = scansSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ip: data.ip,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        city: data.city,
        country: data.country,
        region: data.region,
        deviceType: data.deviceType,
        os: data.os,
        browser: data.browser,
      };
    });

    // Calculate metrics
    const totalScans = scans.length;
    const uniqueIPs = new Set(scans.map(s => s.ip || "unknown")).size;
    
    // Time-based metrics
    const scansByHour = new Array(24).fill(0);
    const scansByDay = new Array(7).fill(0);

    // Device metrics
    const devicesByType = new Map<string, number>();
    const devicesByOS = new Map<string, number>();
    const devicesByBrowser = new Map<string, number>();

    // Geographic metrics
    const scansByCity = new Map<string, number>();
    const scansByCountry = new Map<string, number>();
    const scansByRegion = new Map<string, number>();

    scans.forEach(scan => {
      const date = scan.timestamp;
      const hour = date.getHours();
      const day = date.getDay();

      // Time metrics
      scansByHour[hour]++;
      scansByDay[day]++;

      // Device metrics
      devicesByType.set(scan.deviceType || "Unknown", (devicesByType.get(scan.deviceType || "Unknown") || 0) + 1);
      devicesByOS.set(scan.os || "Unknown", (devicesByOS.get(scan.os || "Unknown") || 0) + 1);
      devicesByBrowser.set(scan.browser || "Unknown", (devicesByBrowser.get(scan.browser || "Unknown") || 0) + 1);

      // Geographic metrics
      if (scan.city) {
        scansByCity.set(scan.city, (scansByCity.get(scan.city) || 0) + 1);
      }
      if (scan.country) {
        scansByCountry.set(scan.country, (scansByCountry.get(scan.country) || 0) + 1);
      }
      if (scan.region) {
        scansByRegion.set(scan.region, (scansByRegion.get(scan.region) || 0) + 1);
      }
    });

    // Convert maps to arrays and sort
    const topCities = Array.from(scansByCity.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topCountries = Array.from(scansByCountry.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topRegions = Array.from(scansByRegion.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const deviceTypes = Array.from(devicesByType.entries())
      .map(([type, count]) => ({ type, count, percentage: (count / totalScans) * 100 }));

    const operatingSystems = Array.from(devicesByOS.entries())
      .map(([os, count]) => ({ os, count, percentage: (count / totalScans) * 100 }));

    const browsers = Array.from(devicesByBrowser.entries())
      .map(([browser, count]) => ({ browser, count, percentage: (count / totalScans) * 100 }));

    return NextResponse.json({
      totalScans,
      uniqueUsers: uniqueIPs,
      scansByHour,
      scansByDay,
      topCities,
      topCountries,
      topRegions,
      deviceTypes,
      operatingSystems,
      browsers,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Não foi possível carregar as métricas.", error);
    return jsonError("Não foi possível carregar as métricas. Tente novamente mais tarde.", 503);
  }
}
