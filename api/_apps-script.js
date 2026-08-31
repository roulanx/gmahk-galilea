export const APPS_SCRIPT_API_URL =
  'https://script.google.com/macros/s/AKfycbw1efmINulsbsq7PabbKfS_2Jyhfu8HbIADvWFzNaAIF28pQw_xWsM3Krax-13n__Q_fw/exec';

export function appsScriptApiUrl() {
  return process.env.GALILEA_APPS_SCRIPT_API_URL_V19 || APPS_SCRIPT_API_URL;
}
