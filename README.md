# Svensk Trafikkamera (Android)

Android-first camera browser for public road-camera images published through Trafikverket's open traffic information API.

## Goals
- National map and camera list with county, municipality, road and name search.
- Separate traffic-flow and road-condition cameras.
- Current image viewer, explicit image timestamp/source and user-controlled refresh.
- Favorites stored locally; no personal-location tracking by default.
- Traffic incidents and road-weather context as later opt-in modules.
- Respect Trafikverket API terms, rate limits, image usage conditions and source attribution.

## Data access
Use the official Trafikverket API v2 (`https://api.trafikinfo.trafikverket.se/v2/data.json`) to retrieve Camera metadata and image URLs. Register at Trafikverket's data portal, accept the applicable licence and keep the API key on a backend only. Never ship the key inside the Android APK or frontend bundle. Do not rely on demo keys for production.

Camera images should be loaded from the official image endpoint/URL supplied by camera metadata. The UI must show the last image timestamp and stale/unavailable states. No historical image archive is part of the initial scope.

## Initial architecture
- Android client: responsive web app packaged with Capacitor.
- Backend: Cloudflare Worker proxy with server-side secret binding, cache headers and conservative refresh limits.
- Data: fetch camera metadata from Trafikverket; keep only a compact cache of public camera metadata if needed. Avoid storing image binaries.
- Map: use an open map renderer/provider with attribution; avoid paid Google Maps dependency for the core camera map.

## Milestones
1. Build responsive map/list and camera detail UI with demo data clearly labelled.
2. Add a Worker endpoint for camera metadata and image proxy/cache strategy.
3. Connect a registered Trafikverket API key and verify live camera responses.
4. Package and test Android APK; configure signing separately.
5. Add incidents, weather context, filters and favorites.

## Important distinction
Traffic-flow/road-condition cameras are not the same as speed-enforcement cameras (ATK). Do not infer that any public camera feed is a speed camera. Any ATK location layer, if added, must be an independent public-data layer and presented as road-safety information.
