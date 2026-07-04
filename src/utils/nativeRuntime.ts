import { Capacitor } from '@capacitor/core';
import { isNativeCapacitor } from './platform';

const setNativeClassNames = () => {
  document.documentElement.classList.add('capacitor-native', `capacitor-${Capacitor.getPlatform()}`);
};

export const configureNativeRuntime = async () => {
  if (!isNativeCapacitor()) return;

  setNativeClassNames();
};
