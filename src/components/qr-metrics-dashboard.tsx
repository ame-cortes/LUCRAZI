"use client";

import { useEffect, useState, useCallback } from "react";
import type { User } from "firebase/auth";

interface MetricsData {
  totalScans: number;
  uniqueUsers: number;
  scansByHour: number[];
  scansByDay: number[];
  scansByDate: number[];
  dateLabels: string[];
  topCities: { city: string; count: number }[];
  topCountries: { country: string; count: number }[];
  topRegions: { region: string; count: number }[];
  scansByRegion: { region: string; count: number }[];
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

const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre", x: 54, y: 294 },
  { uf: "AL", name: "Alagoas", x: 383, y: 339 },
  { uf: "AP", name: "Amapá", x: 259, y: 116 },
  { uf: "AM", name: "Amazonas", x: 158, y: 224 },
  { uf: "BA", name: "Bahia", x: 335, y: 378 },
  { uf: "CE", name: "Ceará", x: 367, y: 257 },
  { uf: "DF", name: "Distrito Federal", x: 294, y: 388 },
  { uf: "ES", name: "Espírito Santo", x: 374, y: 453 },
  { uf: "GO", name: "Goiás", x: 276, y: 385 },
  { uf: "MA", name: "Maranhão", x: 316, y: 281 },
  { uf: "MT", name: "Mato Grosso", x: 220, y: 372 },
  { uf: "MS", name: "Mato Grosso do Sul", x: 235, y: 452 },
  { uf: "MG", name: "Minas Gerais", x: 334, y: 433 },
  { uf: "PA", name: "Pará", x: 240, y: 220 },
  { uf: "PB", name: "Paraíba", x: 389, y: 286 },
  { uf: "PR", name: "Paraná", x: 292, y: 500 },
  { uf: "PE", name: "Pernambuco", x: 378, y: 310 },
  { uf: "PI", name: "Piauí", x: 343, y: 300 },
  { uf: "RJ", name: "Rio de Janeiro", x: 357, y: 476 },
  { uf: "RN", name: "Rio Grande do Norte", x: 397, y: 267 },
  { uf: "RS", name: "Rio Grande do Sul", x: 278, y: 555 },
  { uf: "RO", name: "Rondônia", x: 133, y: 350 },
  { uf: "RR", name: "Roraima", x: 181, y: 105 },
  { uf: "SC", name: "Santa Catarina", x: 306, y: 527 },
  { uf: "SP", name: "São Paulo", x: 317, y: 474 },
  { uf: "SE", name: "Sergipe", x: 373, y: 358 },
  { uf: "TO", name: "Tocantins", x: 273, y: 310 },
] as const;

const STATE_NAMES = new Map(
  BRAZILIAN_STATES.flatMap((state) => [
    [state.uf, state.uf],
    [state.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(), state.uf],
  ]),
);

function getBrazilStatePoints(regions: MetricsData["scansByRegion"]) {
  const countsByState = new Map<string, number>();

  regions.forEach(({ region, count }) => {
    const normalizedRegion = region.trim().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/^(estado de|estado do|state of)\s+/, "");
    const stateCode = STATE_NAMES.get(normalizedRegion);
    if (stateCode) countsByState.set(stateCode, (countsByState.get(stateCode) || 0) + count);
  });

  return BRAZILIAN_STATES.flatMap((state) => {
    const count = countsByState.get(state.uf);
    return count ? [{ ...state, count }] : [];
  });
}

