import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Search, MapPinned, Camera, RefreshCw, Heart, AlertTriangle, X, RadioTower } from 'lucide-react';
import { fetchCameras } from './services/cameras.js';

const counties = ['Alla län','Stockholms län','Uppsala län','Södermanlands län','Östergötlands län','Jönköpings län','Kronobergs län','Kalmar län','Gotlands län','Blekinge län','Skåne län','Hallands län','Västra Götalands län','Värmlands län','Örebro län','Västmanlands län','Dalarnas län','Gävleborgs län','Västernorrlands län','Jämtlands län','Västerbottens län','Norrbottens län'];

function FlyTo({ camera }) {
  const map = useMap();
  useEffect(() => {
    if (camera && Number.isFinite(Number(camera.lat)) && Number.isFinite(Number(camera.lon))) map.flyTo([Number(camera.lat), Number(camera.lon)], 11, { duration: 0.6 });
  }, [camera, map]);
  return null;
}

function filterCameras(cameras, query, county, kind, onlyFavorites, favorites) {
  return cameras.filter((camera) => {
    const searchable = [camera.name, camera.road, camera.county, camera.municipality, camera.description].filter(Boolean).join(' ').toLowerCase();
    const type = String(camera.type || '').toLowerCase();
    const cameraCounties = String(camera.county || '').split(', ').filter(Boolean);
    const matchesQuery = !query || searchable.includes(query.toLowerCase());
    const matchesCounty = county === 'Alla län' || cameraCounties.includes(county);
    const matchesKind = kind === 'Alla typer' ||
      (kind === 'Trafikflöde' && (type.includes('traffic') || type.includes('trafikflöde'))) ||
      (kind === 'Väglag' && (type.includes('road') || type.includes('väglag')));
    const matchesFavorite = !onlyFavorites || favorites.includes(camera.id);
    return matchesQuery && matchesCounty && matchesKind && matchesFavorite;
  });
}

function formatTime(value) {
  if (!value) return 'Tid saknas';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tid saknas' : date.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
}

