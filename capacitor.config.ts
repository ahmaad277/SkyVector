import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skyvector.aircommand',
  appName: 'SkyVector: Air Command',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0B132B',
    scrollEnabled: false,
  },
  android: {
    backgroundColor: '#0B132B',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B132B',
      showSpinner: false,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0B132B',
    },
  },
};

export default config;
