// Player state persisted across sessions in localStorage.
const KEY = 'royalpoker.save.v1';

const DEFAULT = {
  chips: 25000,
  handsPlayed: 0,
  handsWon: 0,
  biggestPot: 0,
  lastDailyBonus: 0, // timestamp
  totalPurchased: 0, // "spent" in the fake store (cosmetic only)
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode errors */
  }
}

// Format chip counts like a poker app: 1.2K, 3.4M, 1.1B.
export function fmt(n) {
  n = Math.round(n);
  if (n < 1000) return String(n);
  if (n < 1e6) return trim(n / 1e3) + 'K';
  if (n < 1e9) return trim(n / 1e6) + 'M';
  return trim(n / 1e9) + 'B';
}
function trim(x) {
  return (x < 10 ? x.toFixed(1) : Math.round(x).toString()).replace(/\.0$/, '');
}
