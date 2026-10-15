# TechPoint POS

A lightweight point-of-sale (POS) web application for a small electronics and
accessories store. Cashiers can browse products, search and filter them, build
a cart, complete a sale, print a receipt, and view order history. Admins can
manage stock, view the stock ledger, run reports, and adjust settings.

**Phase 1** delivers a fully-featured frontend demo. Every POS feature is
present and interactive, with data simulated in the browser via
`localStorage`. Phases 2 and 3 will replace the simulation with a real
backend, database, and authentication.

## What is a POS?

A **Point of Sale (POS)** is the place and moment where a customer pays for
goods, and the software that supports that transaction. A modern POS:

1. Displays products with prices and stock levels
2. Lets the cashier build a cart of items
3. Calculates totals
4. Records a completed sale and reduces stock in real time
5. Produces a receipt for the customer
6. Tracks every transaction for reporting
7. Manages stock — what's in, what's low, what's out
8. Distinguishes roles — cashiers sell, admins manage

Every feature in this project exists to serve one of those eight points.

## Project status

| Area | Status |
|------|--------|
| API integration | Done |
| Product catalogue | Done |
| Search & filtering | Done |
| Cart & sale calculation | Done |
| Sale completion & confirmation | Done |
| Utility suite (shared helpers) | Done |
| Authentication & roles (simulated) | Done |
| Dashboard / home | Done |
| POS tabs (multi-customer) | In progress |
| Receipt printing | In progress |
| Stock management & restock | Done |
| Stock ledger | Done |
| Orders history | Done |
| Reports | Done |
| Settings | In progress |
| Responsive polish | In progress |

## Features

### Selling (Cashier)

- Browse a product catalogue fetched from the DummyJSON API
- Search products by title, brand, or category
- Filter by category
- Add products to a cart
- Increase / decrease quantities within stock limits
- Remove individual items, or clear the cart
- Live cart total in KSh
- Complete a sale: stock deducted and a ledger entry written
- View the sale receipt
- Print the receipt (browser print)
- Download the receipt as .txt
- View order history and re-print any past receipt

### Managing (Admin)

- View current stock levels for every product
- See low-stock and out-of-stock alerts
- Restock existing products
- Add new products
- View the stock ledger (every sale, restock, and adjustment with
  before/after stock values)
- View reports: today / week / month sales, top products, revenue by category
- Adjust settings (store name, currency, low-stock threshold, demo users)

### Common

- Login screen with demo accounts (admin / cashier)
- Role-based access — cashiers cannot see admin pages
- Loading, error, and empty states throughout
- Responsive layout for desktop, tablet, and mobile

## Technologies

| Layer | Technology |
|-------|------------|
| UI library | React 19 |
| Build tool | Vite 8 |
| State management | React useReducer + useState + Context |
| Routing | React Router |
| Styling | Plain CSS |
| Persistence (Phase 1) | Browser localStorage |
| Linting | ESLint |
| Data source | DummyJSON Products API |

## API

- Source: https://dummyjson.com/docs/products
- Endpoint used: GET https://dummyjson.com/products?limit=0
- The app fetches the full list once and filters client-side to electronics
  categories (laptops, smartphones, tablets, mobile-accessories).

Example product:

    {
      "id": 6,
      "title": "Apple MacBook Pro 14 Inch Space Grey",
      "category": "laptops",
      "brand": "Apple",
      "price": 1999.99,
      "thumbnail": "https://...",
      "stock": 76
    }

## Currency handling

The API returns prices in USD. The app converts to KSh at a fixed rate:

    export const USD_TO_KSH = 130;
    export const toKsh = (usd) => Math.round(usd * USD_TO_KSH);
    export const formatKsh = (ksh) => `KSh ${ksh.toLocaleString("en-KE")}`;

All prices displayed to the user are in KSh.

## Installation

Requires Node.js 18+ and npm.

    npm install

## Running the app

    npm run dev

