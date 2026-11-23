const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=45, s-maxage=45",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type"
};

const countyNames = {
  "1":"Stockholms län","3":"Uppsala län","4":"Södermanlands län","5":"Östergötlands län",
  "6":"Jönköpings län","7":"Kronobergs län","8":"Kalmar län","9":"Gotlands län",
  "10":"Blekinge län","12":"Skåne län","13":"Hallands län","14":"Västra Götalands län",
  "17":"Värmlands län","18":"Örebro län","19":"Västmanlands län","20":"Dalarnas län",
  "21":"Gävleborgs län","22":"Västernorrlands län","23":"Jämtlands län","24":"Västerbottens län","25":"Norrbottens län"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const xmlEscape = value => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"
}[c]));

function parseCoordinates(value) {
  if (typeof value !== "string") return { lat: null, lon: null };
  const match = value.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
  return match ? { lon: Number(match[1]), lat: Number(match[2]) } : { lat: null, lon: null };
}

function normalizeCamera(camera) {
  const raw = camera.CountyNo;
  const codes = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const counties = codes.map(code => countyNames[String(code)]).filter(Boolean);
  const point = parseCoordinates(camera.Geometry?.WGS84);
  return {
    id: String(camera.Id ?? ""),
    name: camera.Name || camera.Description || "Trafikkamera",
    description: camera.Description || "",
    road: camera.Location || camera.RoadNumber || "",
    municipality: "",
    county: counties.join(", "),
    countyCodes: codes.map(String),
    type: camera.Type || "TrafficFlowCamera",
    image: camera.PhotoUrl || null,
    updatedAt: camera.PhotoTime || camera.ModifiedTime || null,
    status: camera.Status || "",
    active: camera.Active !== false,
    ...point
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname === "/health") return json({ ok: true, service: "svensk-trafikkamera-api", time: new Date().toISOString() });
    if (url.pathname !== "/api/cameras" && url.pathname !== "/cameras") return json({ error: "Not found" }, 404);
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.TRAFIKVERKET_API_KEY) return json({ error: "Trafikverket API key is not configured. Add Worker secret TRAFIKVERKET_API_KEY." }, 503);

    const key = xmlEscape(env.TRAFIKVERKET_API_KEY);
    const xml = `<REQUEST><LOGIN authenticationkey="${key}"/><QUERY objecttype="Camera" schemaversion="1" namespace="road.infrastructure" limit="2000"><FILTER><AND><EQ name="Active" value="true"/><EQ name="Deleted" value="false"/></AND></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>Name</INCLUDE><INCLUDE>Description</INCLUDE><INCLUDE>Direction</INCLUDE><INCLUDE>Type</INCLUDE><INCLUDE>PhotoUrl</INCLUDE><INCLUDE>PhotoTime</INCLUDE><INCLUDE>ModifiedTime</INCLUDE><INCLUDE>Status</INCLUDE><INCLUDE>Active</INCLUDE><INCLUDE>Deleted</INCLUDE><INCLUDE>Location</INCLUDE><INCLUDE>RoadNumber</INCLUDE><INCLUDE>CountyNo</INCLUDE><INCLUDE>Geometry.WGS84</INCLUDE></QUERY></REQUEST>`;

    try {
      const upstream = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
        method: "POST",
        headers: { "content-type": "text/xml; charset=utf-8", accept: "application/json" },
        body: xml
      });
      if (!upstream.ok) return json({ error: "Trafikverket API request failed", upstreamStatus: upstream.status }, 502);
      const payload = await upstream.json();
      const rows = payload?.RESPONSE?.RESULT?.flatMap(result => result?.Camera || []) || [];
      const cameras = rows.map(normalizeCamera).filter(camera => camera.id && camera.active);
      return json({ source: "Trafikverket", cameras, count: cameras.length, fetchedAt: new Date().toISOString() });
    } catch (error) {
      return json({ error: "Unable to retrieve camera data", detail: String(error?.message || error) }, 502);
    }
  }
};