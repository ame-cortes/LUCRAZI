"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { User } from "firebase/auth";

interface MetricsData {
  totalScans: number;
  uniqueUsers: number;
  scansByHour: number[];
  scansByDay: number[];
  scansByDate: number[];
  dateLabels: string[];
  monthlyAggregation: boolean;
  topCities: { city: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topRegions: { region: string; count: number }[];
  scansByRegion: { region: string; count: number }[];
  scanLocations: {
    city: string | null;
    region: string | null;
    latitude: number | null;
    longitude: number | null;
    count: number;
  }[];
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

const HOURS = ["00h", "02h", "04h", "06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addCalendarMonths(value: string, months: number) {
  const [year, month, day] = value.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonth.setUTCDate(Math.min(day, lastDay));
  return targetMonth.toISOString().slice(0, 10);
}

function isValidDateRange(start: string, end: string, today: string) {
  return Boolean(start && end && start <= end && end <= today && end <= addCalendarMonths(start, 24));
}

const QrMetricsMap = dynamic(() => import("@/components/qr-metrics-map"), {
  ssr: false,
  loading: () => <div className="qr-brazil-map-loading">Carregando mapa…</div>,
});

export default function QrMetricsDashboard({ user, codeId, codeName, onClose }: QrMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState("");
  const [earliestDate, setEarliestDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentDate = new Date();
      const todayValue = dateInputValue(currentDate);
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 29);
      const startValue = dateInputValue(start);
      setToday(todayValue);
      setEarliestDate(addCalendarMonths(todayValue, -24));
      setStartDate(startValue);
      setEndDate(todayValue);
      setAppliedStartDate(startValue);
      setAppliedEndDate(todayValue);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const loadMetrics = useCallback(async (currentStart: string, currentEnd: string) => {
    setLoading(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const params = new URLSearchParams({ start: currentStart, end: currentEnd });
      const response = await fetch(`/api/account/qr-codes/${codeId}/metrics?${params}`, {
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
    if (!appliedStartDate || !appliedEndDate) return;
    const timeoutId = window.setTimeout(() => {
      void loadMetrics(appliedStartDate, appliedEndDate);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [appliedStartDate, appliedEndDate, loadMetrics]);

  const dateRangeValid = isValidDateRange(startDate, endDate, today);

  const downloadCsv = () => {
    if (!metrics) return;
    const rows = [
      ["Métrica", "Valor"],
      ["Total de Escaneamentos", metrics.totalScans],
      ["Usuários Únicos", metrics.uniqueUsers],
      ["Período", `${appliedStartDate} até ${appliedEndDate}`]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `metricas-${codeName.replace(/ /g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !metrics) {
    return (
      <div className="qr-modal-overlay" onClick={onClose}>
        <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-header">
            <h2>Métricas do QR Code</h2>
            <button className="qr-modal-close" onClick={onClose} type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="qr-modal-body">
            <p role="status">Carregando métricas…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="qr-modal-overlay" onClick={onClose}>
        <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="qr-modal-header">
            <h2>Métricas do QR Code</h2>
            <button className="qr-modal-close" onClick={onClose} type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="qr-modal-body">
            <p className="admin-message admin-error" role="alert">{error || "Não foi possível carregar as métricas."}</p>
          </div>
        </div>
      </div>
    );
  }

  const maxHourlyScans = Math.max(...metrics.scansByHour, 1);
  const maxDailyScans = Math.max(...metrics.scansByDay, 1);
  const maxDailyDateScans = Math.max(...metrics.scansByDate, 1);

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content qr-metrics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div>
            <h2>Métricas: {codeName}</h2>
            <p className="qr-metrics-updated">Atualizado em {new Date(metrics.lastUpdated).toLocaleString("pt-BR")}</p>
          </div>
          <div className="qr-metrics-actions">
            <button className="qr-secondary-button" onClick={() => void loadMetrics(appliedStartDate, appliedEndDate)} type="button">Atualizar</button>
            <button className="qr-modal-close" onClick={onClose} type="button">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div className="qr-modal-body qr-metrics-body">
          <div className="qr-metrics-range">
            <label className="qr-metrics-date-field">
              <span>De</span>
              <input
                type="date"
                value={startDate}
                min={earliestDate}
                max={today}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="qr-metrics-date-field">
              <span>Até</span>
              <input
                type="date"
                value={endDate}
                min={startDate || earliestDate}
                max={today}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <button
              className="qr-secondary-button"
              disabled={!dateRangeValid || loading || (startDate === appliedStartDate && endDate === appliedEndDate)}
              onClick={() => {
                setAppliedStartDate(startDate);
                setAppliedEndDate(endDate);
              }}
              type="button"
            >
              Aplicar período
            </button>
            <button className="qr-secondary-button" onClick={downloadCsv}>Baixar CSV</button>
          </div>
          {!dateRangeValid && (
            <p className="qr-metrics-date-error" role="alert">
              Escolha datas válidas, com no máximo 24 meses entre elas e sem datas futuras.
            </p>
          )}
          {/* Volume Metrics */}
          <section className="qr-metrics-section">
            <h3 className="qr-metrics-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Métricas de Volume
            </h3>
            <div className="qr-metrics-cards">
              <article className="qr-metric-card">
                <span>Total de Escaneamentos</span>
                <strong>{metrics.totalScans.toLocaleString("pt-BR")}</strong>
              </article>
              <article className="qr-metric-card">
                <span>Usuários Únicos</span>
                <strong>{metrics.uniqueUsers.toLocaleString("pt-BR")}</strong>
              </article>
            </div>
            <div className="qr-metrics-chart">
              <h4>{metrics.monthlyAggregation ? "Escaneamentos por mês" : "Evolução diária"}</h4>
              <div
                className="qr-chart-container qr-metrics-period-chart"
                style={{ gridTemplateColumns: `repeat(${metrics.scansByDate.length}, minmax(32px, 1fr))` }}
              >
                {metrics.scansByDate.length > 0 ? (
                  metrics.scansByDate.map((count, index) => {
                    const label = metrics.dateLabels[index] || "";
                    const date = new Date(`${metrics.monthlyAggregation ? `${label}-01` : label}T12:00:00.000Z`);
                    const formattedLabel = Number.isNaN(date.getTime())
                      ? label
                      : date.toLocaleDateString("pt-BR", metrics.monthlyAggregation
                        ? { month: "short", year: "2-digit", timeZone: "UTC" }
                        : { day: "2-digit", month: "2-digit", timeZone: "UTC" });
                    return (
                      <div key={label} className="qr-chart-bar-wrapper">
                        <div
                          className="qr-chart-bar"
                          style={{
                            height: count > 0 ? `${Math.max((count / maxDailyDateScans) * 100, 8)}%` : "4px",
                            opacity: count > 0 ? 1 : 0.15
                          }}
                          title={`${formattedLabel}: ${count} escaneamentos`}
                        />
                        <span className="qr-chart-label">{formattedLabel}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="qr-chart-empty">Sem dados suficientes</p>
                )}
              </div>
            </div>
          </section>

          {/* Geographic Metrics */}
          <section className="qr-metrics-section">
            <h3 className="qr-metrics-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Métricas Geográficas
            </h3>
            <QrMetricsMap
              scansByRegion={metrics.scansByRegion || metrics.topRegions || []}
              scanLocations={metrics.scanLocations || []}
            />
            <div className="qr-metrics-grid qr-metrics-grid-3">
              <div className="qr-metrics-list">
                <h4>Top Cidades</h4>
                {metrics.topCities.length > 0 ? (
                  <ul>
                    {metrics.topCities.map((item, index) => (
                      <li key={item.city}>
                        <span className="qr-metric-rank">{index + 1}</span>
                        <span className="qr-metric-name">{item.city}</span>
                        <span className="qr-metric-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de cidades</p>
                )}
              </div>
              <div className="qr-metrics-list">
                <h4>Top Estados/Regiões</h4>
                {metrics.topRegions && metrics.topRegions.length > 0 ? (
                  <ul>
                    {metrics.topRegions.map((item, index) => (
                      <li key={item.region}>
                        <span className="qr-metric-rank">{index + 1}</span>
                        <span className="qr-metric-name">{item.region}</span>
                        <span className="qr-metric-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de estados/regiões</p>
                )}
              </div>
              <div className="qr-metrics-list">
                <h4>Top Países</h4>
                {metrics.topCountries.length > 0 ? (
                  <ul>
                    {metrics.topCountries.map((item, index) => (
                      <li key={item.country}>
                        <span className="qr-metric-rank">{index + 1}</span>
                        <span className="qr-metric-name">{item.country}</span>
                        <span className="qr-metric-count">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de países</p>
                )}
              </div>
            </div>
          </section>

          {/* Device Metrics */}
          <section className="qr-metrics-section">
            <h3 className="qr-metrics-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Métricas de Dispositivo
            </h3>
            <div className="qr-metrics-grid">
              <div className="qr-metrics-list">
                <h4>Tipo de Dispositivo</h4>
                {metrics.deviceTypes.length > 0 ? (
                  <ul>
                    {metrics.deviceTypes.map((item) => (
                      <li key={item.type}>
                        <span className="qr-metric-name">{item.type}</span>
                        <div className="qr-metric-bar">
                          <div className="qr-metric-bar-fill" style={{ width: `${item.percentage}%` }} />
                        </div>
                        <span className="qr-metric-count">{item.count} ({item.percentage.toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de dispositivos</p>
                )}
              </div>
              <div className="qr-metrics-list">
                <h4>Sistema Operacional</h4>
                {metrics.operatingSystems.length > 0 ? (
                  <ul>
                    {metrics.operatingSystems.map((item) => (
                      <li key={item.os}>
                        <span className="qr-metric-name">{item.os}</span>
                        <div className="qr-metric-bar">
                          <div className="qr-metric-bar-fill" style={{ width: `${item.percentage}%` }} />
                        </div>
                        <span className="qr-metric-count">{item.count} ({item.percentage.toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de OS</p>
                )}
              </div>
              <div className="qr-metrics-list">
                <h4>Navegadores</h4>
                {metrics.browsers.length > 0 ? (
                  <ul>
                    {metrics.browsers.map((item) => (
                      <li key={item.browser}>
                        <span className="qr-metric-name">{item.browser}</span>
                        <div className="qr-metric-bar">
                          <div className="qr-metric-bar-fill" style={{ width: `${item.percentage}%` }} />
                        </div>
                        <span className="qr-metric-count">{item.count} ({item.percentage.toFixed(1)}%)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="qr-metrics-empty">Sem dados de navegadores</p>
                )}
              </div>
            </div>
          </section>

          {/* Time Metrics */}
          <section className="qr-metrics-section">
            <h3 className="qr-metrics-section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Métricas de Tempo
            </h3>
            <div className="qr-metrics-grid">
              <div className="qr-metrics-chart">
                <h4>Horário de Pico (24h)</h4>
                <div className="qr-chart-container qr-chart-horizontal">
                  {metrics.scansByHour.map((count, hour) => (
                    <div key={hour} className="qr-chart-bar-wrapper">
                      <div
                        className="qr-chart-bar"
                        style={{
                          width: `${Math.max((count / maxHourlyScans) * 100, count > 0 ? 10 : 0)}%`,
                          opacity: count > 0 ? 1 : 0.3
                        }}
                        title={`${hour}h: ${count} escaneamentos`}
                      />
                      <span className="qr-chart-label">{hour % 2 === 0 ? HOURS[Math.floor(hour / 2)] : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="qr-metrics-chart">
                <h4>Dias da Semana</h4>
                <div className="qr-chart-container">
                  {metrics.scansByDay.map((count, day) => (
                    <div key={day} className="qr-chart-bar-wrapper">
                      <div
                        className="qr-chart-bar"
                        style={{
                          height: `${Math.max((count / maxDailyScans) * 100, count > 0 ? 30 : 0)}%`,
                          opacity: count > 0 ? 1 : 0.3
                        }}
                        title={`${DAYS[day]}: ${count} escaneamentos`}
                      />
                      <span className="qr-chart-label">{DAYS[day]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
