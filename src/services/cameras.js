const API_BASE = import.meta.env.VITE_CAMERA_API_BASE || '/api';

export async function fetchCameras({ signal } = {}) {
  try {
    const response = await fetch(`${API_BASE}/cameras`, { signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Kameratjänsten svarade ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.cameras)) throw new Error('Ogiltigt kamerasvar');
    return { cameras: payload.cameras, source: payload.source || 'Trafikverket', demo: false, fetchedAt: payload.fetchedAt || new Date().toISOString() };
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return { cameras: [], source: 'Trafikverket', demo: false, error: error.message, fetchedAt: new Date().toISOString() };
  }
}
