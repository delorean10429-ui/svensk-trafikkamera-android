# API and privacy design

## Official source
Use Trafikverket's open traffic information API v2 (`https://api.trafikinfo.trafikverket.se/v2/data.json`). Camera metadata is queried as `objecttype="Camera"`, `schemaversion="1"`, namespace `road.infrastructure`. The current query includes active cameras only and requests `Id`, `Name`, `Description`, `Type`, `PhotoUrl`, `PhotoTime`, `ModifiedTime`, `Status`, `Active`, `Deleted`, `Location`, `Counties` and `Geometry.WGS84`.

Registration, licence acceptance and email verification are required for full API access. Official information: https://www.trafikverket.se/e-tjanster/trafikverkets-oppna-api-for-trafikinformation/ and https://www.trafikverket.se/e-tjanster/hamta-data-fran-trafikverket/.

## API-key handling
- Store API key only as Cloudflare Worker secret `TRAFIKVERKET_API_KEY`.
- Never commit secrets or put them in the APK/frontend bundle.
- Proxy only the required Camera query; cache metadata briefly and do not archive image binaries.
- Respect current API licence and traffic limits.

## Privacy
- No account required for read-only browsing.
- Favorites stored locally by default.
- Location permission optional and only used when a user explicitly chooses nearby cameras.
- No plate recognition, person identification or background location tracking.

## Reliability
- Label source and image timestamp.
- Mark stale or missing images clearly.
- Camera feeds are periodically refreshed still images, not guaranteed live video.
- Distinguish traffic-flow cameras from road-condition cameras.
