const DEFAULT_API_BASE = 'https://svensk-trafikkamera-api.delorean10429.workers.dev';
const API_BASE = (import.meta.env.VITE_CAMERA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');

async function readJson(response, label) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label}: servern svarade inte med giltig JSON (HTTP ${response.status})`);
  }
  if (!response.ok) {
    throw new Error(data.error || data.detail || `${label}: HTTP ${response.status}`);
  }
  return data;
}

export async function fetchCameras({ signal } = {}) {
  const healthResponse = await fetch(`${API_BASE}/health`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    cache: 'no-store',
  });
  const health = await readJson(healthResponse, 'API-kontroll');
  if (health.ok !== true) {
    throw new Error('Kamera-API:t svarade men rapporterade att tjänsten inte är redo.');
  }

  const response = await fetch(`${API_BASE}/api/cameras`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    cache: 'no-store',
  });
  const payload = await readJson(response, 'Kamerahämtning');
  if (!Array.isArray(payload.cameras)) {
    throw new Error('Kamera-API:t svarade, men saknar en giltig kamer lista.');
  }

  return {
    cameras: payload.cameras,
    source: payload.source || 'Trafikverket',
    fetchedAt: payload.fetchedAt || new Date().toISOString(),
    counts: payload.counts || {
      traffic: payload.cameras.filter((camera) => camera.cameraType !== 'safety').length,
      safety: payload.cameras.filter((camera) => camera.cameraType === 'safety').length,
    },
    apiHealth: 'ok',
    demo: false,
  };
}
