import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseDateRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  switch (range) {
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 6); // Last 7 days including today
      start.setHours(0, 0, 0, 0);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 29); // Last 30 days including today
      start.setHours(0, 0, 0, 0);
      break;
    case "all":
    default:
      start = new Date(0); // Unix epoch
      break;
  }
  return { start, end };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const account = await verifyFirebaseIdToken(request);
  if (!account) return jsonError("Entre na sua conta para acessar as métricas.", 401);

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "all"; // 7d, 30d, all

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

    const { start, end } = parseDateRange(range);

    // Get scans within date range
    const scansSnapshot = await codeRef.collection("scans")
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", end)
      .orderBy("createdAt", "desc")
      .limit(5000) // Increased limit for better coverage
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
    const scansByDay = new Array(7).fill(0); // Keep for backward compat (day of week)
    
    // For daily metrics, create array for each day in range
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const scansByDate = new Array(Math.min(daysDiff, 31)).fill(0); // Max 31 days for chart
    const dateLabels: string[] = [];

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
      const dayIndex = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      // Time metrics
      scansByHour[hour]++;
      scansByDay[day]++; // Day of week (0-6)
      if (dayIndex >= 0 && dayIndex < scansByDate.length) {
        scansByDate[dayIndex]++;
      }

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

    // Generate date labels for the chart
    for (let i = 0; i < scansByDate.length; i++) {
      const labelDate = new Date(start);
      labelDate.setDate(labelDate.getDate() + i);
      dateLabels.push(labelDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
    }

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
      .map(([type, count]) => ({ type, count, percentage: totalScans > 0 ? (count / totalScans) * 100 : 0 }));

    const operatingSystems = Array.from(devicesByOS.entries())
      .map(([os, count]) => ({ os, count, percentage: totalScans > 0 ? (count / totalScans) * 100 : 0 }));

    const browsers = Array.from(devicesByBrowser.entries())
      .map(([browser, count]) => ({ browser, count, percentage: totalScans > 0 ? (count / totalScans) * 100 : 0 }));

    return NextResponse.json({
      totalScans,
      uniqueUsers: uniqueIPs,
      scansByHour,
      scansByDate, // New: actual daily data for the selected range
      dateLabels,  // New: labels for the daily chart
      scansByDay,  // Keep for backward compat (day of week distribution)
      topCities,
      topCountries,
      topRegions,
      scansByRegion: Array.from(scansByRegion.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count),
      deviceTypes,
      operatingSystems,
      browsers,
      lastUpdated: new Date().toISOString(),
      range,       // Echo back the range used
    });
  } catch (error) {
    console.error("Não foi possível carregar as métricas.", error);
    return jsonError("Não foi possível carregar as métricas. Tente novamente mais tarde.", 503);
  }
}
