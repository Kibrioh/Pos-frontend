import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../api/client";
import { formatKsh, toKsh } from "../utils/formatPrice";

const BUSINESS_TIMEZONE = "Africa/Nairobi";
const RANGE_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

function toNairobiDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDateKey(dateKey, options = { day: "numeric", month: "short" }) {
  return new Intl.DateTimeFormat("en-KE", {
    ...options,
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(value));
}

function compactKsh(value) {
  if (value >= 1_000_000) return `KSh ${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 10_000) return `KSh ${Math.round(value / 1_000)}k`;
  if (value >= 1_000) return `KSh ${(value / 1_000).toFixed(1)}k`;
  return `KSh ${Math.round(value)}`;
}

function makeDailySeries(rows, period) {
  if (!period?.start_date || !period?.end_date) return [];
  const totalsByDate = new Map(
    rows.map((row) => [row.date, toKsh(row.net_sales)])
  );
  const days = Math.max(
    1,
    Math.round((new Date(`${period.end_date}T12:00:00Z`) - new Date(`${period.start_date}T12:00:00Z`)) / 86_400_000) + 1
  );

  return Array.from({ length: days }, (_, index) => {
    const key = shiftDateKey(period.start_date, index);
    return {
      date: key,
      label: formatDateKey(key),
      revenue: totalsByDate.get(key) || 0,
    };
  });
}

function changeInfo(current, previous, currency = false) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) {
    if (currentValue === 0) return { label: "No change", tone: "neutral" };
    return { label: "New activity", tone: "positive" };
  }

  const difference = currentValue - previousValue;
  const percentage = (difference / Math.abs(previousValue)) * 100;
  const sign = difference > 0 ? "+" : "";
  const amount = currency ? ` · ${sign}${formatKsh(toKsh(difference))}` : "";
  return {
    label: `${sign}${percentage.toFixed(1)}%${amount} vs prior period`,
    tone: difference > 0 ? "positive" : difference < 0 ? "negative" : "neutral",
  };
}

function RevenueChart({ series }) {
  const width = Math.max(680, series.length * 18);
  const height = 210;
  const left = 76;
  const right = width - 18;
  const top = 16;
  const bottom = height - 34;
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
        aria-label="Daily net revenue in Nairobi time for the selected period"
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
                <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="performance-axis-label">
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
  const totalRevenue = rows.reduce((sum, row) => sum + Math.max(toKsh(row.net_sales), 0), 0);
  const totalTransactions = rows.reduce((sum, row) => sum + Number(row.transactions || 0), 0);
  let accumulated = 0;
  const slices = rows.map((row) => {
    const value = Math.max(toKsh(row.net_sales), 0);
    const start = totalRevenue ? (accumulated / totalRevenue) * 100 : 0;
    accumulated += value;
    const end = totalRevenue ? (accumulated / totalRevenue) * 100 : 0;
    return {
      ...row,
      color: PAYMENT_COLORS[row.payment_method] || "#8295b4",
      start,
      end,
      share: totalRevenue ? (value / totalRevenue) * 100 : 0,
    };
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
        {slices.map((row) => (
          <div className="performance-payment-row" key={row.payment_method}>
            <span className="performance-payment-name">
              <i style={{ background: row.color }} aria-hidden="true" />
              {paymentMethodLabel(row.payment_method)}
            </span>
            <strong>{formatKsh(toKsh(row.net_sales))}</strong>
            <small>{row.share.toFixed(1)}% of net sales · {Number(row.transactions || 0).toLocaleString("en-KE")} sales</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, detail, change, primary = false }) {
  return (
    <article className={`performance-kpi${primary ? " performance-kpi--primary" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
      {change && <small className={`performance-change performance-change--${change.tone}`}>{change.label}</small>}
    </article>
  );
}

function ActivityBars({ rows, label, isHour = false }) {
  const maximum = Math.max(...rows.map((row) => toKsh(row.net_sales)), 0);
  if (maximum <= 0) return <p className="performance-empty performance-empty--compact">No sales recorded in this period.</p>;

  return (
    <div className={`performance-activity-bars${isHour ? " performance-activity-bars--hours" : ""}`}>
      {rows.map((row) => {
        const value = toKsh(row.net_sales);
        const labelText = isHour
          ? row.hour % 3 === 0 ? `${String(row.hour).padStart(2, "0")}:00` : ""
          : row.label.slice(0, 3);
        return (
          <div className="performance-activity-column" key={isHour ? row.hour : row.weekday}>
            <div className="performance-activity-track" title={`${isHour ? `${String(row.hour).padStart(2, "0")}:00` : row.label}: ${formatKsh(value)} · ${row.transactions} sales`}>
              <span style={{ height: `${Math.max((value / maximum) * 100, 2)}%` }} />
            </div>
            <small>{labelText}</small>
          </div>
        );
      })}
      <span className="performance-activity-caption">{label}</span>
    </div>
  );
}

function BestSellingProductsChart({ rows }) {
  const products = rows.slice(0, 8);
  const maximum = Math.max(...products.map((product) => Number(product.units_sold || 0)), 1);

  return (
    <div className="performance-horizontal-bars" role="img" aria-label="Best-selling products by units sold">
      {products.map((product) => {
        const units = Number(product.units_sold || 0);
        return (
          <div className="performance-horizontal-bar-row" key={product.product_id}>
            <span className="performance-horizontal-bar-label" title={product.product_title}>{product.product_title}</span>
            <div className="performance-horizontal-bar-track" aria-hidden="true">
              <span style={{ width: `${Math.max((units / maximum) * 100, 2)}%` }} />
            </div>
            <strong>{units.toLocaleString("en-KE")}</strong>
          </div>
        );
      })}
      <span className="performance-chart-caption">Units sold after returns</span>
    </div>
  );
}

function CategoryProfitChart({ rows }) {
  const categories = rows.slice(0, 8);
  const maximum = Math.max(...categories.map((category) => Math.max(toKsh(category.gross_profit), 0)), 1);

  return (
    <div className="performance-vertical-chart" role="img" aria-label="Gross profit by product category">
      <div className="performance-vertical-bars">
        {categories.map((category) => {
          const profit = Math.max(toKsh(category.gross_profit), 0);
          const hasCost = Number(category.cost_coverage_rate || 0) > 0;
          return (
            <div className="performance-vertical-bar-column" key={category.category}>
              <strong title={hasCost ? formatKsh(profit) : "No recorded item costs"}>{hasCost ? compactKsh(profit) : "—"}</strong>
              <div className="performance-vertical-bar-track" aria-hidden="true">
                <span style={{ height: `${hasCost ? Math.max((profit / maximum) * 100, 2) : 0}%` }} />
              </div>
              <span title={category.category}>{category.category}</span>
            </div>
          );
        })}
      </div>
      <span className="performance-chart-caption">Gross profit · KSh</span>
    </div>
  );
}

function ManagerDashboard() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState(null);
  const [loadedRange, setLoadedRange] = useState(null);
  const [error, setError] = useState("");
  const loading = loadedRange !== range;

  useEffect(() => {
    let active = true;
    const endDate = toNairobiDateKey(new Date());
    const startDate = shiftDateKey(endDate, -(range - 1));
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    }).toString();

    apiFetch(`/reports/manager-dashboard?${query}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((requestError) => {
        if (!active) return;
        setData(null);
        setError(requestError.message || "Could not load dashboard data.");
      })
      .finally(() => {
        if (active) setLoadedRange(range);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const series = useMemo(
    () => makeDailySeries(data?.daily_sales || [], data?.period),
    [data]
  );
  const current = data?.current;
  const previous = data?.previous;
  const inventory = data?.inventory;
  const shifts = data?.shifts;
  const bestSellers = data?.best_sellers || [];
  const profitByCategory = data?.profit_by_category || [];
  const profitProducts = data?.profit_products || [];
  const cashierPerformance = data?.cashier_performance || [];
  const hourlySales = data?.hourly_sales || [];
  const weekdaySales = data?.weekday_sales || [];
  const currentHasSales = Number(current?.transaction_count || 0) > 0;
  const peakHour = hourlySales.reduce(
    (peak, row) => Number(row.net_sales) > Number(peak?.net_sales || 0) ? row : peak,
    null
  );
  const peakWeekday = weekdaySales.reduce(
    (peak, row) => Number(row.net_sales) > Number(peak?.net_sales || 0) ? row : peak,
    null
  );
  const periodLabel = data?.period
    ? `${formatDateKey(data.period.start_date, { day: "numeric", month: "short", year: "numeric" })} – ${formatDateKey(data.period.end_date, { day: "numeric", month: "short", year: "numeric" })}`
    : "";
  const comparisonLabel = data?.period
    ? `${formatDateKey(data.period.previous_start_date)} – ${formatDateKey(data.period.previous_end_date)}`
    : "";

  return (
    <div className="manager-dashboard manager-dashboard--performance">
      <main className="manager-content performance-dashboard">
        <section className="performance-workspace" aria-label="Interactive business dashboard">
          <div className="performance-heading">
            <div>
              <p className="performance-eyebrow">TECHPOINT · BUSINESS OVERVIEW</p>
              <h1>Sales performance</h1>
              <p>Sales, margins, stock, and till health in one view.</p>
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

          {periodLabel && (
            <p className="performance-period-caption">
              {periodLabel} · compare with {comparisonLabel} · Nairobi time · today is partial
            </p>
          )}
          {error && <p className="performance-error" role="alert">Dashboard unavailable: {error}</p>}

          <section className="performance-kpis" aria-label="Period sales summary">
            <KpiCard
              label="Gross sales"
              value={loading ? "…" : formatKsh(toKsh(current?.gross_sales))}
              detail="Before refunds"
              change={current && previous ? changeInfo(current.gross_sales, previous.gross_sales, true) : null}
            />
            <KpiCard
              label="Net sales"
              value={loading ? "…" : formatKsh(toKsh(current?.net_sales))}
              detail={loading ? "After recorded refunds" : `${formatKsh(toKsh(current?.refund_total))} refunded · ${Number(current?.refund_rate || 0).toFixed(1)}%`}
              change={current && previous ? changeInfo(current.net_sales, previous.net_sales, true) : null}
              primary
            />
            <KpiCard
              label="Transactions"
              value={loading ? "…" : Number(current?.transaction_count || 0).toLocaleString("en-KE")}
              detail="Completed sales"
              change={current && previous ? changeInfo(current.transaction_count, previous.transaction_count) : null}
            />
            <KpiCard
              label="Gross profit"
              value={loading ? "…" : Number(current?.costed_units || 0) > 0 ? formatKsh(toKsh(current?.gross_profit)) : "—"}
              detail={loading
                ? "Loading cost coverage…"
                : Number(current?.costed_units || 0) === 0
                  ? "No item costs recorded"
                  : `${current.gross_margin_rate == null ? "—" : `${Number(current.gross_margin_rate).toFixed(1)}% margin`} · costs for ${Number(current.cost_coverage_rate).toFixed(1)}% of units`}
              change={current && previous && Number(current.costed_units || 0) > 0 ? changeInfo(current.gross_profit, previous.gross_profit, true) : null}
            />
            <KpiCard
              label="Average sale"
              value={loading ? "…" : formatKsh(toKsh(current?.average_sale))}
              detail={loading ? "Net sales per transaction" : `${Number(current?.average_items_per_transaction || 0).toFixed(1)} net items per sale`}
              change={current && previous ? changeInfo(current.average_sale, previous.average_sale, true) : null}
            />
          </section>

          <section className="performance-status-section" aria-label="Current store status">
            <div className="performance-section-heading">
              <div>
                <h2>Current store status</h2>
                <p>Live inventory and till counts · not limited to the reporting period</p>
              </div>
            </div>
            <div className="performance-status-grid">
              <div><span>Active products</span><strong>{loading ? "…" : Number(inventory?.active_product_count || 0).toLocaleString("en-KE")}</strong></div>
              <div><span>Cashiers</span><strong>{loading ? "…" : Number(cashierPerformance.length || 0).toLocaleString("en-KE")}</strong></div>
              <div><span>Low stock</span><strong className={inventory?.low_stock_count ? "has-alert" : ""}>{loading ? "…" : Number(inventory?.low_stock_count || 0).toLocaleString("en-KE")}</strong></div>
              <div><span>Out of stock</span><strong className={inventory?.out_of_stock_count ? "has-alert" : ""}>{loading ? "…" : Number(inventory?.out_of_stock_count || 0).toLocaleString("en-KE")}</strong></div>
              <div><span>Est. inventory at cost</span><strong>{loading ? "…" : formatKsh(toKsh(inventory?.stock_value_at_cost))}</strong></div>
              <div><span>Open tills</span><strong>{loading ? "…" : Number(shifts?.open_shift_count || 0).toLocaleString("en-KE")}</strong></div>
              <div><span>Open over 12h</span><strong className={shifts?.stale_open_shift_count ? "has-alert" : ""}>{loading ? "…" : Number(shifts?.stale_open_shift_count || 0).toLocaleString("en-KE")}</strong></div>
            </div>
          </section>

          <div className="performance-grid">
            <section className="performance-panel performance-panel--revenue">
              <div className="performance-panel-heading">
                <div><h2>Daily net sales</h2><p>KSh by Nairobi trading day</p></div>
              </div>
              {loading ? <p className="performance-empty">Loading revenue history…</p>
                : !series.length || !currentHasSales ? <p className="performance-empty">No completed sales in this period.</p>
                  : <RevenueChart series={series} />}
            </section>

            <section className="performance-panel performance-panel--activity">
              <div className="performance-panel-heading">
                <div><h2>When sales happen</h2><p>Net sales by Nairobi weekday and hour</p></div>
              </div>
              {loading ? <p className="performance-empty">Loading sales timing…</p>
                : !currentHasSales ? <p className="performance-empty">No sales to compare in this period.</p>
                  : (
                    <>
                      <div className="performance-peak-stats">
                        <div><span>Strongest weekday</span><strong>{peakWeekday?.label || "—"}</strong></div>
                        <div><span>Strongest hour</span><strong>{peakHour ? `${String(peakHour.hour).padStart(2, "0")}:00–${String((peakHour.hour + 1) % 24).padStart(2, "0")}:00` : "—"}</strong></div>
                      </div>
                      <h3 className="performance-chart-subtitle">By weekday</h3>
                      <ActivityBars rows={weekdaySales} label="Net sales" />
                      <h3 className="performance-chart-subtitle">By hour · 24-hour clock</h3>
                      <ActivityBars rows={hourlySales} label="Net sales" isHour />
                    </>
                  )}
            </section>

            <section className="performance-panel performance-panel--payments">
              <div className="performance-panel-heading">
                <div><h2>Payment methods</h2><p>Net sales share and transaction count</p></div>
              </div>
              {loading ? <p className="performance-empty">Loading payment summary…</p>
                : !data?.payment_methods?.length ? <p className="performance-empty">No payments in this period.</p>
                  : <PaymentMethodChart rows={data.payment_methods} />}
            </section>

            <section className="performance-panel performance-panel--products">
              <div className="performance-panel-heading">
                <div><h2>Best-selling products</h2><p>Units kept after returns, with profit contribution</p></div>
                <NavLink to="/manager/products">Inventory <span aria-hidden="true">→</span></NavLink>
              </div>
              {loading ? <p className="performance-empty">Loading product sales…</p>
                : !bestSellers.length ? <p className="performance-empty">No product sales in this period.</p>
                  : <BestSellingProductsChart rows={bestSellers} />}
              {!loading && profitProducts.length > 0 && (
                <>
                  <h3 className="performance-chart-subtitle">Highest gross profit contribution</h3>
                  <div className="performance-table-scroll">
                    <table className="performance-table">
                      <thead><tr><th>Product</th><th>Gross profit</th><th>Margin</th><th>Cost coverage</th></tr></thead>
                      <tbody>{profitProducts.slice(0, 5).map((product) => (
                        <tr key={product.product_id}>
                          <th scope="row">{product.product_title}</th>
                          <td>{product.cost_coverage_rate == null ? "—" : formatKsh(toKsh(product.gross_profit))}</td>
                          <td>{product.margin_rate == null ? "—" : `${Number(product.margin_rate).toFixed(1)}%`}</td>
                          <td>{product.cost_coverage_rate == null ? "—" : `${Number(product.cost_coverage_rate).toFixed(0)}%`}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </>
              )}
              {!loading && data?.current?.items_without_cost > 0 && (
                <p className="performance-data-note">Profit omits {Number(data.current.items_without_cost).toLocaleString("en-KE")} sold units without a recorded cost.</p>
              )}
            </section>

            <section className="performance-panel performance-panel--categories">
              <div className="performance-panel-heading">
                <div><h2>Profit by category</h2><p>Net revenue and margin from recorded item costs</p></div>
              </div>
              {loading ? <p className="performance-empty">Loading category margin…</p>
                : !profitByCategory.length ? <p className="performance-empty">No category sales in this period.</p>
                  : <CategoryProfitChart rows={profitByCategory} />}
              {!loading && current?.cost_coverage_rate != null && Number(current.costed_units || 0) > 0 && (
                <p className="performance-data-note">Cost coverage: {Number(current.cost_coverage_rate).toFixed(1)}% of sold units.</p>
              )}
            </section>

            <section className="performance-panel performance-panel--cashiers">
              <div className="performance-panel-heading">
                <div><h2>Cashier performance</h2><p>Revenue, returns, and sales per worked hour</p></div>
                <NavLink to="/manager/cashiers">Manage cashiers <span aria-hidden="true">→</span></NavLink>
              </div>
              {loading ? <p className="performance-empty">Loading cashier performance…</p>
                : !cashierPerformance.length ? <p className="performance-empty">No cashiers registered.</p>
                  : (
                    <div className="performance-table-scroll">
                      <table className="performance-table performance-table--cashiers">
                        <thead><tr><th>Cashier</th><th>Net sales</th><th>Sales</th><th>Avg sale</th><th>Refunds</th><th>Sales / hour</th></tr></thead>
                        <tbody>{cashierPerformance.map((cashier) => (
                          <tr key={cashier.user_id}>
                            <th scope="row">{cashier.name || cashier.username}</th>
                            <td>{formatKsh(toKsh(cashier.net_sales))}</td>
                            <td>{Number(cashier.transaction_count || 0).toLocaleString("en-KE")}</td>
                            <td>{formatKsh(toKsh(cashier.average_sale))}</td>
                            <td>{cashier.refund_rate == null ? "—" : `${formatKsh(toKsh(cashier.refund_total))} · ${Number(cashier.refund_rate).toFixed(1)}%`}</td>
                            <td title={`${Number(cashier.hours_worked || 0).toFixed(1)} shift hours`}>{cashier.sales_per_hour == null ? "—" : formatKsh(toKsh(cashier.sales_per_hour))}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
            </section>

            <section className="performance-panel performance-panel--stock">
              <div className="performance-panel-heading">
                <div><h2>Inventory health</h2><p>Current stock valuation and 30-day demand</p></div>
                <NavLink to="/manager/products">Manage inventory <span aria-hidden="true">→</span></NavLink>
              </div>
              <div className="performance-insight-stats">
                <div><span>Est. retail value</span><strong>{loading ? "…" : formatKsh(toKsh(inventory?.stock_value_at_retail))}</strong></div>
                <div><span>Slow-moving products</span><strong>{loading ? "…" : Number(inventory?.slow_moving_count || 0).toLocaleString("en-KE")}</strong><small>{formatKsh(toKsh(inventory?.slow_moving_stock_value_at_cost))} at cost</small></div>
                <div><span>Open purchase orders</span><strong>{loading ? "…" : Number(inventory?.open_purchase_order_count || 0).toLocaleString("en-KE")}</strong><small>{Number(inventory?.pending_purchase_order_units || 0).toLocaleString("en-KE")} units outstanding · {formatKsh(toKsh(inventory?.pending_purchase_order_value))}</small></div>
                <div><span>Costed stock</span><strong>{loading ? "…" : inventory?.stock_cost_coverage_rate == null ? "—" : `${Number(inventory.stock_cost_coverage_rate).toFixed(1)}%`}</strong><small>{Number(inventory?.stock_units_without_cost || 0).toLocaleString("en-KE")} units without cost</small></div>
              </div>
              {loading ? <p className="performance-empty performance-empty--compact">Loading stock levels…</p>
                : !inventory?.low_stock_products?.length ? <p className="performance-empty performance-empty--compact">All active products are above their low-stock thresholds.</p>
                  : (
                    <div className="performance-table-scroll">
                      <table className="performance-table">
                        <thead><tr><th>Product</th><th>In stock</th><th>30-day sales</th><th>Days cover</th><th>Status</th></tr></thead>
                        <tbody>{inventory.low_stock_products.map((product) => (
                          <tr key={product.product_id}>
                            <th scope="row">{product.product_title}</th>
                            <td>{product.stock_quantity} / {product.low_stock_threshold} min</td>
                            <td>{product.units_sold_30d}</td>
                            <td>{product.days_cover == null ? "No recent sales" : `${Number(product.days_cover).toFixed(1)} days`}</td>
                            <td><span className={`performance-stock-alert${product.stock_quantity === 0 ? " is-out" : ""}`}>{product.stock_quantity === 0 ? "Out of stock" : "Reorder"}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
            </section>

            <section className="performance-panel performance-panel--tills">
              <div className="performance-panel-heading">
                <div><h2>Till control</h2><p>Open tills and cash variances in this period</p></div>
                <NavLink to="/manager/shifts">Review shifts <span aria-hidden="true">→</span></NavLink>
              </div>
              <div className="performance-insight-stats performance-insight-stats--three">
                <div><span>Expected cash in open tills</span><strong>{loading ? "…" : formatKsh(toKsh(shifts?.open_expected_cash))}</strong></div>
                <div><span>Shortages at close</span><strong className={Number(shifts?.cash_shortage_total || 0) > 0 ? "has-alert" : ""}>{loading ? "…" : formatKsh(toKsh(shifts?.cash_shortage_total))}</strong></div>
                <div><span>Overages at close</span><strong>{loading ? "…" : formatKsh(toKsh(shifts?.cash_overage_total))}</strong></div>
              </div>
              <h3 className="performance-chart-subtitle">Open shifts</h3>
              {loading ? <p className="performance-empty performance-empty--compact">Loading open tills…</p>
                : !shifts?.open_shifts?.length ? <p className="performance-empty performance-empty--compact">No open tills.</p>
                  : (
                    <div className="performance-shift-list">
                      {shifts.open_shifts.slice(0, 6).map((shift) => (
                        <div className="performance-shift-row" key={shift.shift_id}>
                          <div><strong>{shift.cashier}</strong><small>Opened {formatDateTime(shift.opened_at)}</small></div>
                          <span>{formatKsh(toKsh(shift.expected_cash))}</span>
                          {shift.is_stale && <em>Over 12h</em>}
                        </div>
                      ))}
                    </div>
                  )}
              <h3 className="performance-chart-subtitle">Recent closes</h3>
              {loading ? null : !shifts?.recent_closed_shifts?.length
                ? <p className="performance-empty performance-empty--compact">No shifts closed in this period.</p>
                : (
                  <div className="performance-table-scroll">
                    <table className="performance-table">
                      <thead><tr><th>Cashier</th><th>Closed</th><th>Variance</th></tr></thead>
                      <tbody>{shifts.recent_closed_shifts.map((shift) => {
                        const variance = Number(shift.cash_variance || 0);
                        return (
                          <tr key={shift.shift_id}>
                            <th scope="row">{shift.cashier}</th>
                            <td>{formatDateTime(shift.closed_at)}</td>
                            <td className={variance < 0 ? "has-alert" : ""}>{variance < 0 ? "Short " : variance > 0 ? "Over " : "Balanced "}{formatKsh(Math.abs(toKsh(variance)))}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ManagerDashboard;
