import dashboard from "./dashboard";
import setup from "./setup";
import admin from "./admin";

const userRoles = window.CONST?.USER?.role || [];
const hideSetup = userRoles.includes('MODERATOR') || userRoles.includes('USER');

export default [
  ...dashboard,
  ...admin,
  ...(hideSetup ? [] : setup),
];
