const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60, s-maxage=60', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'content-type' };
const reply = (data, status=200) => new Response(JSON.stringify(data), {status, headers});
export default { async fetch(request, env) {
 const url = new URL(request.url);
 if (request.method === 'OPTIONS') return new Response(null,{headers});
 if (url.pathname === '/health') return reply({ok:true,service:'svensk-trafikkamera-api'});
 if (url.pathname !== '/api/cameras' && url.pathname !== '/cameras') return reply({error:'Not found'},404);
 if (!env.TRAFIKVERKET_API_KEY) return reply({error:'Trafikverket API key missing. Configure Worker secret TRAFIKVERKET_API_KEY.'},503);
 const xml = `<REQUEST><LOGIN authenticationkey="${env.TRAFIKVERKET_API_KEY}"/><QUERY objecttype="Camera" schemaversion="1" limit="2000"><INCLUDE>Id</INCLUDE><INCLUDE>Name</INCLUDE><INCLUDE>Description</INCLUDE><INCLUDE>Type</INCLUDE><INCLUDE>Photo</INCLUDE><INCLUDE>PhotoTime</INCLUDE><INCLUDE>ModifiedTime</INCLUDE><INCLUDE>Geometry</INCLUDE><INCLUDE>CountyNo</INCLUDE><INCLUDE>Location</INCLUDE></QUERY></REQUEST>`;
 try { const res=await fetch('https://api.trafikinfo.trafikverket.se/v2/data.json',{method:'POST',headers:{'content-type':'text/xml',accept:'application/json'},body:xml}); if(!res.ok)return reply({error:'Trafikverket API error',status:res.status},502);
 const p=await res.json(); const raw=p?.RESPONSE?.RESULT?.[0]?.Camera||p?.response?.result?.[0]?.camera||[];
 const cameras=raw.map(c=>{const geo=c.Geometry||{};const w=geo.WGS84||geo.Point?.WGS84||'';let lat=null,lon=null;if(typeof w==='string'){const m=w.match(/POINT\\s*\\(\\s*([-0-9.]+)\\s+([-0-9.]+)\\s*\\)/i);if(m){lon=Number(m[1]);lat=Number(m[2]);}}return{id:String(c.Id??''),name:c.Name||c.Description||'Trafikkamera',description:c.Description||'',road:c.Location?.RoadNumber||'',county:c.CountyNo?`Län ${c.CountyNo}`:'',municipality:c.Location?.Municipality||'',type:c.Type||'Camera',image:c.Photo||null,updatedAt:c.PhotoTime||c.ModifiedTime||null,lat,lon};}).filter(c=>c.id);
 return reply({source:'Trafikverket',cameras,count:cameras.length,fetchedAt:new Date().toISOString()});
 }catch(e){return reply({error:'Unable to fetch camera data',detail:String(e?.message||e)},502);}
 }};
