// src/utils/id.js
// Short, unique, human-readable IDs for orders, ledger entries, etc.
// Format: "PREFIX-base36time-randomseq"
// Example: "SALE-lz3k4a-7f2"
//
// Note: this is suitable for a frontend simulation. A real backend
// should generate its own IDs (UUID, DB sequence, etc.).

let counter = 0;

/**
 * Generate a unique ID with the given prefix.
 * @param {string} prefix - e.g. "SALE", "ORD", "LEDGER"
 * @returns {string}
 */
export function makeId(prefix = "ID") {
  counter = (counter + 1) % 1_000_000;
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 46_656).toString(36).padStart(3, "0");
  const seq = counter.toString(36).padStart(2, "0");
  return `${prefix}-${time}-${rand}${seq}`;
}

export const saleId    = () => makeId("SALE");
export const orderId   = () => makeId("ORD");
export const ledgerId  = () => makeId("LED");
export const restockId = () => makeId("RST");

/**
 * Generate a short receipt number for display to customers.
 * Format: "TP-YYYYMMDD-XXXX" where XXXX is a random 4-digit number.
 * Example: "TP-20261003-4821"
 */
export function receiptNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const n = Math.floor(1000 + Math.random() * 9000);
  return `TP-${y}${m}${d}-${n}`;
}
