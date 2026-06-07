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

// Where the agent stores everything it learns (gitignored — it's your course data).
export const DATA_DIR = join(root, "data");

// Claude model + reasoning settings. Override with MODEL=claude-sonnet-4-6 etc.
export const MODEL = process.env.MODEL || "claude-opus-4-7";

// Crawler bounds — keep it polite and read-only.
export const START_URL =
  process.env.START_URL ||
  "https://sheilta.apps.openu.ac.il/pls/dmyopt2/sheilta.main";
export const MAX_PAGES = Number(process.env.MAX_PAGES || 40);
export const MAX_DEPTH = Number(process.env.MAX_DEPTH || 2);
export const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 800);

// Never follow links whose URL contains these — avoids stateful/destructive
// actions (logging out, submitting/deleting things) while roaming.
export const DENY_PATTERNS = [
  "logout",
  "signout",
  "sign_out",
  "sign-out",
  "/delete",
  "remove",
  "submit",
];

// Skip binary downloads while crawling (PDFs etc. are a later slice).
export const SKIP_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
  ".zip", ".rar", ".jpg", ".jpeg", ".png", ".gif", ".svg",
  ".mp4", ".mp3", ".avi", ".mov",
];
