import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = { appId: 'se.svensktrafikkamera.app', appName: 'Svensk Trafikkamera', webDir: 'dist', bundledWebRuntime: false, plugins: { StatusBar: { backgroundColor: '#101820', style: 'DARK' } } };
export default config;