export default function App() {
  const [cameras, setCameras] = useState([]);
  const [source, setSource] = useState('Trafikverket');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState('Alla län');
  const [kind, setKind] = useState('Alla typer');
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('camera-favorites') || '[]'); } catch { return []; }
  });
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [imageBust, setImageBust] = useState(Date.now());

  async function loadCameras() {
    setLoading(true);
    setError('');
    const result = await fetchCameras();
    setSource(result.source || 'Trafikverket');
    setFetchedAt(result.fetchedAt);
    if (result.error) {
      setError(result.error);
      setCameras([]);
    } else {
      setCameras(result.cameras);
    }
    setLoading(false);
  }

  useEffect(() => { loadCameras(); }, []);

  const visible = useMemo(() => filterCameras(cameras, query, county, kind, onlyFavorites, favorites), [cameras, query, county, kind, onlyFavorites, favorites]);

  function toggleFavorite(id) {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('camera-favorites', JSON.stringify(next));
  }

  function imageUrl(camera) {
    if (!camera.image) return null;
    return camera.image + (camera.image.includes('?') ? '&' : '?') + '_=' + imageBust;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><RadioTower size={24} /></div><div><h1>Svensk Trafikkamera</h1><p>Hela Sveriges vägar – samlat på ett ställe</p></div></div>
        <div className="status">{cameras.length ? cameras.length.toLocaleString('sv-SE') + ' kameror hämtade' : 'Inväntar datakälla'}</div>
      </header>
      <section className="hero"><div><h2>Se läget på vägarna.</h2><p>Offentliga vägkameror och väglagsbilder från Trafikverket.</p></div><button className="btn" onClick={() => { setImageBust(Date.now()); loadCameras(); }} disabled={loading}><RefreshCw size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />{loading ? 'Hämtar…' : 'Uppdatera'}</button></section>
      <div className="toolbar">
        <label className="field search-field"><Search size={17} /><input aria-label="Sök kamera, väg eller ort" placeholder="Sök kamera, väg eller ort…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="field" value={county} onChange={(event) => setCounty(event.target.value)}>{counties.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}><option>Alla typer</option><option>Trafikflöde</option><option>Väglag</option></select>
        <button className="field favorite-filter" onClick={() => setOnlyFavorites(!onlyFavorites)}><Heart size={15} fill={onlyFavorites ? 'currentColor' : 'none'} />{onlyFavorites ? 'Favoriter' : 'Visa favoriter'}</button>
      </div>
      <div className="stats"><div className="stat"><strong>{cameras.length.toLocaleString('sv-SE')}</strong><span>Hämtade kameror</span></div><div className="stat"><strong>{visible.length.toLocaleString('sv-SE')}</strong><span>Visas med filter</span></div><div className="stat"><strong>{favorites.length}</strong><span>Dina favoriter</span></div></div>
      {error && <div className="notice"><AlertTriangle size={16} />Kameratjänsten kunde inte nås: {error}. Inga påhittade livebilder visas. Kontrollera backend och Trafikverkets API-nyckel.</div>}
      <main className="layout">
        <section className="panel"><div className="panel-head"><h3><MapPinned size={16} />Kamerakarta</h3><span className="muted">{visible.length} träffar</span></div><div className="map"><MapContainer center={[62.2, 16.5]} zoom={5} scrollWheelZoom style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FlyTo camera={selected} />{visible.filter((camera) => Number.isFinite(Number(camera.lat)) && Number.isFinite(Number(camera.lon))).map((camera) => <CircleMarker key={camera.id} center={[Number(camera.lat), Number(camera.lon)]} radius={selected?.id === camera.id ? 9 : 6} pathOptions={{ color: selected?.id === camera.id ? '#ffd078' : '#f2a443', fillColor: '#ee8e31', fillOpacity: 0.9, weight: 2 }} eventHandlers={{ click: () => setSelected(camera) }}><Popup><strong>{camera.name}</strong><br />{camera.road || ''} · {camera.county || ''}<br /><button onClick={() => setSelected(camera)}>Visa kamera</button></Popup></CircleMarker>)}</MapContainer></div></section>
        <aside className="panel"><div className="panel-head"><h3><Camera size={16} />Kameror</h3><span className="muted">{visible.length}</span></div><div className="camera-list">{visible.map((camera) => <div key={camera.id} className={'camera-card ' + (selected?.id === camera.id ? 'active' : '')} onClick={() => setSelected(camera)}><div className="cam-thumb">{camera.image ? <img src={imageUrl(camera)} alt="Kameravy" /> : <Camera size={24} />}</div><div className="camera-copy"><h4>{camera.name || 'Trafikkamera'}</h4><p>{[camera.road, camera.municipality, camera.county].filter(Boolean).join(' · ')}</p><span className="tag">{String(camera.type || '').toLowerCase().includes('road') || String(camera.type || '').toLowerCase().includes('väglag') ? 'Väglag' : 'Trafikflöde'}</span></div><button aria-label="Favorit" className="heart-button" onClick={(event) => { event.stopPropagation(); toggleFavorite(camera.id); }}><Heart size={18} fill={favorites.includes(camera.id) ? 'currentColor' : 'none'} /></button></div>)}{!visible.length && <div className="empty">{loading ? 'Läser in kameror…' : 'Inga kameror matchar sökningen. När API-anslutningen är klar visas rikstäckande resultat här.'}</div>}</div></aside>
      </main>
      {selected && <section className="panel detail"><div className="detail-head"><div><h3>{selected.name}</h3><p className="muted">{[selected.road, selected.municipality, selected.county].filter(Boolean).join(' · ')}</p></div><button className="field" onClick={() => setSelected(null)}><X size={17} /></button></div>{selected.image ? <img src={imageUrl(selected)} alt={'Kamerabild ' + selected.name} /> : <div className="notice">Kamerabild visas när den officiella API-anslutningen levererar en bildadress.</div>}<p className="muted">Senaste bild/uppdatering: {formatTime(selected.updatedAt)} · Källa: Trafikverket</p></section>}
      <div className="notice"><strong>Datakälla:</strong> {source} · Senaste hämtning: {formatTime(fetchedAt)}. Bilder är periodiskt uppdaterade stillbilder, inte garanterad livevideo. Följ alltid skyltning och trafikregler.</div>
      <footer className="footer">Svensk Trafikkamera · Öppen trafikinformation · Kartdata © OpenStreetMap-bidragsgivare</footer>
    </div>
  );
}
