import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { Search, MapPinned, Camera, RefreshCw, Heart, AlertTriangle, X, RadioTower } from 'lucide-react';
import { fetchCameras } from './services/cameras.js';

const counties = ['Alla lÃ¤n','Stockholms lÃ¤n','Uppsala lÃ¤n','SÃ¶dermanlands lÃ¤n','ÃstergÃ¶tlands lÃ¤n','JÃ¶nkÃ¶pings lÃ¤n','Kronobergs lÃ¤n','Kalmar lÃ¤n','Gotlands lÃ¤n','Blekinge lÃ¤n','SkÃ¥ne lÃ¤n','Hallands lÃ¤n','VÃ¤stra GÃ¶talands lÃ¤n','VÃ¤rmlands lÃ¤n','Ãrebro lÃ¤n','VÃ¤stmanlands lÃ¤n','Dalarnas lÃ¤n','GÃ¤vleborgs lÃ¤n','VÃ¤sternorrlands lÃ¤n','JÃ¤mtlands lÃ¤n','VÃ¤sterbottens lÃ¤n','Norrbottens lÃ¤n'];

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
    const isSafety = camera.cameraType === 'safety' || type.includes('safety') || type.includes('sÃ¤kerhetskamera') || type.includes('fartkamera');
    const cameraCounties = String(camera.county || '').split(', ').filter(Boolean);
    const matchesQuery = !query || searchable.includes(query.toLowerCase());
    const matchesCounty = county === 'Alla lÃ¤n' || cameraCounties.includes(county);
    const matchesKind = kind === 'Alla typer' || (kind === 'Fartkamera' && isSafety) || (kind === 'TrafikflÃ¶de' && !isSafety && (type.includes('traffic') || type.includes('trafikflÃ¶de'))) || (kind === 'VÃ¤glag' && !isSafety && (type.includes('road') || type.includes('vÃ¤glag')));
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
  const [cameraCounts, setCameraCounts] = useState({ traffic: 0, safety: 0 });
  const [apiWarnings, setApiWarnings] = useState([]);
  const [query, setQuery] = useState('');
  const [county, setCounty] = useState('Alla lÃ¤n');
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
    setImageBust(Date.now());
    try {
      const result = await fetchCameras();
      setSource(result.source || 'Trafikverket');
      setFetchedAt(result.fetchedAt || new Date().toISOString());
      setCameraCounts(result.counts || { traffic: 0, safety: 0 });
      setApiWarnings(Array.isArray(result.warnings) ? result.warnings : []);
      if (result.error) {
        setError(result.error);
        setCameras([]);
        setCameraCounts({ traffic: 0, safety: 0 });
        setApiWarnings([]);
      } else {
        setCameras(Array.isArray(result.cameras) ? result.cameras : []);
      }
    } catch (err) {
      setError(err?.message || 'Kunde inte hÃ¤mta kameror');
      setCameras([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCameras(); }, []);
  // Refresh metadata and still-image URLs every two minutes; these are periodic stills, not live video.
  useEffect(() => {
    const timer = window.setInterval(() => { loadCameras(); }, 120000);
    return () => window.clearInterval(timer);
  }, []);

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
        <div className="brand"><div className="brand-mark"><RadioTower size={24} /></div><div><h1>Svensk Trafikkamera</h1><p>Hela Sveriges vÃ¤gar â samlat pÃ¥ ett stÃ¤lle</p></div></div>
        <div className="status">{cameras.length ? cameras.length.toLocaleString('sv-SE') + ' kameror hÃ¤mtade' : 'InvÃ¤ntar datakÃ¤lla'}</div>
      </header>
      <section className="hero"><div><h2>Se lÃ¤get pÃ¥ vÃ¤garna.</h2><p>Offentliga vÃ¤gkameror och vÃ¤glagsbilder frÃ¥n Trafikverket.</p></div><button className="btn" onClick={() => loadCameras()} disabled={loading}><RefreshCw size={15} style={{verticalAlign:'middle',marginRight:7}} />{loading ? 'HÃ¤mtarâ¦' : 'Uppdatera'}</button></section>
      <div className="toolbar">
        <label className="field search-field"><Search size={17}/><input aria-label="SÃ¶k kamera, vÃ¤g eller ort" placeholder="SÃ¶k kamera, vÃ¤g eller ortâ¦" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select className="field" value={county} onChange={(event) => setCounty(event.target.value)}>{counties.map((name) => <option key={name} value={name}>{name}</option>)}</select>
        <select className="field" value={kind} onChange={(event) => setKind(event.target.value)}><option>Alla typer</option><option>TrafikflÃ¶de</option><option>VÃ¤glag</option><option>Fartkamera</option></select>
        <button className="field favorite-filter" onClick={() => setOnlyFavorites(!onlyFavorites)}><Heart size={15} fill={onlyFavorites ? 'currentColor' : 'none'}/>{onlyFavorites ? 'Favoriter' : 'Visa favoriter'}</button>
      </div>
      <div className="stats"><div className="stat"><strong>{cameras.length.toLocaleString('sv-SE')}</strong><span>Totalt hämtade</span></div><div className="stat"><strong>{Number(cameraCounts.traffic || 0).toLocaleString('sv-SE')}</strong><span>Trafikflöde / väglag</span></div><div className="stat"><strong>{Number(cameraCounts.safety || 0).toLocaleString('sv-SE')}</strong><span>Fartkameror</span></div><div className="stat"><strong>{visible.length.toLocaleString('sv-SE')}</strong><span>Visas med filter</span></div><div className="stat"><strong>{favorites.length}</strong><span>Dina favoriter</span></div></div>
      {error && <div className="notice"><AlertTriangle size={16}/>{error}. Inga pÃ¥hittade livebilder visas. Kontrollera backend och Trafikverkets API-nyckel.</div>}
      {apiWarnings.length > 0 && <div className="notice"><AlertTriangle size={16}/><span>Varning från datakällan: {apiWarnings.join(' · ')}</span></div>}
      <main className="layout">
        <section className="panel"><div className="panel-head"><h3><MapPinned size={16}/> Kamerakarta</h3><span className="muted">{visible.length} trÃ¤ffar</span></div><div className="map"><MapContainer center={[62.2,16.5]} zoom={5} scrollWheelZoom style={{height:'100%',width:'100%'}}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/><FlyTo camera={selected}/>{visible.filter((camera) => Number.isFinite(Number(camera.lat)) && Number.isFinite(Number(camera.lon))).map((camera) => <CircleMarker key={camera.id} center={[Number(camera.lat),Number(camera.lon)]} radius={selected?.id === camera.id ? 9 : 6} pathOptions={{color:selected?.id === camera.id ? '#ffd078' : camera.cameraType === 'safety' ? '#ef647c' : '#f2a443',fillColor:camera.cameraType === 'safety' ? '#ef647c' : '#ee8e31',fillOpacity:0.9,weight:2}} eventHandlers={{click:() => setSelected(camera)}}><Popup><strong>{camera.name}</strong><br/>{camera.cameraType === 'safety' ? 'Fartkamera Â· endast position' : (camera.road || '') + ' Â· ' + (camera.county || '')}<br/><button onClick={() => setSelected(camera)}>Visa kamera</button></Popup></CircleMarker>)}</MapContainer></div></section>
        <aside className="panel"><div className="panel-head"><h3><Camera size={16}/> Kameror</h3><span className="muted">{visible.length}</span></div><div className="camera-list">{visible.map((camera) => <div key={camera.id} className={'camera-card ' + (selected?.id === camera.id ? 'active' : '')} onClick={() => setSelected(camera)}><div className="cam-thumb">{camera.image ? <img src={imageUrl(camera)} alt="Kameravy" loading="lazy"/> : <Camera size={24}/>}</div><div className="camera-copy"><h4>{camera.name || 'Trafikkamera'}</h4><p>{[camera.road,camera.municipality,camera.county].filter(Boolean).join(' Â· ')}</p><span className="tag">{camera.cameraType === 'safety' ? 'Fartkamera Â· position' : (String(camera.type || '').toLowerCase().includes('road') || String(camera.type || '').toLowerCase().includes('vÃ¤glag') ? 'VÃ¤glag' : 'TrafikflÃ¶de')}</span></div><button aria-label="Favorit" className="heart-button" onClick={(event) => {event.stopPropagation();toggleFavorite(camera.id);}}><Heart size={18} fill={favorites.includes(camera.id) ? 'currentColor' : 'none'}/></button></div>)}{!visible.length && <div className="empty">{loading ? 'LÃ¤ser in kamerorâ¦' : 'Inga kameror matchar sÃ¶kningen. NÃ¤r API-anslutningen Ã¤r klar visas tillgÃ¤ngliga resultat hÃ¤r.'}</div>}</div></aside>
      </main>
      {selected && <section className="panel detail"><div className="detail-head"><div><h3>{selected.name}</h3><p className="muted">{[selected.road,selected.municipality,selected.county].filter(Boolean).join(' Â· ')}</p></div><button className="field" onClick={() => setSelected(null)}><X size={17}/></button></div>{selected.image ? <img className="detail-image" src={imageUrl(selected)} alt={'Kamerabild ' + selected.name}/> : <div className="notice">Kamerabild visas nÃ¤r Trafikverkets API tillhandahÃ¥ller en bildadress.</div>}<p className="muted">Senaste bild/uppdatering: {formatTime(selected.updatedAt)} Â· KÃ¤lla: Trafikverket</p></section>}
      <div className="notice"><strong>DatakÃ¤lla:</strong> {source} Â· Senaste hÃ¤mtning: {formatTime(fetchedAt)}. Bilder Ã¤r periodiskt uppdaterade stillbilder, inte garanterad livevideo. FÃ¶lj alltid skyltning och trafikregler.</div>
      <footer className="footer">Svensk Trafikkamera Â· Ãppen trafikinformation Â· Kartdata Â© OpenStreetMap-bidragsgivare</footer>
    </div>
  );
}
