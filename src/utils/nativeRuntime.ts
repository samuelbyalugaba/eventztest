import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { isNativeCapacitor } from './platform';

const setNativeClassNames = () => {
  document.documentElement.classList.add('capacitor-native', `capacitor-${Capacitor.getPlatform()}`);
};

const configureStatusBar = async () => {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#7C3AED' });
  } catch (error) {
    console.warn('Failed to configure status bar:', error);
  }
};

export const configureNativeRuntime = async () => {
  if (!isNativeCapacitor()) return;

  setNativeClassNames();
  await configureStatusBar();
};
