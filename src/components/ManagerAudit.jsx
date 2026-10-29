import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { formatPrice, toKsh } from "../utils/formatPrice";
import "../styles/manager-actions.css";

const AUDIT_LABELS = {
  opening_cash: "Opening float",
  expected_cash: "Expected till cash",
  amount_tendered: "Cash received",
  change_given: "Change given",
  total_amount: "Sale total",
  cash_variance: "Cash difference",
  item_count: "Number of items",
  cashier_id: "Cashier",
  user_id: "User",
  actor_id: "User ID",
  shift_id: "Shift ID",
  delta: "Stock quantity change",
  quantity_change: "Stock quantity change",
};

const AUDIT_CATEGORIES = [
  { id: "all", label: "All activity" },
  { id: "inventory", label: "Inventory" },
  { id: "other", label: "Other" },
  { id: "products", label: "Products" },
  { id: "purchasing", label: "Purchasing" },
  { id: "returns", label: "Returns" },
  { id: "sales", label: "Sales" },
  { id: "shifts", label: "Shifts & cash" },
];

function getAuditCategory(event) {
  const action = String(event.action || "").toLowerCase();
  const entity = String(event.entity_type || "").toLowerCase();

  if (action.includes("return") || entity.includes("return")) return "returns";
  if (action.startsWith("sale.") || entity === "sale") return "sales";
  if (action.includes("supplier") || action.includes("purchase") || entity.includes("supplier") || entity.includes("purchase")) return "purchasing";
  if (action.startsWith("shift.") || action.includes("cash") || entity.includes("shift") || entity.includes("cash")) return "shifts";
  if (action.startsWith("product.") || entity === "product") return "products";
  if (action.startsWith("stock.") || action.startsWith("restock.") || entity === "stock" || entity === "restock") return "inventory";
  return "other";
}

function formatAuditLabel(key) {
  return (
    AUDIT_LABELS[key]
    || key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatAuditOption(value) {
  return String(value)
    .replaceAll(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatAuditValue(value, key = "", userNames = {}) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "cashier_id" || key === "user_id") {
    return userNames[value] || `User ${value}`;
  }
  if (key === "delta" || key === "quantity_change") {
    const quantity = Number(value);
    if (Number.isFinite(quantity) && quantity !== 0) {
      return quantity > 0
        ? `${quantity} unit${quantity === 1 ? "" : "s"} added to stock`
        : `${Math.abs(quantity)} unit${quantity === -1 ? "" : "s"} removed from stock`;
    }
  }
  if (key === "cash_variance") {
    const difference = Number(value);
    if (Number.isFinite(difference)) {
      const amountKsh = toKsh(Math.abs(difference));
      if (!amountKsh) return "Balanced";
      const amount = formatPrice(Math.abs(difference));
      return difference > 0 ? `Over by ${amount}` : `Short by ${amount}`;
    }
  }
  const isMoneyValue = typeof value === "number" || typeof value === "string";
  if (
    isMoneyValue
    && /(price|cost|amount|cash|tendered|change|given)$/i.test(key)
    && Number.isFinite(Number(value))
  ) {
    return formatPrice(value);
  }
  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatAuditValue(item, "", userNames)).join("; ")
      : "None";
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => (
        `${formatAuditLabel(nestedKey)}: ${formatAuditValue(nestedValue, nestedKey, userNames)}`
      ))
      .join(" · ");
  }
  return String(value);
}

