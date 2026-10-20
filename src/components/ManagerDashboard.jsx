import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh, USD_TO_KSH } from "../utils/formatPrice";

const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactKsh(value) {
  if (value >= 1_000_000) return `KSh ${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `KSh ${Math.round(value / 1_000)}k`;
  if (value >= 1_000) return `KSh ${(value / 1_000).toFixed(1)}k`;
  return `KSh ${Math.round(value)}`;
}

function makeDailySeries(rows, days) {
  const totalsByDate = new Map(
    rows.map((row) => [row.date, toKsh(row.total_revenue)])
  );
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = toDateKey(date);
    return {
      date: key,
      label: date.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
      }),
      revenue: totalsByDate.get(key) || 0,
    };
  });
}

function RevenueChart({ series }) {
  const width = Math.max(680, series.length * 18);
  const height = 270;
  const left = 76;
  const right = width - 18;
  const top = 16;
  const bottom = height - 42;
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const slotWidth = (right - left) / Math.max(series.length, 1);
  const barWidth = Math.max(4, slotWidth * 0.62);
  const labelIndexes = new Set([
    0,
    Math.floor((series.length - 1) / 3),
    Math.floor(((series.length - 1) * 2) / 3),
    series.length - 1,
  ]);

  return (
    <div className="performance-chart-scroll">
      <svg
        className="performance-revenue-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily net revenue for the selected period"
      >
        {[0, 1, 2, 3].map((step) => {
          const y = top + ((bottom - top) * step) / 3;
          return (
            <g key={step}>
              <line x1={left} x2={right} y1={y} y2={y} className="performance-gridline" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="performance-axis-label">
                {compactKsh(maxRevenue * (1 - step / 3))}
              </text>
            </g>
          );
        })}

        {series.map((point, index) => {
          const barHeight = (point.revenue / maxRevenue) * (bottom - top);
          const x = left + index * slotWidth + (slotWidth - barWidth) / 2;
          const y = bottom - barHeight;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                rx={Math.min(4, barWidth / 2)}
                className="performance-revenue-bar"
              >
                <title>{`${point.label}: ${formatKsh(point.revenue)}`}</title>
              </rect>
              {labelIndexes.has(index) && (
                <text x={x + barWidth / 2} y={height - 14} textAnchor="middle" className="performance-axis-label">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const PAYMENT_COLORS = {
  cash: "#4777d5",
  card: "#e25757",
  "m-pesa": "#35a989",
};

function paymentMethodLabel(method) {
  return {
    cash: "Cash",
    card: "Card",
    "m-pesa": "M-Pesa",
  }[method] || method;
}

function PaymentMethodChart({ rows }) {
  const totalRevenue = rows.reduce((sum, row) => sum + Math.max(toKsh(row.total_revenue), 0), 0);
  const totalTransactions = rows.reduce((sum, row) => sum + Number(row.transaction_count || 0), 0);
  let accumulated = 0;
  const slices = rows.map((row) => {
    const value = Math.max(toKsh(row.total_revenue), 0);
    const start = totalRevenue ? (accumulated / totalRevenue) * 100 : 0;
    accumulated += value;
    const end = totalRevenue ? (accumulated / totalRevenue) * 100 : 0;
    const color = PAYMENT_COLORS[row.payment_method] || "#8295b4";
    return { ...row, color, start, end };
  });
  const gradient = totalRevenue
    ? `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`).join(", ")})`
    : "conic-gradient(#e7ebf2 0% 100%)";

  return (
    <div className="performance-payment-content">
      <div className="performance-donut" style={{ background: gradient }} role="img" aria-label={`Net revenue by payment method. ${formatKsh(totalRevenue)} total.`}>
        <div className="performance-donut-center">
          <strong>{totalTransactions.toLocaleString("en-KE")}</strong>
          <span>transactions</span>
        </div>
      </div>
      <div className="performance-payment-legend">
        {rows.map((row) => (
          <div className="performance-payment-row" key={row.payment_method}>
            <span className="performance-payment-name">
              <i style={{ background: PAYMENT_COLORS[row.payment_method] || "#8295b4" }} aria-hidden="true" />
              {paymentMethodLabel(row.payment_method)}
            </span>
            <strong>{formatKsh(toKsh(row.total_revenue))}</strong>
            <small>{Number(row.transaction_count || 0).toLocaleString("en-KE")} sales</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const [range, setRange] = useState(30);
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loadedRange, setLoadedRange] = useState(null);
  const [error, setError] = useState("");
  const [shifts, setShifts] = useState([]);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [shiftsError, setShiftsError] = useState("");
  const [closingShiftId, setClosingShiftId] = useState(null);
  const [closingCash, setClosingCash] = useState("");
  const [closingBusy, setClosingBusy] = useState(false);
  const [closingError, setClosingError] = useState("");
  const loading = loadedRange !== range;

  useEffect(() => {
    let active = true;
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (range - 1));
    const query = new URLSearchParams({
      start_date: toDateKey(start),
      end_date: toDateKey(end),
    }).toString();

    const loadDashboard = async () => {
      try {
        const [dashboard, margin, revenueByDate, paymentMethods, bestSellers, salesByCashier] = await Promise.all([
          apiFetch(`/reports/dashboard?${query}`),
          apiFetch(`/reports/gross-margin?${query}`),
          apiFetch(`/reports/sales-by-date?${query}`),
          apiFetch(`/reports/payment-methods?${query}`),
          apiFetch(`/reports/best-selling-products?${query}`),
          apiFetch(`/reports/sales-by-cashier?${query}`),
        ]);
        if (!active) return;
        setData({
          dashboard,
          margin,
          revenueByDate: revenueByDate.results || [],
          paymentMethods: paymentMethods.results || [],
          bestSellers: bestSellers.results || [],
          salesByCashier: salesByCashier.results || [],
        });
        setError("");
      } catch (requestError) {
        if (active) {
          setData(null);
          setError(requestError.message || "Could not load dashboard data.");
        }
      } finally {
        if (active) setLoadedRange(range);
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [range]);

  const loadShifts = useCallback(async () => {
    try {
      const result = await apiFetch("/shifts");
      setShifts(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setShiftsError(requestError.message || "Could not load cashier shifts.");
    } finally {
      setShiftsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch("/shifts")
      .then((result) => {
        if (active) setShifts(Array.isArray(result) ? result : []);
      })
      .catch((requestError) => {
        if (active) setShiftsError(requestError.message || "Could not load cashier shifts.");
      })
      .finally(() => {
        if (active) setShiftsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const closeCashierShift = async (event, shift) => {
    event.preventDefault();
    setClosingBusy(true);
    setClosingError("");
    try {
      await apiFetch(`/shifts/${shift.id}/close`, {
        method: "POST",
        body: JSON.stringify({ closing_cash: Number(closingCash) / USD_TO_KSH }),
      });
      setClosingShiftId(null);
      setClosingCash("");
      setShiftsLoading(true);
      setShiftsError("");
      await loadShifts();
    } catch (requestError) {
      setClosingError(requestError.message || "Could not close this shift.");
    } finally {
      setClosingBusy(false);
    }
  };

  const series = useMemo(
    () => makeDailySeries(data?.revenueByDate || [], range),
    [data, range]
  );
  const dashboard = data?.dashboard;
  const margin = data?.margin;
  const totalSalesKsh = toKsh(dashboard?.total_sales);
  const transactionCount = Number(dashboard?.transaction_count || 0);
  const revenueKsh = toKsh(dashboard?.total_revenue);
  const avgSaleKsh = transactionCount ? Math.round(revenueKsh / transactionCount) : 0;
  const grossMarginKsh = toKsh(margin?.gross_margin);
  const grossMarginRate = toKsh(margin?.net_revenue)
    ? (grossMarginKsh / toKsh(margin.net_revenue)) * 100
    : 0;
  const bestSellers = (data?.bestSellers || []).slice(0, 5);
  const maxQuantity = Math.max(...bestSellers.map((product) => Number(product.quantity_sold)), 1);
  const salesByCashier = (data?.salesByCashier || []).slice(0, 5);
  const maxCashierRevenue = Math.max(...salesByCashier.map((cashier) => toKsh(cashier.total_revenue)), 1);
  const openShifts = shifts.filter((shift) => shift.status === "open");
  const closedShifts = shifts.filter((shift) => shift.status === "closed").slice(0, 6);

  return (
    <div className="manager-dashboard manager-dashboard--performance">
      <main className="manager-content performance-dashboard">
        <section className="performance-workspace" aria-label="Interactive business dashboard">
        <div className="performance-heading">
          <div>
            <p className="performance-eyebrow">TECHPOINT · BUSINESS OVERVIEW</p>
            <h1>Sales performance</h1>
            <p>Track revenue, payment mix, product demand, and till activity.</p>
          </div>
          <label className="performance-range-control">
            <span>Reporting period</span>
            <select value={range} onChange={(event) => { setError(""); setRange(Number(event.target.value)); }}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="performance-tabs" role="tablist" aria-label="Dashboard sections">
          <button
            id="performance-overview-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            aria-controls="performance-overview-panel"
            className={activeTab === "overview" ? "is-active" : ""}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            id="performance-shifts-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "shifts"}
            aria-controls="performance-shifts-panel"
            className={activeTab === "shifts" ? "is-active" : ""}
            onClick={() => setActiveTab("shifts")}
          >
            Shifts <span>{openShifts.length}</span>
          </button>
        </div>

        {error && <p className="performance-error" role="alert">Dashboard unavailable: {error}</p>}

        {activeTab === "overview" && (
        <div id="performance-overview-panel" className="performance-overview" role="tabpanel" aria-labelledby="performance-overview-tab">
        <section className="performance-kpis" aria-label="Sales summary">
          <article className="performance-kpi">
            <span>Total sales</span>
            <strong>{loading ? "…" : formatKsh(totalSalesKsh)}</strong>
            <small>Before recorded refunds</small>
          </article>
          <article className="performance-kpi performance-kpi--primary">
            <span>Net sales</span>
            <strong>{loading ? "…" : formatKsh(revenueKsh)}</strong>
            <small>After recorded refunds</small>
          </article>
          <article className="performance-kpi">
            <span>Transactions</span>
            <strong>{loading ? "…" : transactionCount.toLocaleString("en-KE")}</strong>
            <small>Completed sales</small>
          </article>
          <article className="performance-kpi">
            <span>Gross profit</span>
            <strong>{loading ? "…" : formatKsh(grossMarginKsh)}</strong>
            <small>{loading ? "Based on item costs" : `${grossMarginRate.toFixed(1)}% of net sales`}</small>
          </article>
          <article className="performance-kpi">
            <span>Average sale</span>
            <strong>{loading ? "…" : formatKsh(avgSaleKsh)}</strong>
            <small>Net sales per transaction</small>
          </article>
        </section>

        <section className="performance-quick-stats" aria-label="Store status">
          <div><span>Active products</span><strong>{loading ? "…" : Number(dashboard?.product_count || 0).toLocaleString("en-KE")}</strong></div>
          <div><span>Cashiers</span><strong>{loading ? "…" : Number(dashboard?.cashier_count || 0).toLocaleString("en-KE")}</strong></div>
          <div><span>Low-stock alerts</span><strong className={dashboard?.low_stock_count ? "has-alert" : ""}>{loading ? "…" : Number(dashboard?.low_stock_count || 0).toLocaleString("en-KE")}</strong></div>
          <button type="button" onClick={() => setActiveTab("shifts")} aria-label={`${openShifts.length} open cashier shifts. View shifts`}>
            <span>Open shifts</span><strong>{shiftsLoading ? "…" : openShifts.length.toLocaleString("en-KE")}</strong>
          </button>
        </section>

        <div className="performance-grid">
          <section className="performance-panel performance-panel--revenue">
            <div className="performance-panel-heading">
            <div>
              <h2>Daily revenue</h2>
              <p>Net sales by day · KSh</p>
            </div>
          </div>
          {loading ? (
            <p className="performance-empty">Loading revenue history…</p>
          ) : !data?.revenueByDate?.length ? (
            <p className="performance-empty">No completed sales to chart in this period.</p>
          ) : (
            <RevenueChart series={series} />
          )}
          </section>

          <section className="performance-panel performance-panel--payments">
            <div className="performance-panel-heading">
              <div>
                <h2>Payment methods</h2>
                <p>Net sales by tender type</p>
              </div>
            </div>
            {loading ? (
              <p className="performance-empty">Loading payment summary…</p>
            ) : !data?.paymentMethods?.length ? (
              <p className="performance-empty">No payments in this period.</p>
            ) : (
              <PaymentMethodChart rows={data.paymentMethods} />
            )}
          </section>

          <section className="performance-panel">
            <div className="performance-panel-heading">
              <div>
                <h2>Best-selling products</h2>
                <p>Ranked by units sold, less returned units</p>
              </div>
            </div>
            {loading ? (
              <p className="performance-empty">Loading product sales…</p>
            ) : bestSellers.length === 0 ? (
              <p className="performance-empty">No product sales in this period.</p>
            ) : (
              <ol className="performance-rankings">
                {bestSellers.map((product, index) => {
                  const quantity = Number(product.quantity_sold) || 0;
                  return (
                    <li key={product.product_id}>
                      <div className="performance-ranking-heading">
                        <span className="performance-rank">{index + 1}</span>
                        <strong title={product.product_title}>{product.product_title}</strong>
                        <span>{quantity} units</span>
                      </div>
                      <div className="performance-bar-track"><span style={{ width: `${Math.max((quantity / maxQuantity) * 100, quantity ? 3 : 0)}%` }} /></div>
                      <small>{formatKsh(toKsh(product.total_revenue))} net revenue</small>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="performance-panel">
          <div className="performance-panel-heading">
            <div>
              <h2>Sales by cashier</h2>
              <p>Net revenue and transaction count</p>
            </div>
          </div>
          {loading ? (
            <p className="performance-empty">Loading cashier performance…</p>
          ) : salesByCashier.length === 0 ? (
            <p className="performance-empty">No cashier sales in this period.</p>
          ) : (
            <div className="performance-cashier-list">
              {salesByCashier.map((cashier) => {
                const cashierRevenue = toKsh(cashier.total_revenue);
                return (
                  <div className="performance-cashier-row" key={cashier.user_id}>
                    <div className="performance-cashier-heading">
                      <strong>{cashier.name || cashier.username}</strong>
                      <span>{formatKsh(cashierRevenue)}</span>
                    </div>
                    <div className="performance-bar-track"><span style={{ width: `${Math.max((cashierRevenue / maxCashierRevenue) * 100, 2)}%` }} /></div>
                    <small>{Number(cashier.transaction_count || 0).toLocaleString("en-KE")} transactions</small>
                  </div>
                );
              })}
            </div>
          )}
          </section>

          <section className="performance-panel performance-panel--stock">
            <div className="performance-panel-heading">
              <div>
                <h2>Low-stock watch</h2>
                <p>{dashboard?.low_stock_count ?? 0} products need attention</p>
              </div>
              <NavLink to="/manager/products">Manage inventory <span aria-hidden="true">→</span></NavLink>
            </div>
            {loading ? (
              <p className="performance-empty">Loading stock levels…</p>
            ) : !dashboard?.low_stock_products?.length ? (
              <p className="performance-empty">All active products are above their low-stock thresholds.</p>
            ) : (
              <div className="performance-table-scroll">
                <table className="performance-table">
                  <thead><tr><th>Product</th><th>In stock</th><th>Threshold</th><th>Status</th></tr></thead>
                  <tbody>
                    {dashboard.low_stock_products.slice(0, 7).map((product) => (
                      <tr key={product.id}>
                        <th scope="row">{product.title}</th>
                        <td>{product.stock_quantity}</td>
                        <td>{product.low_stock_threshold}</td>
                        <td><span className="performance-stock-alert">Restock</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        </div>
        )}

        {activeTab === "shifts" && (
          <div id="performance-shifts-panel" className="performance-shifts" role="tabpanel" aria-labelledby="performance-shifts-tab">
            <section className="performance-panel performance-panel--shift-list">
              <div className="performance-panel-heading">
                <div>
                  <h2>Open cashier shifts</h2>
                  <p>{openShifts.length} till{openShifts.length === 1 ? "" : "s"} currently open</p>
                </div>
                <button className="performance-refresh-button" type="button" onClick={() => { setShiftsLoading(true); setShiftsError(""); loadShifts(); }} disabled={shiftsLoading || closingBusy}>
                  {shiftsLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
              {shiftsError && <p className="performance-error" role="alert">{shiftsError}</p>}
              {shiftsLoading && shifts.length === 0 ? (
                <p className="performance-empty">Loading cashier shifts…</p>
              ) : openShifts.length === 0 ? (
                <p className="performance-empty">There are no open cashier shifts.</p>
              ) : (
                <div className="performance-shift-list">
                  {openShifts.map((shift) => (
                    <article className="performance-shift-card" key={shift.id}>
                      <div className="performance-shift-main">
                        <div>
                          <span className="performance-shift-status">Open</span>
                          <h3>{shift.cashier || `Cashier ${shift.user_id}`}</h3>
                          <p>Opened {new Date(shift.opened_at).toLocaleString()}</p>
                        </div>
                        <div className="performance-shift-cash">
                          <span>Expected till cash</span>
                          <strong>{formatKsh(toKsh(shift.expected_cash))}</strong>
                        </div>
                      </div>
                      {closingShiftId === shift.id ? (
                        <form className="performance-close-form" onSubmit={(event) => closeCashierShift(event, shift)}>
                          <label>
                            Counted cash (KSh)
                            <input type="number" min="0" step="0.01" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} required />
                          </label>
                          <button className="performance-close-submit" type="submit" disabled={closingBusy}>
                            {closingBusy ? "Closing…" : "Reconcile & close shift"}
                          </button>
                          <button className="performance-close-cancel" type="button" onClick={() => { setClosingShiftId(null); setClosingCash(""); setClosingError(""); }} disabled={closingBusy}>
                            Cancel
                          </button>
                          {closingError && <p className="performance-error" role="alert">{closingError}</p>}
                        </form>
                      ) : (
                        <button className="performance-close-trigger" type="button" onClick={() => { setClosingShiftId(shift.id); setClosingCash(""); setClosingError(""); }}>
                          Close shift
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="performance-panel performance-panel--closed-shifts">
              <div className="performance-panel-heading">
                <div>
                  <h2>Recently closed shifts</h2>
                  <p>Review counted cash and reconciliation results</p>
                </div>
              </div>
              {closedShifts.length === 0 ? (
                <p className="performance-empty">Closed shifts will appear here.</p>
              ) : (
                <div className="performance-table-scroll">
                  <table className="performance-table">
                    <thead><tr><th>Cashier</th><th>Closed</th><th>Expected</th><th>Counted</th><th>Difference</th></tr></thead>
                    <tbody>
                      {closedShifts.map((shift) => (
                        <tr key={shift.id}>
                          <th scope="row">{shift.cashier || `Cashier ${shift.user_id}`}</th>
                          <td>{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : "—"}</td>
                          <td>{formatKsh(toKsh(shift.expected_cash))}</td>
                          <td>{formatKsh(toKsh(shift.closing_cash))}</td>
                          <td>{formatKsh(toKsh(shift.cash_variance))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
        </section>
      </main>
    </div>
  );
}

export default ManagerDashboard;
