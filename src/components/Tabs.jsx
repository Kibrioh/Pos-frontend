function Tabs({
  tabs,
  activeTabId,
  onSelect,
  onAdd,
  onRemove,
}) {
  return (
    <section className="pos-tabs">
      <div className="pos-tabs-header">
        <div>
          <p className="section-kicker">
            SALES TABS
          </p>

          <h2>
            Open Sales
          </h2>
        </div>

        <button
          type="button"
          onClick={onAdd}
        >
          + New Tab
        </button>
      </div>

      <div className="pos-tabs-list">
        {tabs.length === 0 ? (
          <p>No open sales.</p>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`pos-tab${
                tab.id === activeTabId
                  ? " is-active"
                  : ""
              }`}
            >
              <button
                type="button"
                className="pos-tab-select"
                onClick={() =>
                  onSelect(tab.id)
                }
              >
                <strong>
                  {tab.name}
                </strong>

                <span>
                  {tab.items.reduce(
                    (sum, item) =>
                      sum +
                      item.quantity,
                    0
                  )}{" "}
                  item(s)
                </span>
              </button>

              {tabs.length > 1 && (
                <button
                  type="button"
                  className="pos-tab-remove"
                  onClick={() =>
                    onRemove(tab.id)
                  }
                  aria-label={`Close ${tab.name}`}
                >
                  ×
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Tabs;
