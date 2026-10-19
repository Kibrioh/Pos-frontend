import "../styles/about.css";

function ArrowIcon({ diagonal = false }) {
  return diagonal ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M5 15 15 5M6 5h9v9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
      <path d="M16 10H4m0 0 5-5m-5 5 5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function About({ onBack }) {
  return (
    <main className="about-page">
      <div className="about-shell">
        <header className="about-topbar">
          <div className="about-brand" aria-label="TechPoint">
            <span className="about-brand-mark" aria-hidden="true">T</span>
            <span className="about-brand-name">TechPoint</span>
          </div>

          <button className="about-back-button" type="button" onClick={onBack}>
            <ArrowIcon />
            <span>Back to shop</span>
          </button>
        </header>

        <section className="about-hero" aria-labelledby="about-title">
          <div className="about-hero-copy">
            <p className="about-eyebrow">
              <span className="about-eyebrow-dot" aria-hidden="true" />
              ABOUT TECHPOINT
            </p>
            <h1 id="about-title">
              The little details that make <span>every sale</span> feel easy.
            </h1>
            <p className="about-lede">
              TechPoint brings product discovery, checkout, and day-to-day store
              operations together in one clear workspace.
            </p>

            <div className="about-capabilities" aria-label="Shop capabilities">
              <span>Find products</span>
              <span>Serve customers</span>
              <span>Stay in control</span>
            </div>
          </div>

          <div className="about-visual" aria-label="Illustration of a completed checkout">
            <div className="about-visual-orbit about-visual-orbit-one" />
            <div className="about-visual-orbit about-visual-orbit-two" />
            <div className="about-checkout-card">
              <div className="about-checkout-heading">
                <div>
                  <span className="about-card-overline">CHECKOUT</span>
                  <strong>Ready for the next customer</strong>
                </div>
                <span className="about-checkout-check" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="m5 10 3.2 3.2L15 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>

              <div className="about-checkout-line">
                <span className="about-product-symbol about-product-symbol-orange" aria-hidden="true">✳</span>
                <span className="about-checkout-product">
                  <strong>Product picked</strong>
                  <small>Added to the basket</small>
                </span>
                <span className="about-product-amount">× 1</span>
              </div>

              <div className="about-checkout-line">
                <span className="about-product-symbol about-product-symbol-green" aria-hidden="true">✓</span>
                <span className="about-checkout-product">
                  <strong>Payment recorded</strong>
                  <small>Receipt is ready</small>
                </span>
                <span className="about-product-amount about-product-amount-done">Done</span>
              </div>

              <div className="about-checkout-footer">
                <span>Simple from first scan to receipt</span>
                <span className="about-receipt-lines" aria-hidden="true"><i /><i /><i /></span>
              </div>
            </div>
            <div className="about-floating-note">
              <span className="about-floating-note-icon" aria-hidden="true">↗</span>
              <span><strong>One smooth flow</strong><small>Built for the counter</small></span>
            </div>
          </div>
        </section>

        <section className="about-workflow" aria-labelledby="about-workflow-title">
          <div className="about-section-heading">
            <div>
              <p className="about-eyebrow">MADE FOR THE WAY SHOPS WORK</p>
              <h2 id="about-workflow-title">A better rhythm for your store.</h2>
            </div>
            <p>Everything has a place, from the first product search to the end-of-shift check.</p>
          </div>

          <div className="about-feature-grid">
            <article className="about-feature-card">
              <span className="about-feature-number">01</span>
              <span className="about-feature-icon about-feature-icon-search" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.3" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </span>
              <h3>Find it fast</h3>
              <p>Search the live catalog, browse by category, or look up an item by barcode.</p>
            </article>

            <article className="about-feature-card">
              <span className="about-feature-number">02</span>
              <span className="about-feature-icon about-feature-icon-basket" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="m5 9 2 10h10l2-10H5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m9 9 3-5 3 5m-3 2v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <h3>Keep checkout clear</h3>
              <p>Adjust the basket, take payment, and give customers a receipt to print or download.</p>
            </article>

            <article className="about-feature-card">
              <span className="about-feature-number">03</span>
              <span className="about-feature-icon about-feature-icon-store" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <h3>Run the store with confidence</h3>
              <p>Keep stock, purchasing, returns, sales, and cashier shifts organized in one place.</p>
            </article>
          </div>
        </section>

        <footer className="about-footer">
          <span className="about-footer-mark" aria-hidden="true">T</span>
          <p>Thoughtful tools for the people behind the counter.</p>
          <button type="button" onClick={onBack}>
            Return to the shop <ArrowIcon diagonal />
          </button>
        </footer>
      </div>
    </main>
  );
}

export default About;