function ManagerAudit() {
  const [events, setEvents] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeActor, setActiveActor] = useState("");
  const [activeAction, setActiveAction] = useState("");
  const [activeEntityType, setActiveEntityType] = useState("");

  useEffect(() => {
    apiFetch("/audit?limit=200")
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const categoryCounts = useMemo(() => events.reduce((counts, event) => {
    const category = getAuditCategory(event);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, { all: events.length }), [events]);

  const actorNames = useMemo(() => [...new Set(events
    .map((event) => String(event.actor_name || "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)), [events]);
  const auditActions = useMemo(() => [...new Set(events
    .map((event) => String(event.action || "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)), [events]);
  const entityTypes = useMemo(() => [...new Set(events
    .map((event) => String(event.entity_type || "").trim())
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right)), [events]);

  const filteredEvents = useMemo(() => events.filter((event) => (
    (activeCategory === "all" || getAuditCategory(event) === activeCategory)
    && (!activeActor || event.actor_name === activeActor)
    && (!activeAction || event.action === activeAction)
    && (!activeEntityType || event.entity_type === activeEntityType)
  )), [events, activeCategory, activeActor, activeAction, activeEntityType]);

  useEffect(() => {
    apiFetch("/auth/users")
      .then((data) => {
        const names = {};
        (data.users || []).forEach((user) => {
          names[user.id] = user.name || user.username;
        });
        setUserNames(names);
      })
      .catch(() => setUserNames({}));
  }, []);

  return (
    <main className="manager-content">
      <div className="manager-page-heading">
        <div>
          <p className="manager-page-kicker">ACCOUNTABILITY</p>
          <h2>Audit history</h2>
          <p>Recent stock, sales, pricing, purchasing, returns, and till actions.</p>
        </div>
        <div className="inventory-summary"><strong>{events.length}</strong><span>Recent events</span></div>
      </div>
      <section className="manager-section">
        <div className="audit-filter-grid">
          <label className="manager-filter audit-filter-control" htmlFor="audit-category-filter">
            Event category
            <select
              id="audit-category-filter"
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
            >
              {AUDIT_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label} ({categoryCounts[category.id] || 0})
                </option>
              ))}
            </select>
          </label>
          <label className="manager-filter audit-filter-control" htmlFor="audit-actor-filter">
            Performed by
            <select id="audit-actor-filter" value={activeActor} onChange={(event) => setActiveActor(event.target.value)}>
              <option value="">All names</option>
              {actorNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="manager-filter audit-filter-control" htmlFor="audit-action-filter">
            Action
            <select id="audit-action-filter" value={activeAction} onChange={(event) => setActiveAction(event.target.value)}>
              <option value="">All actions</option>
              {auditActions.map((action) => <option key={action} value={action}>{formatAuditOption(action)}</option>)}
            </select>
          </label>
          <label className="manager-filter audit-filter-control" htmlFor="audit-entity-filter">
            Record type
            <select id="audit-entity-filter" value={activeEntityType} onChange={(event) => setActiveEntityType(event.target.value)}>
              <option value="">All record types</option>
              {entityTypes.map((entityType) => <option key={entityType} value={entityType}>{formatAuditOption(entityType)}</option>)}
            </select>
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : events.length === 0 ? <div className="empty-inventory"><p>No audit activity yet.</p></div> : (
          <div className="audit-event-list">
            {filteredEvents.length === 0 ? <div className="empty-inventory"><p>No audit events match the selected filters.</p></div> : filteredEvents.map((event) => {
              const category = AUDIT_CATEGORIES.find((entry) => entry.id === getAuditCategory(event));
              return (
              <article className="audit-event" key={event.id}>
                <div className="audit-event-heading">
                  <div><strong>{event.action.replaceAll(".", " ")}</strong><span>{event.entity_type} #{event.entity_id ?? "—"}</span></div>
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                </div>
                <span className={`audit-event-category audit-event-category--${category.id}`}>{category.label}</span>
                <p>By {event.actor_name}</p>
                <details>
                  <summary>Details</summary>
                  {event.details && Object.keys(event.details).length > 0 ? (
                    <dl className="audit-event-details">
                      {Object.entries(event.details).map(([key, value]) => (
                        <div key={key}>
                          <dt>{formatAuditLabel(key)}</dt>
                          <dd>{formatAuditValue(value, key, userNames)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="audit-event-no-details">No additional details.</p>
                  )}
                </details>
              </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerAudit;
