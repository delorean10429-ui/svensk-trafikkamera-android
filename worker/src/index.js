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
  "21":"Gävleborgs län","22":"Västernorrlands län","23":"Jämtlands län",
  "24":"Västerbottens län","25":"Norrbottens län"
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });

const xmlEscape = value => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"
}[c]));

function parsePoint(value) {
  if (typeof value !== "string") return { lat: null, lon: null };
  const m = value.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
  return m ? { lon: Number(m[1]), lat: Number(m[2]) } : { lat: null, lon: null };
}

function countyInfo(camera) {
  const rawCodes = camera.Counties ?? camera.CountyNo ?? [];
  const codes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).flatMap(v => {
    if (v == null) return [];
    if (typeof v === "object") return [v.Code ?? v.CountyNo ?? v.Value ?? v.Name].filter(x => x != null);
    return [v];
  });
  return {
    county: codes.map(c => countyNames[String(c)]).filter(Boolean).join(", "),
    countyCodes: codes.map(String)
  };
}

function normalizeCamera(camera) {
  const point = parsePoint(camera.Geometry?.WGS84);
  const county = countyInfo(camera);
  return {
    id: String(camera.Id ?? ""),
    name: camera.Name || camera.Description || "Trafikkamera",
    description: camera.Description || "",
    road: camera.Location || camera.RoadNumber || camera.Road || "",
    municipality: "",
    ...county,
    roadNumber: camera.RoadNumber || camera.Road || "",
    type: camera.Type || "Trafikflödeskamera",
    cameraType: "traffic",
    image: camera.PhotoUrl || camera.PhotoUrlThumbnail || null,
    thumbnail: camera.PhotoUrlThumbnail || camera.PhotoUrl || null,
    fullsize: camera.PhotoUrlFullsize || null,
    updatedAt: camera.PhotoTime || camera.ModifiedTime || null,
    status: camera.Status || "",
    active: camera.Active !== false && camera.Deleted !== true,
    bearing: Number(camera.Direction ?? camera.Bearing ?? 0),
    lat: point.lat,
    lon: point.lon
  };
}

function normalizeSafetyCamera(camera) {
  const point = parsePoint(camera.Geometry?.WGS84);
  const county = countyInfo(camera);
  return {
    id: String(camera.Id ?? ""),
    name: camera.Name || "Trafiksäkerhetskamera",
    description: "Trafiksäkerhetskamera (ATK/fartkamera)",
    road: camera.RoadNumber ? "Väg " + camera.RoadNumber : "",
    roadNumber: camera.RoadNumber || "",
    municipality: "",
    ...county,
    type: "Trafiksäkerhetskamera",
    cameraType: "safety",
    image: null,
    thumbnail: null,
    fullsize: null,
    updatedAt: camera.ModifiedTime || null,
    status: "positionAvailable",
    active: camera.Deleted !== true,
    bearing: Number(camera.Bearing || 0),
    lat: point.lat,
    lon: point.lon
  };
}

async function queryTrafikverket(apiKey, objectType, includes) {
  const includeXml = includes.map(name => "<INCLUDE>" + name + "</INCLUDE>").join("");
  const activeFilter = objectType === "Camera" ? `<EQ name="Active" value="true"/>` : "";
  const xml = `<REQUEST><LOGIN authenticationkey="${xmlEscape(apiKey)}"/><QUERY objecttype="${objectType}" schemaversion="1" namespace="road.infrastructure" limit="10000"><FILTER><AND><EQ name="Deleted" value="false"/>${activeFilter}</AND></FILTER>${includeXml}</QUERY></REQUEST>`;
  const response = await fetch("https://api.trafikinfo.trafikverket.se/v2/data.json", {
    method: "POST",
    headers: { "content-type": "text/xml; charset=utf-8", accept: "application/json" },
    body: xml
  });
  if (!response.ok) throw new Error("Trafikverket svarade " + response.status + " för " + objectType);
  const payload = await response.json();
  return (payload?.RESPONSE?.RESULT || []).flatMap(row => Array.isArray(row?.[objectType]) ? row[objectType] : []);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { headers });
    if (url.pathname === "/health") return json({ ok: true, service: "svensk-trafikkamera-api", time: new Date().toISOString() });
    if (url.pathname !== "/api/cameras" && url.pathname !== "/cameras") return json({ error: "Not found" }, 404);
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!env.TRAFIKVERKET_API_KEY) return json({ error: "Trafikverket API key is not configured. Add Worker secret TRAFIKVERKET_API_KEY." }, 503);

    try {
      const trafficRaw = await queryTrafikverket(env.TRAFIKVERKET_API_KEY, "Camera", [
          "Id","Name","Description","Direction","Type","PhotoUrl","PhotoUrlThumbnail",
          "PhotoUrlFullsize","PhotoTime","ModifiedTime","Status","Active","Deleted",
          "Location","RoadNumber","Counties","Geometry.WGS84"
      ]);
      let safetyRaw = [];
      let safetyWarning = null;
      try {
        safetyRaw = await queryTrafikverket(env.TRAFIKVERKET_API_KEY, "TrafficSafetyCamera", [
          "Id","Name","Bearing","RoadNumber","Counties","Deleted","ModifiedTime","Geometry.WGS84"
        ]);
      } catch (safetyError) {
        safetyWarning = "Fartkameror kunde inte hämtas: " + String(safetyError?.message || safetyError);
      }
      const traffic = trafficRaw.map(normalizeCamera).filter(c => c.id && c.active && c.lat !== null && c.lon !== null);
      const safety = safetyRaw.map(normalizeSafetyCamera).filter(c => c.id && c.active && c.lat !== null && c.lon !== null);
      const cameras = [...traffic, ...safety];
      return json({
        source: "Trafikverket",
        cameras,
        count: cameras.length,
        counts: { traffic: traffic.length, safety: safety.length },
        warnings: safetyWarning ? [safetyWarning] : [],
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      return json({ error: "Kunde inte hämta kameradata från Trafikverket", detail: String(error?.message || error) }, 502);
    }
  }
};
