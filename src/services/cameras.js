const DEFAULT_API_BASE = 'https://svensk-trafikkamera-api.delorean10429.workers.dev';
const API_BASE = (import.meta.env.VITE_CAMERA_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');

export async function fetchCameras({ signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/cameras`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Kameratjänsten svarade ${response.status}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload.cameras)) throw new Error('Ogiltigt kamerasvar');
    return {
      cameras: payload.cameras,
      source: payload.source || 'Trafikverket',
      demo: false,
      fetchedAt: payload.fetchedAt || new Date().toISOString(),
    };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return {
      cameras: [],
      source: 'Trafikverket',
      demo: false,
      error: error.message,
      fetchedAt: new Date().toISOString(),
    };
  }
}
