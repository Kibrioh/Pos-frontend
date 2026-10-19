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
  const width = 800;
  const height = 280;
  const left = 82;
  const right = 780;
  const top = 24;
  const bottom = 222;
  const maxRevenue = Math.max(...series.map((point) => point.revenue), 1);
  const points = series.map((point, index) => {
    const x = left + (index * (right - left)) / Math.max(series.length - 1, 1);
    const y = bottom - (point.revenue / maxRevenue) * (bottom - top);
    return { ...point, x, y };
  });
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const areaPath = `${linePath} L${right},${bottom} L${left},${bottom} Z`;
  const labelIndexes = new Set([
    0,
    Math.floor((series.length - 1) / 2),
    series.length - 1,
  ]);

  return (
    <div className="dashboard-chart-scroll">
      <svg
        className="dashboard-revenue-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily net revenue for the selected period"
      >
        <defs>
          <linearGradient id="revenue-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d45c3c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d45c3c" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((step) => {
          const y = top + ((bottom - top) * step) / 4;
          const value = maxRevenue * (1 - step / 4);
          return (
            <g key={step}>
              <line x1={left} x2={right} y1={y} y2={y} className="chart-gridline" />
              <text x={left - 12} y={y + 4} textAnchor="end" className="chart-axis-label">
                {compactKsh(value)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#revenue-area)" />
        <path d={linePath} className="dashboard-revenue-line" />

        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="3.2" className="dashboard-revenue-point">
            <title>{`${point.label}: ${formatKsh(point.revenue)}`}</title>
          </circle>
        ))}

        {points.map((point, index) => labelIndexes.has(index) && (
          <text key={point.date} x={point.x} y={height - 18} textAnchor="middle" className="chart-axis-label">
            {point.label}
          </text>
        ))}
      </svg>
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
      apiFetch(`/reports/best-selling-products?${query}`),
      apiFetch(`/reports/sales-by-cashier?${query}`),
    ])
      .then(([dashboard, margin, revenueByDate, bestSellers, salesByCashier]) => {
        if (!active) return;
        setData({
          dashboard,
          margin,
          revenueByDate: revenueByDate.results || [],
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
  const bestSellers = (data?.bestSellers || []).slice(0, 5);
  const maxQuantity = Math.max(...bestSellers.map((product) => Number(product.quantity_sold)), 1);

  return (
    <div className="manager-dashboard">
      <main className="manager-content dashboard-content">
        <div className="dashboard-heading">
          <div>
            <p className="dashboard-eyebrow">TECHPOINT · BUSINESS OVERVIEW</p>
            <h1>Dashboard</h1>
            <p className="dashboard-subtitle">Sales performance and stock health in one place.</p>
          </div>
          <label className="dashboard-range-control">
            <span>Reporting period</span>
            <select value={range} onChange={(event) => setRange(Number(event.target.value))}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="dashboard-error" role="alert">Dashboard unavailable: {error}</p>}

        <section className="dashboard-metrics" aria-label="Sales summary">
          <article className="dashboard-metric dashboard-metric--accent">
            <span>Net revenue</span>
            <strong>{loading ? "…" : formatKsh(revenueKsh)}</strong>
            <small>After recorded refunds</small>
          </article>
          <article className="dashboard-metric">
            <span>Completed sales</span>
            <strong>{loading ? "…" : transactionCount.toLocaleString("en-KE")}</strong>
            <small>In the selected period</small>
          </article>
          <article className="dashboard-metric">
            <span>Average sale</span>
            <strong>{loading ? "…" : formatKsh(avgSaleKsh)}</strong>
            <small>Net revenue per sale</small>
          </article>
          <article className="dashboard-metric">
            <span>Gross margin</span>
            <strong>{loading ? "…" : formatKsh(toKsh(margin?.gross_margin))}</strong>
            <small>
              {margin?.items_without_cost
                ? `${margin.items_without_cost} units missing cost data`
                : "Based on recorded product costs"}
            </small>
          </article>
          <article className="dashboard-metric">
            <span>Active products</span>
            <strong>{loading ? "…" : Number(dashboard?.product_count || 0).toLocaleString("en-KE")}</strong>
            <small>Available in the store catalogue</small>
          </article>
          <article className="dashboard-metric">
            <span>Registered cashiers</span>
            <strong>{loading ? "…" : Number(dashboard?.cashier_count || 0).toLocaleString("en-KE")}</strong>
            <small>Cashier accounts</small>
          </article>
        </section>

        <section className="dashboard-panel dashboard-revenue-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Revenue trend</h2>
              <p>Daily net revenue in KSh</p>
            </div>
            <span className="dashboard-legend"><i aria-hidden="true" /> Revenue</span>
          </div>
          {loading ? (
            <p className="dashboard-empty">Loading revenue history…</p>
          ) : !data?.revenueByDate?.length ? (
            <p className="dashboard-empty">No completed sales to chart in this period.</p>
          ) : (
            <RevenueChart series={series} />
          )}
        </section>

        <div className="dashboard-lower-grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>Best-selling products</h2>
                <p>Ranked by units sold, less returned units</p>
              </div>
            </div>
            {loading ? (
              <p className="dashboard-empty">Loading product sales…</p>
            ) : bestSellers.length === 0 ? (
              <p className="dashboard-empty">No product sales in this period.</p>
            ) : (
              <ol className="dashboard-product-rankings">
                {bestSellers.map((product, index) => {
                  const quantity = Number(product.quantity_sold) || 0;
                  return (
                    <li key={product.product_id}>
                      <div className="dashboard-product-rank-row">
                        <span className="dashboard-rank-number">{index + 1}</span>
                        <strong title={product.product_title}>{product.product_title}</strong>
                        <span>{quantity} sold</span>
                      </div>
                      <div className="dashboard-bar-track" aria-label={`${quantity} units sold`}>
                        <span style={{ width: `${Math.max((quantity / maxQuantity) * 100, 2)}%` }} />
                      </div>
                      <small>{formatKsh(toKsh(product.total_revenue))} revenue</small>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="dashboard-panel dashboard-stock-panel">
            <div className="dashboard-panel-heading">
              <div>
                <h2>Low-stock watch</h2>
                <p>{dashboard?.low_stock_count ?? 0} products need attention</p>
              </div>
              <NavLink to="/manager/products">Manage inventory</NavLink>
            </div>
            {loading ? (
              <p className="dashboard-empty">Loading stock levels…</p>
            ) : !dashboard?.low_stock_products?.length ? (
              <p className="dashboard-empty">All active products are above their low-stock thresholds.</p>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-table">
                  <thead><tr><th>Product</th><th>In stock</th><th>Threshold</th><th>Status</th></tr></thead>
                  <tbody>
                    {dashboard.low_stock_products.slice(0, 7).map((product) => (
                      <tr key={product.id}>
                        <th scope="row">{product.title}</th>
                        <td>{product.stock_quantity}</td>
                        <td>{product.low_stock_threshold}</td>
                        <td><span className="stock-alert">Restock</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="dashboard-panel">
          <div className="dashboard-panel-heading">
            <div>
              <h2>Sales by cashier</h2>
              <p>Net revenue and completed transactions</p>
            </div>
          </div>
          {loading ? (
            <p className="dashboard-empty">Loading cashier performance…</p>
          ) : !data?.salesByCashier?.length ? (
            <p className="dashboard-empty">No cashier sales in this period.</p>
          ) : (
            <div className="dashboard-table-scroll">
              <table className="dashboard-table">
                <thead><tr><th>Cashier</th><th>Transactions</th><th>Average sale</th><th>Net revenue</th></tr></thead>
                <tbody>
                  {data.salesByCashier.map((cashier) => {
                    const count = Number(cashier.transaction_count) || 0;
                    const cashierRevenue = toKsh(cashier.total_revenue);
                    return (
                      <tr key={cashier.user_id}>
                        <th scope="row">{cashier.name || cashier.username}</th>
                        <td>{count}</td>
                        <td>{formatKsh(count ? Math.round(cashierRevenue / count) : 0)}</td>
                        <td><strong>{formatKsh(cashierRevenue)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default ManagerDashboard;
