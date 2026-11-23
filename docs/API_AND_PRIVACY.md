# API and privacy design

## Official source
Trafikverket's open traffic information API is available to private individuals and companies. Registration, acceptance of the API licence and email verification are required for full access. Read the current official documentation before release:
- https://www.trafikverket.se/e-tjanster/trafikverkets-oppna-api-for-trafikinformation/
- https://www.trafikverket.se/e-tjanster/hamta-data-fran-trafikverket/
- https://api.trafikinfo.trafikverket.se/

## Camera model
Store/render only fields returned by the current Camera schema, for example camera identity, name/description, type, road/location, county, coordinates, image URL and source modification/image time when available. Validate the exact field names against the current schema before implementation. Do not assume all cameras expose all optional fields.

## API-key handling
- API key only in a server-side secret binding (Cloudflare Worker secret).
- Never commit secrets, put them in Vite variables, or embed them in an APK.
- Proxy only the required Camera query, validate parameters, apply response caching and rate limiting.
- Use the official API and current licence; no scraping of access-restricted systems.

## Privacy
- No account required for read-only camera browsing.
- Favorites and recent camera list stored locally by default.
- Location permission optional and only used when the user taps "near me".
- Do not collect plate numbers, identify individuals, or infer identities from camera imagery.
- No background location tracking.

## Reliability
- Label image time/source and show stale/unavailable state.
- Do not promise continuous live video: the source may provide periodically refreshed still images.
- Avoid mirroring/storing camera images unless the source terms explicitly permit it.
