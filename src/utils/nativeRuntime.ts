import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeCapacitor } from './platform';

const setNativeClassNames = () => {
  document.documentElement.classList.add('capacitor-native', `capacitor-${Capacitor.getPlatform()}`);
};

export const configureNativeRuntime = async () => {
  if (!isNativeCapacitor()) return;

  setNativeClassNames();

  try {
    await SystemBars.show({});
    await SystemBars.setStyle({ style: SystemBarsStyle.Light });
  } catch {
    // SystemBars is bundled with Capacitor 8, but older native shells may not have it synced yet.
  }

  try {
    await StatusBar.show();
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setBackgroundColor({ color: '#FAFAFA' });
  } catch {
    // Keep startup resilient if the plugin is not present in an older installed build.
  }
};
