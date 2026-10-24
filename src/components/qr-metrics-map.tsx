"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  Circle,
  GeoJSON,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

interface BrazilState {
  id: string;
  uf: string;
  name: string;
}

interface ScanRegion {
  region: string;
  count: number;
}

interface ScanLocation {
  city: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  locationSource?: "browser" | "ip" | "mixed";
  count: number;
}

interface QrMetricsMapProps {
  scansByRegion: ScanRegion[];
  scanLocations: ScanLocation[];
}

type MapFeature = Feature<Geometry, Record<string, unknown>>;
type MapFeatureCollection = FeatureCollection<Geometry, Record<string, unknown>>;

const IBGE_BASE_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/estados";
const IBGE_LOCALITIES_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/estados";

const BRAZIL_STATES: BrazilState[] = [
  { id: "11", uf: "RO", name: "Rondônia" },
  { id: "12", uf: "AC", name: "Acre" },
  { id: "13", uf: "AM", name: "Amazonas" },
  { id: "14", uf: "RR", name: "Roraima" },
  { id: "15", uf: "PA", name: "Pará" },
  { id: "16", uf: "AP", name: "Amapá" },
  { id: "17", uf: "TO", name: "Tocantins" },
  { id: "21", uf: "MA", name: "Maranhão" },
  { id: "22", uf: "PI", name: "Piauí" },
  { id: "23", uf: "CE", name: "Ceará" },
  { id: "24", uf: "RN", name: "Rio Grande do Norte" },
  { id: "25", uf: "PB", name: "Paraíba" },
  { id: "26", uf: "PE", name: "Pernambuco" },
  { id: "27", uf: "AL", name: "Alagoas" },
  { id: "28", uf: "SE", name: "Sergipe" },
  { id: "29", uf: "BA", name: "Bahia" },
  { id: "31", uf: "MG", name: "Minas Gerais" },
  { id: "32", uf: "ES", name: "Espírito Santo" },
  { id: "33", uf: "RJ", name: "Rio de Janeiro" },
  { id: "35", uf: "SP", name: "São Paulo" },
  { id: "41", uf: "PR", name: "Paraná" },
  { id: "42", uf: "SC", name: "Santa Catarina" },
  { id: "43", uf: "RS", name: "Rio Grande do Sul" },
  { id: "50", uf: "MS", name: "Mato Grosso do Sul" },
  { id: "51", uf: "MT", name: "Mato Grosso" },
  { id: "52", uf: "GO", name: "Goiás" },
  { id: "53", uf: "DF", name: "Distrito Federal" },
];

const STATE_BY_CODE = new Map(BRAZIL_STATES.map((state) => [state.id, state]));
const STATE_BY_NAME = new Map(
  BRAZIL_STATES.flatMap((state) => [
    [normalizeName(state.uf), state],
    [normalizeName(state.name), state],
  ]),
);

const stateGeometryCache = new Map<string, Promise<MapFeatureCollection>>();
const municipalityCache = new Map<string, Promise<MapFeatureCollection>>();

