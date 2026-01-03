import dashboard from "./dashboard";
import setup from "./setup";

const userRoles = window.CONST?.USER?.role || [];
const hideSetup = userRoles.includes('MODERATOR') || userRoles.includes('AGENT');

export default [
  ...dashboard,
  ...(hideSetup ? [] : setup),
];
