// src/utils/receiptText.js
// Build a plain-text receipt from a completed sale object.
//
// Expected sale shape:
// {
//   id: "SALE-...",
//   receiptNumber: "TP-20261003-4821",
//   createdAt: 1696339200000,
//   cashier: "cashier" | { name: "..." },
//   items: [
//     { id, title, price /* USD */, quantity, lineTotalKsh? }
//   ],
//   subtotalKsh, totalKsh,
//   paymentMethod: "Cash" | "Card" | "M-Pesa"
// }

import { formatKsh, toKsh } from "./formatPrice.js";
import { formatDateTime } from "./dates.js";

const STORE_NAME = "TechPoint POS";
const LINE_WIDTH = 44;

function padRight(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function padLeft(str, len) {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len) : " ".repeat(len - s.length) + s;
}

function center(str, len) {
  const s = String(str ?? "");
  if (s.length >= len) return s.slice(0, len);
  const left = Math.floor((len - s.length) / 2);
  return " ".repeat(left) + s;
}

function divider(char = "-") {
  return char.repeat(LINE_WIDTH);
}

function moneyOf(item) {
  if (Number.isFinite(item.lineTotalKsh)) return item.lineTotalKsh;
  const unitKsh = Number.isFinite(item.unitKsh) ? item.unitKsh : toKsh(item.price);
  return unitKsh * (item.quantity ?? 1);
}

/**
 * Build a plain-text receipt.
 * @param {object} sale
 * @returns {string}
 */
export function buildReceiptText(sale) {
  if (!sale) return "";

  const items = Array.isArray(sale.items) ? sale.items : [];
  const totalKsh = Number.isFinite(sale.totalKsh)
    ? sale.totalKsh
    : items.reduce((sum, i) => sum + moneyOf(i), 0);
  const subtotalKsh = Number.isFinite(sale.subtotalKsh) ? sale.subtotalKsh : totalKsh;

  const cashierName =
    typeof sale.cashier === "string"
      ? sale.cashier
      : sale.cashier?.name || "—";

  const lines = [];

  lines.push(divider("="));
  lines.push(center(STORE_NAME, LINE_WIDTH));
  lines.push(center("Receipt", LINE_WIDTH));
  lines.push(divider("="));
  lines.push("");

  lines.push(`Receipt # : ${sale.receiptNumber || sale.id || "—"}`);
  lines.push(`Date      : ${formatDateTime(sale.createdAt || Date.now())}`);
  lines.push(`Cashier   : ${cashierName}`);
  lines.push("");
  lines.push(divider("-"));
  lines.push(padRight("Item", 20) + padLeft("Qty", 5) + padLeft("Unit", 10) + padLeft("Total", 9));
  lines.push(divider("-"));

  for (const item of items) {
    const title = String(item.title ?? "Item");
    const qty = item.quantity ?? 1;
    const unitKsh = Number.isFinite(item.unitKsh) ? item.unitKsh : toKsh(item.price);
    const lineKsh = moneyOf(item);

    lines.push(
      padRight(title, 20) +
        padLeft(qty, 5) +
        padLeft(formatKsh(unitKsh), 10) +
        padLeft(formatKsh(lineKsh), 9)
    );
  }

  lines.push(divider("-"));
  lines.push("");
  lines.push(padLeft("Subtotal: " + formatKsh(subtotalKsh), LINE_WIDTH));
  lines.push(padLeft("TOTAL:    " + formatKsh(totalKsh), LINE_WIDTH));
  lines.push("");
  if (sale.paymentMethod) {
    lines.push(padLeft("Paid via: " + sale.paymentMethod, LINE_WIDTH));
    if (sale.amountTenderedKsh != null) {
      lines.push(padLeft("Cash received: " + formatKsh(sale.amountTenderedKsh), LINE_WIDTH));
      lines.push(padLeft("Change: " + formatKsh(sale.changeGivenKsh || 0), LINE_WIDTH));
    }
    lines.push("");
  }
  lines.push(divider("="));
  lines.push(center("Thank you for shopping with us!", LINE_WIDTH));
  lines.push(divider("="));

  return lines.join("\n");
}

/**
 * Trigger a browser download of the receipt as a .txt file.
 * Safe to call from a button handler.
 */
export function downloadReceiptText(sale) {
  const text = buildReceiptText(sale);
  if (!text) return;

  const filename = `${sale.receiptNumber || sale.id || "receipt"}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
