import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

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
                <details><summary>Details</summary><pre>{JSON.stringify(event.details, null, 2)}</pre></details>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default ManagerAudit;
