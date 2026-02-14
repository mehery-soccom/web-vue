const { CONST = {} } = window;

export const APP = CONST.APP;
export const WEBAPP = CONST.WEBAPP?.split("/").pop() || APP;
export const APP_CONTEXT =
  (CONST.APP_CONTEXT == "/www" ? undefined : CONST.APP_CONTEXT) ||
  {
    pushapp: `/pushapp` || ``,
    insights360: `/nexus/insights360` || ``,
    notebook: `/nexus/notebook` || ``,
    tikat: `/tikat/` || ``,
  }[APP];
export const CDN_CONTEXT = CONST.CDN_CONTEXT || APP_CONTEXT;
export const API_CONTEXT = CONST.API_CONTEXT || APP_CONTEXT;
export const REMOTE_SERVER_URL = `${window.location.origin}${API_CONTEXT}`;
export const REMOTE_JS_URL = CONST.CDN_URL;

console.log(`Derived constants : `, {
  APP,
  WEBAPP,
  APP_CONTEXT,
  CDN_CONTEXT,
  API_CONTEXT,
  REMOTE_SERVER_URL,
  REMOTE_JS_URL,
});