function normalizeName(value: string): string {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getRegionState(region: string | null): BrazilState | undefined {
  if (!region) return undefined;
  const normalizedRegion = normalizeName(region).replace(/^(estado de|estado do|state of)\s+/, "");
  return STATE_BY_NAME.get(normalizedRegion);
}

async function fetchFeatureCollection(url: string): Promise<MapFeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao carregar limites do mapa (HTTP ${response.status}).`);

  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("type" in data) ||
    data.type !== "FeatureCollection" ||
    !("features" in data) ||
    !Array.isArray(data.features)
  ) {
    throw new Error("O IBGE retornou dados de mapa em um formato inválido.");
  }

  return data as MapFeatureCollection;
}

function loadStateGeometry(state: BrazilState): Promise<MapFeatureCollection> {
  let request = stateGeometryCache.get(state.id);
  if (!request) {
    request = fetchFeatureCollection(
      `${IBGE_BASE_URL}/${state.id}?formato=application%2Fvnd.geo%2Bjson&qualidade=minima`,
    ).catch((error: unknown) => {
      stateGeometryCache.delete(state.id);
      throw error;
    });
    stateGeometryCache.set(state.id, request);
  }
  return request;
}

function loadAllStateGeometries(): Promise<MapFeatureCollection> {
  return Promise.all(BRAZIL_STATES.map(loadStateGeometry)).then((collections) => ({
    type: "FeatureCollection",
    features: collections.flatMap((collection, index) =>
      collection.features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          stateId: BRAZIL_STATES[index].id,
        },
      })),
    ),
  }));
}

function loadMunicipalities(state: BrazilState): Promise<MapFeatureCollection> {
  let request = municipalityCache.get(state.id);
  if (!request) {
    request = Promise.all([
      fetchFeatureCollection(
        `${IBGE_BASE_URL}/${state.id}?intrarregiao=municipio&formato=application%2Fvnd.geo%2Bjson&qualidade=minima`,
      ),
      fetch(`${IBGE_LOCALITIES_URL}/${state.id}/municipios`).then(async (response) => {
        if (!response.ok) throw new Error(`Falha ao carregar municípios (HTTP ${response.status}).`);
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error("O IBGE retornou uma lista de municípios inválida.");
        return data.flatMap((item): { id: string; name: string }[] => {
          if (!item || typeof item !== "object" || !("id" in item) || !("nome" in item)) return [];
          return [{ id: String(item.id), name: String(item.nome) }];
        });
      }),
    ])
      .then(([geometry, localities]) => {
        const nameById = new Map(localities.map((locality) => [locality.id, locality.name]));
        return {
          type: "FeatureCollection",
          features: geometry.features.map((feature) => ({
            ...feature,
            properties: {
              ...feature.properties,
              name: nameById.get(String(feature.properties?.codarea)) || "Município",
            },
          })),
        } satisfies MapFeatureCollection;
      })
      .catch((error: unknown) => {
        municipalityCache.delete(state.id);
        throw error;
      });
    municipalityCache.set(state.id, request);
  }
  return request;
}

function MapBounds({ geometry }: { geometry: MapFeatureCollection | null }) {
  const map = useMap();

  useEffect(() => {
    if (!geometry?.features.length) {
      map.setView([-14.2, -51.9], 4);
      return;
    }
    const bounds = L.geoJSON(geometry).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 8 });
  }, [geometry, map]);

  return null;
}

export default function QrMetricsMap({ scansByRegion, scanLocations }: QrMetricsMapProps) {
  const [selectedStateId, setSelectedStateId] = useState("23");
  const [statesGeometry, setStatesGeometry] = useState<MapFeatureCollection | null>(null);
  const [municipalityGeometry, setMunicipalityGeometry] = useState<MapFeatureCollection | null>(null);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);
  const [error, setError] = useState("");

  const selectedState = STATE_BY_CODE.get(selectedStateId) || null;

  useEffect(() => {
    let cancelled = false;
    setLoadingStates(true);
    loadAllStateGeometries()
      .then((geometry) => {
        if (!cancelled) setStatesGeometry(geometry);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o mapa do Brasil.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStates(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setMunicipalityGeometry(null);
    setError("");
    if (!selectedState) {
      setLoadingMunicipalities(false);
      return;
    }

    setLoadingMunicipalities(true);
    loadMunicipalities(selectedState)
      .then((geometry) => {
        if (!cancelled) setMunicipalityGeometry(geometry);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as divisões municipais.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMunicipalities(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedState]);

  const scansByState = useMemo(() => {
    const counts = new Map<string, number>();
    scansByRegion.forEach(({ region, count }) => {
      const state = getRegionState(region);
      if (state) counts.set(state.id, (counts.get(state.id) || 0) + count);
    });
    return counts;
  }, [scansByRegion]);

  const locationsForSelectedState = useMemo(() => {
    const locationsByCity = new Map<string, ScanLocation>();
    scanLocations.forEach((location) => {
      if (getRegionState(location.region)?.id !== selectedStateId || !location.city) return;

      const cityKey = normalizeName(location.city);
      const existingLocation = locationsByCity.get(cityKey);
      if (existingLocation) {
        existingLocation.count += location.count;
      } else {
        locationsByCity.set(cityKey, { ...location, latitude: null, longitude: null });
      }
    });
    return Array.from(locationsByCity.values());
  }, [scanLocations, selectedStateId]);
  const heatAreas = useMemo(() => {
    const areas = new Map<string, ScanLocation>();
    scanLocations.forEach((location) => {
      if (
        location.latitude === null
        || location.longitude === null
        || (selectedState && getRegionState(location.region)?.id !== selectedStateId)
      ) return;

      const areaSize = location.locationSource === "browser" ? 0.02 : 0.1;
      const gridLat = Math.floor(location.latitude / areaSize);
      const gridLng = Math.floor(location.longitude / areaSize);
      const key = `${areaSize}:${gridLat}:${gridLng}`;
      const existingArea = areas.get(key);
      if (existingArea) {
        existingArea.count += location.count;
        if (existingArea.locationSource !== location.locationSource) {
          existingArea.locationSource = "mixed";
        }
      } else {
        areas.set(key, {
          ...location,
          latitude: (gridLat + 0.5) * areaSize,
          longitude: (gridLng + 0.5) * areaSize,
        });
      }
    });
    return Array.from(areas.values());
  }, [scanLocations, selectedState, selectedStateId]);

  const mapGeometry = selectedState ? municipalityGeometry : statesGeometry;
  const maxStateCount = Math.max(...scansByState.values(), 1);
  const maxLocationCount = Math.max(...heatAreas.map((area) => area.count), 1);

  const municipalityCounts = new Map<string, number>();
  locationsForSelectedState.forEach((location) => {
    if (!location.city) return;
    const cityKey = normalizeName(location.city);
    municipalityCounts.set(cityKey, (municipalityCounts.get(cityKey) || 0) + location.count);
  });

  const maxMunicipalityCount = Math.max(...municipalityCounts.values(), 1);

  const displayedLocations = heatAreas;

  function getStateStyle(feature?: MapFeature): L.PathOptions {
    const stateId = String(feature?.properties?.stateId || feature?.properties?.codarea || "");
    const count = scansByState.get(stateId) || 0;
    const intensity = count / maxStateCount;
    return {
      color: "#ffffff",
      weight: 1.5,
      fillColor: count ? (intensity > 0.66 ? "#557a45" : intensity > 0.33 ? "#8aa56b" : "#bbca9e") : "#e7ebdf",
      fillOpacity: 0.88,
    };
  }

  function getMunicipalityStyle(feature?: MapFeature): L.PathOptions {
    const cityKey = normalizeName(String(feature?.properties?.name || ""));
    const count = municipalityCounts.get(cityKey) || 0;
    const intensity = count / maxMunicipalityCount;
    return {
      color: "#738269",
      weight: 0.8,
      fillColor: count ? (intensity > 0.66 ? "#557a45" : intensity > 0.33 ? "#8aa56b" : "#bbca9e") : "#f4f5ef",
      fillOpacity: 0.78,
    };
  }

  function configureStateFeature(feature: MapFeature, layer: L.Layer) {
    const stateId = String(feature.properties?.stateId || feature.properties?.codarea || "");
    const state = STATE_BY_CODE.get(stateId);
    if (!state) return;
    const count = scansByState.get(state.id) || 0;
    layer.bindTooltip(`${state.name}: ${count.toLocaleString("pt-BR")} scans`);
    layer.on("click", () => setSelectedStateId(state.id));
  }

  function configureMunicipalityFeature(feature: MapFeature, layer: L.Layer) {
    const name = String(feature.properties?.name || "Município");
    const count = municipalityCounts.get(normalizeName(name)) || 0;
    layer.bindTooltip(`${name}: ${count.toLocaleString("pt-BR")} scans`);
  }

  return (
    <div className="qr-brazil-map-card">
      <div className="qr-brazil-map-heading">
        <div>
          <h4>Mapa de escaneamentos</h4>
          <p>Com permissão, a localização do aparelho é agrupada em áreas de cerca de 2 km. Sem ela, o IP pode estimar apenas a cidade. Nenhuma área indica uma casa ou endereço.</p>
        </div>
        <label className="qr-map-state-select">
          <span>Estado</span>
          <select
            value={selectedStateId}
            onChange={(event) => setSelectedStateId(event.target.value)}
            aria-label="Selecionar estado para visualizar no mapa"
          >
            <option value="">Brasil inteiro</option>
            {BRAZIL_STATES.map((state) => (
              <option key={state.id} value={state.id}>{state.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="qr-brazil-map-status" aria-live="polite">
        {loadingStates && <span>Carregando divisões estaduais do IBGE…</span>}
        {loadingMunicipalities && <span>Carregando municípios de {selectedState?.name}…</span>}
        {error && <span role="alert">{error}</span>}
      </div>
      {mapGeometry && (
        <MapContainer
          key={selectedStateId || "brazil"}
          center={[-14.2, -51.9]}
          zoom={4}
          scrollWheelZoom
          className="qr-brazil-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapBounds geometry={selectedState ? municipalityGeometry : statesGeometry} />
          {selectedState && municipalityGeometry ? (
            <GeoJSON
              key={`municipalities-${selectedState.id}`}
              data={municipalityGeometry}
              style={getMunicipalityStyle}
              onEachFeature={configureMunicipalityFeature}
            />
          ) : statesGeometry ? (
            <GeoJSON
              key="states"
              data={statesGeometry}
              style={getStateStyle}
              onEachFeature={configureStateFeature}
            />
          ) : null}
          {displayedLocations.map((location, index) => {
            if (location.latitude === null || location.longitude === null) return null;
            const intensity = Math.log1p(location.count) / Math.log1p(Math.max(maxLocationCount, 10));
            const fillColor = intensity > 0.72 ? "#b42318" : intensity > 0.4 ? "#e4572e" : "#f4a340";
            const radius = location.locationSource === "browser"
              ? 1500 + intensity * 1500
              : 12000 + intensity * 8000;
            const stateName = getRegionState(location.region)?.name || location.region || "Brasil";
            const label = location.city ? `${location.city}, ${stateName}` : stateName;
            return (
              <Circle
                key={`${location.latitude}-${location.longitude}-${index}`}
                center={[location.latitude, location.longitude]}
                radius={radius}
                pathOptions={{ color: fillColor, weight: 1, fillColor, fillOpacity: 0.38 + intensity * 0.38 }}
              >
                <Popup>
                  <strong>{label}</strong>
                  <br />
                  {location.count.toLocaleString("pt-BR")} scans
                  <br />
                  <small>
                    {location.locationSource === "browser"
                      ? "Localização do aparelho compartilhada com permissão e precisão reportada de até 3 km; área agrupada em uma zona aproximada de 2 km."
                      : location.locationSource === "mixed"
                        ? "Combina localização do aparelho com permissão e estimativa por IP; área agrupada em zonas aproximadas."
                        : "Área aproximada pelo IP, agrupada em uma zona ampla de cerca de 10 km."}
                  </small>
                </Popup>
              </Circle>
            );
          })}
        </MapContainer>
      )}
      <div className="qr-brazil-map-legend">
        <span><i className="qr-map-legend-state" />Área preenchida: volume por estado/município</span>
        <span><i className="qr-map-legend-point" />Áreas: cores mais fortes indicam mais scans; cada zona é aproximada</span>
        <span>Fonte dos limites: IBGE</span>
      </div>
    </div>
  );
}
