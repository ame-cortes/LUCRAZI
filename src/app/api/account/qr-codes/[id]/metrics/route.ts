import { NextResponse } from "next/server";
import { getFirebaseAdminDb, verifyFirebaseIdToken } from "@/lib/firebase-admin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseDateRange(startValue: string | null, endValue: string | null): { start: Date; end: Date } | null {
  if (!startValue || !endValue || !/^\d{4}-\d{2}-\d{2}$/.test(startValue) || !/^\d{4}-\d{2}-\d{2}$/.test(endValue)) {
    return null;
  }

  const start = new Date(`${startValue}T00:00:00.000Z`);
  const end = new Date(`${endValue}T23:59:59.999Z`);
  if (
    !Number.isFinite(start.getTime())
    || !Number.isFinite(end.getTime())
    || start.toISOString().slice(0, 10) !== startValue
    || end.toISOString().slice(0, 10) !== endValue
    || end < start
  ) return null;

  const maxEnd = new Date(start);
  const day = maxEnd.getUTCDate();
  maxEnd.setUTCDate(1);
  maxEnd.setUTCMonth(maxEnd.getUTCMonth() + 24);
  const lastDayOfMaxMonth = new Date(Date.UTC(maxEnd.getUTCFullYear(), maxEnd.getUTCMonth() + 1, 0)).getUTCDate();
  maxEnd.setUTCDate(Math.min(day, lastDayOfMaxMonth));
  if (end > maxEnd) return null;

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
  const startValue = searchParams.get("start");
  const endValue = searchParams.get("end");
  const dateRange = parseDateRange(startValue, endValue);
  if (!dateRange) {
    return jsonError("Selecione um período válido de até 24 meses.", 400);
  }

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

    const { start, end } = dateRange;

    // Get scans within date range
    const scansQuery = codeRef.collection("scans")
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", end)
      .orderBy("createdAt", "desc");
    const scanDocuments = [];
    const pageSize = 1000;
    let scansSnapshot = await scansQuery.limit(pageSize).get();
    scanDocuments.push(...scansSnapshot.docs);
    while (scansSnapshot.size === pageSize) {
      const lastDocument = scansSnapshot.docs[scansSnapshot.docs.length - 1];
      if (!lastDocument) break;
      scansSnapshot = await scansQuery.startAfter(lastDocument).limit(pageSize).get();
      scanDocuments.push(...scansSnapshot.docs);
    }

    const scans = scanDocuments.map(doc => {
      const data = doc.data();
      return {
        ip: data.ip,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        city: data.city,
        country: data.country,
        region: data.region,
        latitude: data.latitude,
        longitude: data.longitude,
        locationSource: data.locationSource,
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
    
    const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const daysDiff = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24)) + 1;
    const monthlyAggregation = daysDiff > 31;
    const startMonth = start.getUTCFullYear() * 12 + start.getUTCMonth();
    const endMonth = end.getUTCFullYear() * 12 + end.getUTCMonth();
    const periodCount = monthlyAggregation ? endMonth - startMonth + 1 : daysDiff;
    const scansByDate = new Array(periodCount).fill(0);
    const dateLabels: string[] = [];

    // Device metrics
    const devicesByType = new Map<string, number>();
    const devicesByOS = new Map<string, number>();
    const devicesByBrowser = new Map<string, number>();

    // Geographic metrics
    const scansByCity = new Map<string, number>();
    const scansByCountry = new Map<string, number>();
    const scansByRegion = new Map<string, number>();
    const scansByLocation = new Map<string, {
      city: string | null;
      region: string | null;
      latitude: number | null;
      longitude: number | null;
      locationSource: "browser" | "ip" | "mixed";
      count: number;
    }>();

    scans.forEach(scan => {
      const date = scan.timestamp;
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      const scanDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const dayIndex = Math.floor((scanDay - startDay) / (1000 * 60 * 60 * 24));
      const periodIndex = monthlyAggregation
        ? date.getUTCFullYear() * 12 + date.getUTCMonth() - startMonth
        : dayIndex;
      
      // Time metrics
      scansByHour[hour]++;
      scansByDay[day]++; // Day of week (0-6)
      if (periodIndex >= 0 && periodIndex < scansByDate.length) {
        scansByDate[periodIndex]++;
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
      if (scan.city || scan.region || (typeof scan.latitude === "number" && typeof scan.longitude === "number")) {
        const locationSource = scan.locationSource === "browser" ? "browser" : "ip";
        const latitude = locationSource === "browser" && typeof scan.latitude === "number" &&
          Number.isFinite(scan.latitude) &&
          scan.latitude >= -90 &&
          scan.latitude <= 90
          ? Math.round(scan.latitude * 10_000) / 10_000
          : null;
        const longitude = locationSource === "browser" && typeof scan.longitude === "number" &&
          Number.isFinite(scan.longitude) &&
          scan.longitude >= -180 &&
          scan.longitude <= 180
          ? Math.round(scan.longitude * 10_000) / 10_000
          : null;
        const locationKey = latitude !== null && longitude !== null
          ? `${latitude},${longitude},${scan.city || ""},${scan.region || ""},${locationSource}`
          : `${scan.city || ""},${scan.region || ""},${locationSource}`;
        const existingLocation = scansByLocation.get(locationKey);
        if (existingLocation) {
          existingLocation.count++;
        } else {
          scansByLocation.set(locationKey, {
            city: scan.city || null,
            region: scan.region || null,
            latitude,
            longitude,
            locationSource,
            count: 1,
          });
        }
      }
    });

    // Use machine-readable labels to avoid parsing localized dates as unrelated years.
    for (let i = 0; i < scansByDate.length; i++) {
      const labelDate = new Date(startDay);
      if (monthlyAggregation) {
        labelDate.setUTCDate(1);
        labelDate.setUTCMonth(labelDate.getUTCMonth() + i);
        dateLabels.push(labelDate.toISOString().slice(0, 7));
      } else {
        labelDate.setUTCDate(labelDate.getUTCDate() + i);
        dateLabels.push(labelDate.toISOString().slice(0, 10));
      }
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
      monthlyAggregation,
      scansByDay,  // Keep for backward compat (day of week distribution)
      topCities,
      topCountries,
      topRegions,
      scansByRegion: Array.from(scansByRegion.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count),
      scanLocations: Array.from(scansByLocation.values()),
      deviceTypes,
      operatingSystems,
      browsers,
      lastUpdated: new Date().toISOString(),
      range: { start: startValue, end: endValue },
    });
  } catch (error) {
    console.error("Não foi possível carregar as métricas.", error);
    return jsonError("Não foi possível carregar as métricas. Tente novamente mais tarde.", 503);
  }
}
