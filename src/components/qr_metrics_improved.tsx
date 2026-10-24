"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "firebase/auth";

interface MetricsData {
  totalScans: number;
  uniqueUsers: number;
  scansByHour: number[];
  scansByDate: number[]; 
  dateLabels: string[];
  topCities: { city: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topRegions: { region: string; count: number }[];
  deviceTypes: { type: string; count: number; percentage: number }[];
  operatingSystems: { os: string; count: number; percentage: number }[];
  browsers: { browser: string; count: number; percentage: number }[];
  lastUpdated: string;
  range: string;
}

interface QrMetricsDashboardProps {
  user: User;
  codeId: string;
  codeName: string;
  onClose: () => void;
}

export default function QrMetricsDashboard({ user, codeId, codeName, onClose }: QrMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async (currentRange: string) => {
    setLoading(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/account/qr-codes/${codeId}/metrics?range=${currentRange}`, {
        headers: { authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Não foi possível carregar as métricas.");
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [user, codeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMetrics(range);
  }, [range, loadMetrics]);

  const downloadCsv = () => {
    if (!metrics) return;
    const rows = [["Métrica", "Valor"],["Total de Escaneamentos", metrics.totalScans],["Usuários Únicos", metrics.uniqueUsers],["Período", range]];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `metricas-${codeName.replace(/ /g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !metrics) return <div className="qr-modal-overlay" onClick={onClose}><div className="qr-modal-content" onClick={(e) => e.stopPropagation()}><div className="qr-modal-header"><h2>Carregando métricas…</h2></div></div></div>;

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content qr-metrics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div><h2>Métricas: {codeName}</h2>{metrics && <p className="qr-metrics-updated">Atualizado: {new Date(metrics.lastUpdated).toLocaleTimeString("pt-BR")}</p>}</div>
          <div className="qr-metrics-actions">
            <button className="qr-secondary-button" onClick={() => loadMetrics(range)} type="button">Atualizar</button>
            <button className="qr-modal-close" onClick={onClose} type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
        <div className="qr-modal-body qr-metrics-body">
          <div className="qr-metrics-range">
            <button aria-pressed={range === "7d"} onClick={() => setRange("7d")}>7 dias</button>
            <button aria-pressed={range === "30d"} onClick={() => setRange("30d")}>30 dias</button>
            <button aria-pressed={range === "all"} onClick={() => setRange("all")}>Todo o período</button>
            <button className="qr-secondary-button" onClick={downloadCsv}>Baixar CSV</button>
          </div>
          {error && <p className="admin-error">{error}</p>}
          {metrics && (
            <div className="qr-metrics-cards">
              <article className="qr-metric-card"><span>Total</span><strong>{metrics.totalScans}</strong></article>
              <article className="qr-metric-card"><span>Únicos</span><strong>{metrics.uniqueUsers}</strong></article>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}