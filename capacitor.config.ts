import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.voxos.app',
  appName: 'VOX-OS',
  webDir: 'dist',
  server: {
    // allow http to the local VOX backend / Desktop Agent over the LAN
    cleartext: true,
  },
};

export default config;