export default function QrMetricsDashboard({ user, codeId, codeName, onClose }: QrMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("7d");

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
    loadMetrics(range);
  }, [range, loadMetrics]);

  const downloadCsv = () => {
    if (!metrics) return;
    const rows = [
      ["Métrica", "Valor"],
      ["Total de Escaneamentos", metrics.totalScans],
      ["Usuários Únicos", metrics.uniqueUsers],
      ["Período", range]
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
  const brazilStatePoints = getBrazilStatePoints(metrics.scansByRegion || metrics.topRegions || []);
  const maxStateScans = Math.max(...brazilStatePoints.map((state) => state.count), 1);

  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal-content qr-metrics-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-modal-header">
          <div>
            <h2>Métricas: {codeName}</h2>
            <p className="qr-metrics-updated">Atualizado em {new Date(metrics.lastUpdated).toLocaleString("pt-BR")}</p>
          </div>
          <div className="qr-metrics-actions">
            <button className="qr-secondary-button" onClick={() => loadMetrics(range)} type="button">Atualizar</button>
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
            <button aria-pressed={range === "7d"} onClick={() => setRange("7d")}>7 dias</button>
            <button aria-pressed={range === "30d"} onClick={() => setRange("30d")}>30 dias</button>
            <button aria-pressed={range === "all"} onClick={() => setRange("all")}>Todo o período</button>
            <button className="qr-secondary-button" onClick={downloadCsv}>Baixar CSV</button>
          </div>
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
              <h4>{range === "all" ? "Resumo Mensal" : "Evolução Diária"}</h4>
              {range === "all" ? (
                <div className="qr-metrics-monthly-summary">
                  {(() => {
                    const monthlyData: { [key: string]: number } = {};
                    metrics.scansByDate.forEach((count, index) => {
                      const date = new Date(metrics.dateLabels[index] || "");
                      const monthKey = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + count;
                    });

                    const months = Object.entries(monthlyData).sort((a, b) => b[0].localeCompare(a[0]));

                    return months.map(([month, count]) => (
                      <div key={month} className="qr-metrics-monthly-item">
                        <span className="qr-metrics-monthly-label">{month}</span>
                        <span className="qr-metrics-monthly-count">{count} escaneamentos</span>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="qr-chart-container">
                  {metrics.scansByDate.length > 0 ? (
                    metrics.scansByDate.map((count, index) => (
                      <div key={index} className="qr-chart-bar-wrapper">
                        <div
                          className="qr-chart-bar"
                          style={{
                            height: count > 0 ? `${Math.max((count / maxDailyDateScans) * 100, 50)}%` : "4px",
                            opacity: count > 0 ? 1 : 0.15
                          }}
                          title={`${metrics.dateLabels[index] || ""}: ${count} escaneamentos`}
                        />
                        <span className="qr-chart-label">{metrics.dateLabels[index] || ""}</span>
                      </div>
                    ))
                  ) : (
                    <p className="qr-chart-empty">Sem dados suficientes</p>
                  )}
                </div>
              )}
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
            <div className="qr-brazil-map-card">
              <div className="qr-brazil-map-heading">
                <div>
                  <h4>Escaneamentos por estado</h4>
                  <p>Distribuição aproximada com base na localização do IP.</p>
                </div>
                {brazilStatePoints.length > 0 && (
                  <span>{brazilStatePoints.reduce((total, state) => total + state.count, 0).toLocaleString("pt-BR")} scans</span>
                )}
              </div>
              {brazilStatePoints.length > 0 ? (
                <>
                  <div className="qr-brazil-map">
                    <svg viewBox="0 0 620 520" role="img" aria-label="Mapa do Brasil com volume de escaneamentos por estado">
                      <path
                        className="qr-brazil-map-land"
                        transform="translate(0 15) scale(1.3 0.82)"
                        d="M184 24 217 34 241 51 271 48 294 64 319 72 333 96 363 105 374 128 397 142 403 163 426 181 417 200 431 216 419 235 426 254 412 272 417 293 400 309 403 330 387 345 394 363 381 376 386 397 370 411 376 432 363 447 366 466 349 480 349 499 334 510 331 529 314 542 307 561 288 576 272 561 259 545 253 527 239 516 227 497 213 488 202 469 184 459 171 439 155 426 145 405 128 392 119 373 102 361 98 340 80 325 79 306 61 291 58 272 43 254 48 235 65 222 67 202 84 187 87 165 105 149 111 128 130 113 137 91 157 80 163 58 181 46Z"
                      />
                      {brazilStatePoints.map((state) => {
                        const radius = 7 + Math.sqrt(state.count / maxStateScans) * 13;
                        const intensity = state.count / maxStateScans;
                        return (
                          <g key={state.uf} className="qr-brazil-map-point">
                            <title>{`${state.name}: ${state.count} scans`}</title>
                            <circle
                              cx={state.x * 1.3}
                              cy={state.y * 0.82 + 15}
                              r={radius}
                              fill={intensity > 0.66 ? "#3e6b39" : intensity > 0.33 ? "#78924c" : "#a8bd78"}
                              fillOpacity="0.82"
                            />
                            <text x={state.x * 1.3} y={state.y * 0.82 + 18} textAnchor="middle">{state.uf}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="qr-brazil-map-legend">
                    <span><i className="qr-map-legend-low" />Menor volume</span>
                    <span><i className="qr-map-legend-high" />Maior volume</span>
                    <span>O tamanho do ponto representa a quantidade de scans</span>
                  </div>
                </>
              ) : (
                <p className="qr-metrics-empty">Ainda não há scans identificados em estados brasileiros neste período.</p>
              )}
            </div>
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
