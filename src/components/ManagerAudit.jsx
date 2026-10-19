import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { formatPrice } from "../utils/formatPrice";

const AUDIT_LABELS = {
  opening_cash: "Opening float",
  expected_cash: "Expected cash",
  tendered: "Cash received",
  change: "Change given",
  total_amount: "Sale total",
  item_count: "Number of items",
  cashier_id: "Cashier ID",
  actor_id: "User ID",
  shift_id: "Shift ID",
};

function formatAuditLabel(key) {
  return (
    AUDIT_LABELS[key]
    || key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatAuditValue(value, key = "") {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const isMoneyValue = typeof value === "number" || typeof value === "string";
  if (
    isMoneyValue
    && /(price|cost|amount|cash|tendered|change)$/i.test(key)
    && Number.isFinite(Number(value))
  ) {
    return formatPrice(value);
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatAuditValue(item)).join("; ") : "None";
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => (
        `${formatAuditLabel(nestedKey)}: ${formatAuditValue(nestedValue, nestedKey)}`
      ))
      .join(" · ");
  }
  return String(value);
}

function ManagerAudit() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/audit?limit=200")
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
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
        {error ? <p className="form-error" role="alert">{error}</p> : events.length === 0 ? <div className="empty-inventory"><p>No audit activity yet.</p></div> : (
          <div className="audit-event-list">
            {events.map((event) => (
              <article className="audit-event" key={event.id}>
                <div className="audit-event-heading">
                  <div><strong>{event.action.replaceAll(".", " ")}</strong><span>{event.entity_type} #{event.entity_id ?? "—"}</span></div>
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                </div>
                <p>By {event.actor_name}</p>
                <details>
                  <summary>Details</summary>
                  {event.details && Object.keys(event.details).length > 0 ? (
                    <dl className="audit-event-details">
                      {Object.entries(event.details).map(([key, value]) => (
                        <div key={key}>
                          <dt>{formatAuditLabel(key)}</dt>
                          <dd>{formatAuditValue(value, key)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="audit-event-no-details">No additional details.</p>
                  )}
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerAudit;
