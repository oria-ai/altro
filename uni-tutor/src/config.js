import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

export const SESSION_DIR = join(root, ".session");
export const SESSION_FILE = join(SESSION_DIR, "state.json");

// The page where you start logging in. Override per institution:
//   LOGIN_URL=https://login.your-uni.example npm run auth
// Default: Open University of Israel SSO -> Sheilta student portal.
export const LOGIN_URL =
  process.env.LOGIN_URL ||
  "https://sso.apps.openu.ac.il/login?T_PLACE=https://sheilta.apps.openu.ac.il/pls/dmyopt2/sheilta.main";
