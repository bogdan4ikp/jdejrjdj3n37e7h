export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://ais-pre-clti2wlokx77pmmm26rmcb-292694185009.europe-west2.run.app';
export const getAppOrigin = () => {
  // If we are in an APK (e.g., capacitor, file://, localhost in some contexts) 
  // or just to be safe, we can use the SERVER_URL for signaling.
  if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname.includes('capacitor')) {
    return SERVER_URL;
  }
  return window.location.origin;
};
