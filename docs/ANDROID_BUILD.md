# Android build plan

The first release is an Android-first Progressive Web App packaged with Capacitor.

1. Create the responsive web client and validate on a phone browser.
2. Add Capacitor Android project and app id `se.svensktrafikkamera.app`.
3. Add Android network permission and external map attribution.
4. Configure server URL for the Worker; do not bundle the Trafikverket API key.
5. Build a debug APK for device testing.
6. Configure a private signing keystore outside Git and produce a signed release APK/AAB.
7. Test image refresh, offline fallback, permissions, rotation, accessibility and memory use on a physical Android device.

A signed APK has not yet been produced. Release signing requires a securely stored keystore and passwords provided by the project owner in their local environment only.
