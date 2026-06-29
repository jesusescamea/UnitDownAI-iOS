/**
 * DiagnosePage — the HVAC diagnostic engine at /diagnose.
 *
 * The core diagnostic component (Home) lives in App.tsx and is consumed here
 * as a named export. Signed-in users arriving at /diagnose get the full
 * diagnostic experience. Unauthenticated users on the root route also use Home.
 *
 * Future: extract Home + its helpers into this file to fully decouple from App.tsx.
 */
export { Home as default } from "../App";
