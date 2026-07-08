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

const detectSafeArea = (property: 'top' | 'bottom'): string => {
  const key = property === 'top' ? 'safe-area-inset-top' : 'safe-area-inset-bottom';
  const testEl = document.createElement('div');
  testEl.style.cssText = `position:fixed;padding-${property}:env(${key}, 0px);pointer-events:none`;
  document.body.appendChild(testEl);
  const value = getComputedStyle(testEl)[`padding${property.charAt(0).toUpperCase() + property.slice(1)}` as keyof CSSStyleDeclaration] as string;
  document.body.removeChild(testEl);
  return value || '0px';
};

const setSafeAreaVariables = () => {
  const top = detectSafeArea('top');
  const bottom = detectSafeArea('bottom');
  if (top !== '0px') document.documentElement.style.setProperty('--eventz-safe-area-top', top);
  if (bottom !== '0px') document.documentElement.style.setProperty('--eventz-safe-area-bottom', bottom);
};

export const configureNativeRuntime = async () => {
  if (isNativeCapacitor()) {
    setNativeClassNames();
    await configureStatusBar();
  }

  setSafeAreaVariables();
};
