"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";

interface MetricsData {
  totalScans: number;
  uniqueUsers: number;
  scansByHour: number[];
  scansByDay: number[];
  weeklyData: { week: string; count: number }[];
  topCities: { city: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topRegions: { region: string; count: number }[];
  deviceTypes: { type: string; count: number; percentage: number }[];
  operatingSystems: { os: string; count: number; percentage: number }[];
  browsers: { browser: string; count: number; percentage: number }[];
  lastUpdated: string;
}

interface QrMetricsDashboardProps {
  user: User;
  codeId: string;
  codeName: string;
  onClose: () => void;
}

const HOURS = ["00h", "02h", "04h", "06h", "08h", "10h", "12h", "14h", "16h", "18h", "20h", "22h"];
const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function QrMetricsDashboard({ user, codeId, codeName, onClose }: QrMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      setError("");
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/account/qr-codes/${codeId}/metrics`, {
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
    }

    loadMetrics();
  }, [user, codeId]);

  if (loading) {
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
  const maxWeeklyScans = Math.max(...metrics.weeklyData.map((d) => d.count), 1);

  // Ensure minimum height for bars (at least 10% if there's data)
  const getBarHeight = (count: number, max: number) => {
    if (count === 0) return "4px";
    const percentage = (count / max) * 100;
    return `${Math.max(percentage, 10)}%`;
  };

  const getBarWidth = (count: number, max: number) => {
    if (count === 0) return "4px";
    const percentage = (count / max) * 100;
    return `${Math.max(percentage, 10)}%`;
  };

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content qr-metrics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div>
            <h2>Métricas: {codeName}</h2>
            <p className="qr-metrics-updated">Atualizado em {new Date(metrics.lastUpdated).toLocaleString("pt-BR")}</p>
          </div>
          <button className="qr-modal-close" onClick={onClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="qr-modal-body qr-metrics-body">
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
              <h4>Evolução Semanal</h4>
              <div className="qr-chart-container">
                {metrics.weeklyData.length > 0 ? (
                  metrics.weeklyData.map((item) => (
                    <div key={item.week} className="qr-chart-bar-wrapper">
                      <div
                        className="qr-chart-bar"
                        style={{ height: getBarHeight(item.count, maxWeeklyScans) }}
                        title={`${item.count} escaneamentos`}
                      />
                      <span className="qr-chart-label">{new Date(item.week).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    </div>
                  ))
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
                        style={{ width: getBarWidth(count, maxHourlyScans) }}
                        title={`${count} escaneamentos às ${hour}h`}
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
                        style={{ height: getBarHeight(count, maxDailyScans) }}
                        title={`${count} escaneamentos em ${DAYS[day]}`}
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