Open the URL shown in the terminal (usually http://localhost:5173).

Demo logins (Phase 1 — simulated):

| Role | Username | Password |
|------|----------|----------|
| Admin | manager | man123 |
| Cashier1 | cashier | cash123 |
| Cashier2 | cashier2 | cash123 |

## Other scripts

    npm run build
    npm run preview
    npm run lint

## Project structure

    pos-system/
    ├── public/
    ├── src/
    │   ├── api/              # API calls
    │   ├── auth/             # simulated login + roles
    │   ├── cart/             # cart + tabs reducers
    │   ├── components/       # shared UI components
    │   ├── pages/            # route pages
    │   ├── utils/            # shared helpers
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js

## Shared utilities

All modules under src/utils/ are pure, tested helpers used across the app.

| Utility | Purpose |
|---------|---------|
| formatPrice.js | USD to KSh conversion, safe parsing, line totals |
| storage.js | Namespaced localStorage wrapper (never throws) |
| id.js | Unique IDs for sales, tabs, ledger entries, receipts |
| dates.js | Date / time / relative formatting for en-KE |
| receiptText.js | Build and download a plain-text receipt |
| lowStock.js | Classify products as in / low / out of stock |
| ledger.js | Construct ledger entries for sales, restocks, adjustments |
| reporting.js | Aggregate sales into dashboard and report summaries |

## Stock ledger

Every stock change is recorded as a ledger entry:

    {
      "id": "LED-...",
      "type": "sale",
      "productId": 6,
      "productTitle": "Apple MacBook Pro...",
      "quantity": 3,
      "before": 20,
      "after": 17,
      "delta": -3,
      "user": "cashier",
      "createdAt": 1696339200000
    }

This powers the Ledger page, the Restock History page, and stock-audit
reporting.

## Team members

| # | Name | Role |
|---|------|------|
| 1 | Sylvans | Scrum Master / API, Auth, Dashboard |
| 2 | Brian   | Product Catalogue & Stock Management |
| 3 | Mark    | Search & Filtering |
| 4 | Oprah   | Cart, Tabs, Sale, Ledger, Receipt |
| 5 | Prince  | UI/UX, Navigation, Reports, Settings |
| 6 | Moses   | Testing, Documentation & Shared Utilities |

## Important decisions

- DummyJSON as the data source — free, no auth, realistic data.
- useReducer for cart and tabs state — cart operations map cleanly to reducers.
- Fixed USD to KSh rate (130) — a single constant keeps conversion in one place.
- Stock enforcement inside the reducer — the cart cannot exceed stock.
- Ledger-driven stock changes — every change produces a ledger entry.
- Shared utility suite — cross-cutting concerns live in src/utils/.
- Simulated persistence — localStorage under a techpoint: namespace in Phase 1.

## Testing

Manual QA by Member 6. Automated smoke tests for utilities via node.

Verified calculations:

- 3 items x KSh 500 = KSh 1,500
- 2 x KSh 1,299 + 1 x KSh 2,599 = KSh 5,197
- Stock deduction: 20 in stock minus 3 sold = 17 after
- 10,000 generated IDs = 10,000 unique

Suites: Utilities, API, Catalogue, Search & Filter, Cart, Sale, Receipt,
Auth, Dashboard, Stocks, Ledger, Reports, Responsive.

## Known issues

- No retry on API failure.
- ProductDetails.jsx is unused and its Add to Cart button has no handler.
- Dead API functions: getProducts() and getProductById() in api/products.js.
- Fixed FX rate — no live USD to KSh conversion.
- No cross-tab sync — opening the app in two tabs will not sync state.

## Phase 1 scope

Included:

- Electronics catalogue from API
- Search and category filtering
- Multi-tab POS with cart operations
- Stock deduction on sale
- Stock ledger
- Receipt generation, print, download
- Order history
- Stock management and restock
- Reports and settings
- Simulated auth with admin / cashier roles
- Loading, error, and empty states
- Responsive layout

Not included (Phase 2 / 3):

- Real backend server
- SQL database
- Real authentication (JWT / OAuth)
- Real payment processing (M-Pesa / Stripe)
- Physical receipt printer integration
- Multi-device sync
- Cloud persistence

## Git workflow

Two permanent branches:

- main — stable / release. Changes only via Pull Request.
- develop — integration branch. Feature branches merge here after review.

| Member | Branch |
|--------|--------|
| 1 | feature/api-integration |
| 2 | feature/product-catalogue |
| 3 | feature/search-filter |
| 4 | feature/cart |
| 5 | feature/ui-styling |
| 6 | feature/member6-utilities + feature/testing-documentation |

## License

Educational project — Phase 1 of the TechPoint POS assignment.
