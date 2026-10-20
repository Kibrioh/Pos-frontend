import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh } from "../utils/formatPrice";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - (range - 1));
    const query = new URLSearchParams({
      start_date: toDateKey(start),
      end_date: toDateKey(end),
    }).toString();

    setLoading(true);
    setError("");

    Promise.all([
      apiFetch(`/reports/dashboard?${query}`),
      apiFetch(`/reports/gross-margin?${query}`),
      apiFetch(`/reports/sales-by-date?${query}`),
      apiFetch(`/reports/payment-methods?${query}`),
      apiFetch(`/reports/best-selling-products?${query}`),
      apiFetch(`/reports/sales-by-cashier?${query}`),
    ])
      .then(([dashboard, margin, revenueByDate, paymentMethods, bestSellers, salesByCashier]) => {
        if (!active) return;
        setData({
          dashboard,
          margin,
          revenueByDate: revenueByDate.results || [],
          paymentMethods: paymentMethods.results || [],
          bestSellers: bestSellers.results || [],
          salesByCashier: salesByCashier.results || [],
        });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load dashboard data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const series = useMemo(
    () => makeDailySeries(data?.revenueByDate || [], range),
    [data, range]
  );
  const dashboard = data?.dashboard;
  const margin = data?.margin;
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

  return (
    <div className="manager-dashboard manager-dashboard--performance">
      <main className="manager-content performance-dashboard">
        <div className="performance-heading">
          <div>
            <p className="performance-eyebrow">TECHPOINT · BUSINESS OVERVIEW</p>
            <h1>Sales performance</h1>
            <p>Track revenue, payment mix, product demand, and till activity.</p>
          </div>
          <label className="performance-range-control">
            <span>Reporting period</span>
            <select value={range} onChange={(event) => setRange(Number(event.target.value))}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="performance-error" role="alert">Dashboard unavailable: {error}</p>}

        <section className="performance-kpis" aria-label="Sales summary">
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
      </main>
    </div>
  );
}

export default ManagerDashboard;
