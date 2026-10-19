// src/utils/storage.js
// Safe wrapper around browser localStorage.
// - Never throws (falls back silently if storage is unavailable)
// - JSON-serializes values automatically
// - Returns a provided default if the key is missing or malformed

const PREFIX = "techpoint:";

function getBackend() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Accessing localStorage can throw in some privacy modes
  }
  return null;
}

function prefixed(key) {
  return `${PREFIX}${key}`;
}

export function load(key, fallback = null) {
  const backend = getBackend();
  if (!backend) return fallback;
  try {
    const raw = backend.getItem(prefixed(key));
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  const backend = getBackend();
  if (!backend) return false;
  try {
    backend.setItem(prefixed(key), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  const backend = getBackend();
  if (!backend) return false;
  try {
    backend.removeItem(prefixed(key));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  const backend = getBackend();
  if (!backend) return false;
  try {
    const toRemove = [];
    for (let i = 0; i < backend.length; i++) {
      const key = backend.key(i);
      if (key && key.startsWith(PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => backend.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export function keys() {
  const backend = getBackend();
  if (!backend) return [];
  try {
    const result = [];
    for (let i = 0; i < backend.length; i++) {
      const key = backend.key(i);
      if (key && key.startsWith(PREFIX)) result.push(key.slice(PREFIX.length));
    }
    return result;
  } catch {
    return [];
  }
}

export const KEYS = Object.freeze({
  AUTH: "auth",
  CART: "cart",
  ORDERS: "orders",
  LEDGER: "ledger",
  RESTOCKS: "restocks",
  STOCK_OVERRIDES: "stockOverrides",
  SETTINGS: "settings",
  LOW_STOCK_THRESHOLD: "lowStockThreshold",
});
