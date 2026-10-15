import { apiFetch } from "./api/client";
import Login from "./components/Login";
import ManagerDashboard from "./components/ManagerDashboard";
import ManagerNav from "./components/ManagerNav";
import ManagerSales from "./components/ManagerSales";
import ManagerProducts from "./components/ManagerProducts";
import ManagerCashiers from "./components/ManagerCashiers";
import About from "./components/About";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import { getProducts } from "./api/products";
import { cartReducer } from "./cart/cartReducer";
import { formatKsh } from "./utils/formatPrice";

import ProductList from "./components/ProductList";
import ProductDetails from "./components/ProductDetails";
import SearchBar from "./components/SearchBar";
import CategoryFilter from "./components/CategoryFilter";
import Cart from "./components/Cart";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  /*
    PRODUCTS

    First check localStorage.

    If products have already been saved,
    use those products instead of fetching
    fresh stock from DummyJSON.

    This means stock changes survive
    page refreshes.
  */
  const [products, setProducts] = useState(() => {
    const savedProducts = localStorage.getItem(
      "techpoint-products"
    );

    return savedProducts
      ? JSON.parse(savedProducts)
      : [];
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);

  /*
    DEFAULT USERS
  */
  const defaultUsers = [
    {
      username: "cashier",
      password: "cash123",
      role: "cashier",
      name: "Cashier 1",
    },
    {
      username: "cashier2",
      password: "cash123",
      role: "cashier",
      name: "Cashier 2",
    },
    {
      username: "manager",
      password: "man123",
      role: "manager",
      name: "Store Manager",
    },
  ];

  /*
    USERS

    Users are loaded from localStorage so
    newly registered cashiers survive refresh.
  */
  const [users, setUsers] = useState(() => {
    const savedUsers = localStorage.getItem(
      "techpoint-users"
    );

    return savedUsers
      ? JSON.parse(savedUsers)
      : defaultUsers;
  });

  /*
    Save users whenever they change.
  */
  useEffect(() => {
    localStorage.setItem(
      "techpoint-users",
      JSON.stringify(users)
    );
  }, [users]);

  /*
    Load products.

    If products already exist in localStorage,
    use them instead of fetching fresh data.
  */
  useEffect(() => {
    getProducts()
      .then((data) => setProducts(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /*
    Save products whenever they change.

    This means stock changes made after
    completing a sale survive refresh.
  */
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem(
        "techpoint-products",
        JSON.stringify(products)
      );
    }
  }, [products]);

  /*
    Each cashier has their own cart.
  */
  const [cashierCarts, setCashierCarts] =
    useState({});

  const [heldCarts, setHeldCarts] = useState([]);
  const [sale, setSale] = useState(null);
  const [sessionSales, setSessionSales] =
    useState([]);

  const receiptRef = useRef(null);

  const [view, setView] = useState("home");
  const [featuredIndex, setFeaturedIndex] =
    useState(0);

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const productDetailsRef = useRef(null);

  /*
    Keep the cashier view synchronized
    with the current URL.
  */
  useEffect(() => {
    const pathToView = {
      "/": "home",
      "/cashier/products": "products",
      "/cashier/categories": "categories",
      "/cashier/low-stock": "low-stock",
    };

    const nextView =
      pathToView[location.pathname];

    if (nextView) {
      setView(nextView);
    }
  }, [location.pathname]);

  /*
    Get the current cashier's cart.
  */
  const cart = currentUser
    ? cashierCarts[currentUser.username] ?? []
    : [];

  /*
    Apply cartReducer to the current
    cashier's cart.
  */
  const dispatch = (action) => {
    if (!currentUser) {
      return;
    }

    const username = currentUser.username;

    setCashierCarts((carts) => ({
      ...carts,

      [username]: cartReducer(
        carts[username] ?? [],
        action
      ),
    }));
  };

  /*
    LOGIN
  */
  const handleLogin = (user) => {
    setCashierCarts((carts) => ({
      ...carts,

      [user.username]:
        carts[user.username] ?? [],
    }));

    setCurrentUser(user);
    setSale(null);
    setSelectedProduct(null);

    if (user.role === "manager") {
      navigate("/manager");
    } else {
      navigate("/");
    }
  };

  /*
    LOGOUT / SWITCH USER

    The current cashier's cart is preserved.
  */
  const handleSwitchUser = () => {
    setSale(null);
    setSelectedProduct(null);
    setSearch("");
    setCategory("all");
    setView("home");
    setCurrentUser(null);

    navigate("/");
  };

  /*
    Product categories
  */
  const categories = useMemo(
    () =>
      [
        ...new Set(
          products.map(
            (product) => product.category
          )
        ),
      ].sort(),
    [products]
  );

  /*
    Featured products
  */
  const featuredProducts = useMemo(() => {
    const productsByCategory = new Map();

    products.forEach((product) => {
      const categoryProducts =
        productsByCategory.get(
          product.category
        ) ?? [];

      if (categoryProducts.length < 2) {
        categoryProducts.push(product);
      }

      productsByCategory.set(
        product.category,
        categoryProducts
      );
    });

    return [
      ...productsByCategory.values(),
    ].flat();
  }, [products]);

  useEffect(() => {
    if (
      featuredProducts.length < 2 ||
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setFeaturedIndex(
        (index) =>
          (index + 1) %
          featuredProducts.length
      );
    }, 4500);

    return () =>
      window.clearInterval(intervalId);
  }, [featuredProducts.length]);

  /*
    Search and filter
  */
  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState("all");

  const filteredProducts = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        category === "all" ||
        product.category === category;

      const matchesSearch =
        !query ||
        product.title
          .toLowerCase()
          .includes(query) ||
        product.brand
          ?.toLowerCase()
          .includes(query) ||
        product.category
          .toLowerCase()
          .includes(query);

      const quantityInCart =
        cart.find(
          (item) => item.id === product.id
        )?.quantity ?? 0;

      const matchesStock =
        view !== "low-stock" ||
        (product.stock > 0 &&
          product.stock -
            quantityInCart <=
            10);

      return (
        matchesCategory &&
        matchesSearch &&
        matchesStock
      );
    });
  }, [
    products,
    search,
    category,
    view,
    cart,
  ]);

  /*
    Low-stock count
  */
  const lowStockCount = products.filter(
    (product) => {
      const quantityInCart =
        cart.find(
          (item) => item.id === product.id
        )?.quantity ?? 0;

      return (
        product.stock > 0 &&
        product.stock -
          quantityInCart <=
          10
      );
    }
  ).length;

  const featuredProduct =
    featuredProducts[featuredIndex];

  const latestSale =
    sessionSales[
      sessionSales.length - 1
    ];

  /*
    Featured product controls
  */
  const moveFeatured = (direction) => {
    if (featuredProducts.length === 0) {
      return;
    }

    setFeaturedIndex(
      (index) =>
        (index +
          direction +
          featuredProducts.length) %
        featuredProducts.length
    );
  };

  /*
    Navigation
  */
  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setView("products");
    navigate("/cashier/products");
  };

  const navigateTo = (nextView) => {
    setSearch("");
    setCategory("all");
    setSelectedProduct(null);
    setView(nextView);

    const routes = {
      home: "/",
      products: "/cashier/products",
      categories: "/cashier/categories",
      "low-stock": "/cashier/low-stock",
    };

    navigate(routes[nextView] || "/");
  };

  /*
    HOLD SALE
  */
  const holdSale = () => {
    if (cart.length === 0) {
      return;
    }

    const heldSale = {
      id: Date.now(),
      cashier: currentUser.username,
      items: cart,
      heldAt: new Date().toISOString(),
    };

    setHeldCarts((sales) => [
      ...sales,
      heldSale,
    ]);

    dispatch({
      type: "CLEAR",
    });
  };

  /*
    RESTORE HELD SALE
  */
  const restoreHeldSale = (id) => {
    if (cart.length > 0) {
      window.alert(
        "Please complete, clear, or hold the current sale before restoring another sale."
      );

      return;
    }

    const heldSale =
      heldCarts.find(
        (sale) => sale.id === id
      );

    if (!heldSale) {
      return;
    }

    const stockProblem =
      heldSale.items.find((item) => {
        const currentProduct =
          products.find(
            (product) =>
              product.id === item.id
          );

        return (
          !currentProduct ||
          currentProduct.stock <
            item.quantity
        );
      });

    if (stockProblem) {
      window.alert(
        "This held sale cannot be restored because one or more products no longer have enough stock."
      );

      return;
    }

    dispatch({
      type: "RESTORE",
      items: heldSale.items,
    });

    setHeldCarts((sales) =>
      sales.filter(
        (sale) => sale.id !== id
      )
    );
  };

  /*
    COMPLETE SALE
  */
  const completeSale = async () => {
    if (cart.length === 0) {
      return;
    }

    let serverSale;

    try {
      serverSale = await apiFetch("/sales", {
        method: "POST",
        body: JSON.stringify({
          payment_method: "cash",
          items: cart.map((item) => ({
            product_id: Number(item.id),
            quantity: item.quantity,
          })),
        }),
      });
    } catch (err) {
      window.alert(err.message);
      return;
    }

    const completedSale = {
      id: serverSale.id,

      cashier: currentUser.username,

      items: serverSale.items.map((item) => ({
        id: item.product_id,
        title: item.product_title,
        price: Number(item.unit_price),
        quantity: item.quantity,
      })),

      total: Number(serverSale.total_amount),

      itemCount: serverSale.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),

      completedAt: serverSale.created_at,
    };

    /*
      Reduce stock on screen, using what the server sold.
    */
    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const soldItem = serverSale.items.find(
          (item) => item.product_id === product.id
        );

        if (!soldItem) {
          return product;
        }

        return {
          ...product,
          stock: product.stock - soldItem.quantity,
        };
      })
    );

    setSale(completedSale);

    setSessionSales((sales) => [...sales, completedSale]);

    dispatch({
      type: "CLEAR",
    });

    setTimeout(() => {
      receiptRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  /*
    MANAGER: load all sales from the backend.
  */
  useEffect(() => {
    if (currentUser?.role !== "manager") {
      return;
    }

    Promise.all([
      apiFetch("/sales"),
      apiFetch("/reports/sales-by-cashier"),
    ])
      .then(([salesData, cashierData]) => {
        const names = {};
        (cashierData.results || []).forEach((c) => {
          names[c.user_id] = c.username;
        });

        const list = Array.isArray(salesData) ? salesData : [];

        setSessionSales(
          list
            .slice()
            .reverse()
            .map((sale) => ({
              id: sale.id,
              cashier: names[sale.user_id] || `user ${sale.user_id}`,
              items: sale.items.map((item) => ({
                id: item.product_id,
                title: item.product_title,
                price: Number(item.unit_price),
                quantity: item.quantity,
              })),
              total: Number(sale.total_amount),
              itemCount: sale.items.reduce(
                (sum, item) => sum + item.quantity,
                0
              ),
              completedAt: sale.created_at,
            }))
        );
      })
      .catch((err) => console.error("Could not load sales:", err.message));
  }, [currentUser]);

  /*
    PRODUCT DETAILS
  */
  const handleViewDetails = (
    product
  ) => {
    setSelectedProduct(product);

    setTimeout(() => {
      productDetailsRef.current?.scrollIntoView(
        {
          behavior: "smooth",
          block: "start",
        }
      );
    }, 100);
  };

  /*
    LOGIN SCREEN
  */
  if (!currentUser) {
    return (
      <Login
        users={users}
        onLogin={handleLogin}
      />
    );
  }

  /*
    ABOUT PAGE
  */
  if (location.pathname === "/about") {
    return (
      <About
        onBack={() => navigate("/")}
      />
    );
  }

  /*
    MANAGER AREA
  */
  if (
    currentUser.role ===
    "manager"
  ) {
    return (
      <>
        <ManagerNav
          user={currentUser}
          onLogout={
            handleSwitchUser
          }
        />

        <Routes>
          <Route
            path="/manager"
            element={
              <ManagerDashboard
                user={currentUser}
                onLogout={
                  handleSwitchUser
                }
                products={products}
                sales={sessionSales}
              />
            }
          />

          <Route
            path="/manager/sales"
            element={
              <ManagerSales
                sales={sessionSales}
              />
            }
          />

          <Route
            path="/manager/products"
            element={
              <ManagerProducts
                products={products}
                setProducts={
                  setProducts
                }
              />
            }
          />

          <Route
            path="/manager/cashiers"
            element={
              <ManagerCashiers
                users={users}
                setUsers={setUsers}
              />
            }
          />

          <Route
            path="*"
            element={
              <ManagerDashboard
                user={currentUser}
                onLogout={
                  handleSwitchUser
                }
                products={products}
                sales={sessionSales}
              />
            }
          />
        </Routes>
      </>
    );
  }

  /*
    CASHIER AREA
  */
  const currentCashierHeldSales =
    heldCarts.filter(
      (heldSale) =>
        heldSale.cashier ===
        currentUser.username
    );

  return (
    <div className="pos-app">
      <header className="app-header">
        <button
          className="brand-lockup"
          type="button"
          onClick={() =>
            navigateTo("home")
          }
          aria-label="TechPoint home"
        >
          <span
            className="brand-mark"
            aria-hidden="true"
          >
            T
          </span>

          <span className="brand-copy">
            <span className="brand-name">
              TechPoint
            </span>

            <span className="brand-caption">
              Point of sale
            </span>
          </span>
        </button>

        <nav
          className="app-nav"
          aria-label="Main navigation"
        >
          <button
            className={`app-nav-button${
              view === "home"
                ? " is-active"
                : ""
            }`}
            type="button"
            aria-current={
              view === "home"
                ? "page"
                : undefined
            }
            onClick={() =>
              navigateTo("home")
            }
          >
            Home
          </button>

          <button
            className={`app-nav-button${
              view === "categories"
                ? " is-active"
                : ""
            }`}
            type="button"
            aria-current={
              view === "categories"
                ? "page"
                : undefined
            }
            onClick={() =>
              navigateTo(
                "categories"
              )
            }
          >
            Categories
          </button>

          <button
            className={`app-nav-button${
              view === "products"
                ? " is-active"
                : ""
            }`}
            type="button"
            aria-current={
              view === "products"
                ? "page"
                : undefined
            }
            onClick={() =>
              navigateTo(
                "products"
              )
            }
          >
            Products
          </button>

          <button
            className={`app-nav-button${
              view === "low-stock"
                ? " is-active"
                : ""
            }`}
            type="button"
            aria-current={
              view === "low-stock"
                ? "page"
                : undefined
            }
            onClick={() =>
              navigateTo(
                "low-stock"
              )
            }
          >
            Low stock
          </button>

          <button
            className={`app-nav-button${
              location.pathname ===
              "/about"
                ? " is-active"
                : ""
            }`}
            type="button"
            aria-current={
              location.pathname ===
              "/about"
                ? "page"
                : undefined
            }
            onClick={() => {
              setSelectedProduct(null);
              navigate("/about");
            }}
          >
            About
          </button>
        </nav>

        <div className="terminal-status">
          <span
            className="status-indicator"
            aria-hidden="true"
          />

          <span>
            {currentUser.username}
          </span>

          <button
            type="button"
            onClick={
              handleSwitchUser
            }
          >
            Switch User
          </button>
        </div>
      </header>

      {/* HOME */}

      {view === "home" ? (
        <main className="home-content">
          <section
            className="welcome-hero"
            aria-labelledby="welcome-title"
          >
            <div className="welcome-copy">
              <p className="welcome-kicker">
                TECHPOINT · HOME
              </p>

              <h1 id="welcome-title">
                Welcome back.
                <br />
                Let’s get selling.
              </h1>

              <p className="welcome-description">
                Your counter is ready. Pick
                up where you left off and
                make the next sale.
              </p>

              <button
                className="start-sale-button"
                type="button"
                onClick={() =>
                  navigateTo(
                    "products"
                  )
                }
              >
                Start a sale{" "}
                <span aria-hidden="true">
                  →
                </span>
              </button>

              <p className="welcome-hint">
                Your product catalogue is
                ready whenever you are.
              </p>
            </div>

            <div
              className="welcome-feature"
              role="region"
              aria-label="Featured products"
              aria-roledescription="carousel"
            >
              {featuredProduct ? (
                <>
                  <span className="feature-label">
                    IN THE SHOP
                  </span>

                  {featuredProducts.length >
                    1 && (
                    <div className="feature-controls">
                      <span aria-hidden="true">
                        {String(
                          featuredIndex +
                            1
                        ).padStart(
                          2,
                          "0"
                        )}{" "}
                        /{" "}
                        {String(
                          featuredProducts.length
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>

                      <button
                        className="feature-control-button"
                        type="button"
                        aria-label="Previous featured product"
                        onClick={() =>
                          moveFeatured(
                            -1
                          )
                        }
                      >
                        ←
                      </button>

                      <button
                        className="feature-control-button"
                        type="button"
                        aria-label="Next featured product"
                        onClick={() =>
                          moveFeatured(
                            1
                          )
                        }
                      >
                        →
                      </button>
                    </div>
                  )}

                  <img
                    key={
                      featuredProduct.id
                    }
                    src={
                      featuredProduct.thumbnail
                    }
                    alt={
                      featuredProduct.title
                    }
                  />

                  <div className="feature-product-copy">
                    <span>
                      {featuredProduct.category.replaceAll(
                        "-",
                        " "
                      )}
                    </span>

                    <strong>
                      {
                        featuredProduct.title
                      }
                    </strong>

                    <span className="feature-product-price">
                      {formatKsh(
                        featuredProduct.price
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <p className="feature-placeholder">
                  {loading
                    ? "Loading your inventory…"
                    : "Your featured product will appear here."}
                </p>
              )}
            </div>
          </section>

          <section
            className="home-overview"
            aria-labelledby="overview-title"
          >
            <div className="overview-heading">
              <div>
                <p className="section-kicker">
                  AT A GLANCE
                </p>

                <h2 id="overview-title">
                  Live at your counter
                </h2>
              </div>

              {error && (
                <p
                  className="overview-error"
                  role="status"
                >
                  Inventory unavailable
                </p>
              )}
            </div>

            <div className="overview-stats">
              <button
                className="overview-stat overview-stat-button"
                type="button"
                aria-label={`View all ${products.length} products`}
                onClick={() =>
                  navigateTo(
                    "products"
                  )
                }
              >
                <span>
                  Products listed
                </span>

                <strong>
                  {loading
                    ? "—"
                    : products.length}
                </strong>
              </button>

              <button
                className="overview-stat overview-stat-button"
                type="button"
                aria-label={`Browse ${categories.length} product categories`}
                onClick={() =>
                  navigateTo(
                    "categories"
                  )
                }
              >
                <span>
                  Product categories
                </span>

                <strong>
                  {loading
                    ? "—"
                    : categories.length}
                </strong>
              </button>

              <button
                className="overview-stat overview-stat-button"
                type="button"
                aria-label={`View ${lowStockCount} low-stock products`}
                onClick={() =>
                  navigateTo(
                    "low-stock"
                  )
                }
              >
                <span>
                  Running low
                </span>

                <strong>
                  {loading
                    ? "—"
                    : lowStockCount}
                </strong>
              </button>

              <div className="overview-stat">
                <span>
                  Sales this session
                </span>

                <strong>
                  {sessionSales.length}
                </strong>
              </div>
            </div>
          </section>

          <section
            className="recent-activity"
            aria-labelledby="activity-title"
          >
            <div>
              <p className="section-kicker">
                RECENT ACTIVITY
              </p>

              <h2 id="activity-title">
                Latest sale
              </h2>
            </div>

            {latestSale ? (
              <p className="recent-activity-detail">
                <span>
                  {latestSale.itemCount}{" "}
                  item
                  {latestSale.itemCount ===
                  1
                    ? ""
                    : "s"}{" "}
                  sold for{" "}
                  <strong>
                    {formatKsh(
                      latestSale.total
                    )}
                  </strong>
                  {" · "}
                  Cashier:{" "}
                  {latestSale.cashier}
                </span>

                <time
                  dateTime={
                    latestSale.completedAt
                  }
                >
                  {new Intl.DateTimeFormat(
                    undefined,
                    {
                      hour: "numeric",
                      minute:
                        "2-digit",
                    }
                  ).format(
                    new Date(
                      latestSale.completedAt
                    )
                  )}
                </time>
              </p>
            ) : (
              <p className="recent-activity-empty">
                No completed sales this
                session
              </p>
            )}
          </section>
        </main>
      ) : view === "categories" ? (
        <main className="main-content">
          <section
            className="category-directory"
            aria-labelledby="categories-title"
          >
            <div className="catalogue-heading">
              <div>
                <p className="section-kicker">
                  STORE INVENTORY
                </p>

                <h1 id="categories-title">
                  Product categories
                </h1>

                <p className="section-description">
                  Choose a category to
                  browse its products.
                </p>
              </div>
            </div>

            {loading ? (
              <div
                className="catalogue-message"
                role="status"
                aria-live="polite"
              >
                <span
                  className="loading-indicator"
                  aria-hidden="true"
                />

                <p>
                  Loading categories...
                </p>
              </div>
            ) : error ? (
              <div
                className="catalogue-message catalogue-message--error"
                role="alert"
              >
                <h2>
                  Categories couldn’t
                  be loaded
                </h2>

                <p>{error}</p>
              </div>
            ) : categories.length ===
              0 ? (
              <div className="catalogue-message">
                <h2>
                  No categories available
                </h2>

                <p>
                  There are no product
                  categories to display
                  right now.
                </p>
              </div>
            ) : (
              <ul className="category-list">
                {categories.map(
                  (categoryName) => {
                    const productCount =
                      products.filter(
                        (product) =>
                          product.category ===
                          categoryName
                      ).length;

                    const categoryLabel =
                      categoryName
                        .split("-")
                        .map(
                          (word) =>
                            word
                              .charAt(
                                0
                              )
                              .toUpperCase() +
                            word.slice(
                              1
                            )
                        )
                        .join(" ");

                    return (
                      <li
                        key={
                          categoryName
                        }
                      >
                        <button
                          className="category-list-button"
                          type="button"
                          onClick={() => {
                            setCategory(
                              categoryName
                            );

                            setView(
                              "products"
                            );

                            navigate(
                              "/cashier/products"
                            );
                          }}
                        >
                          <span className="category-list-copy">
                            <strong>
                              {
                                categoryLabel
                              }
                            </strong>

                            <span>
                              {
                                productCount
                              }{" "}
                              products
                            </span>
                          </span>

                          <span
                            className="category-list-arrow"
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </button>
                      </li>
                    );
                  }
                )}
              </ul>
            )}
          </section>
        </main>
      ) : (
        <main className="main-content">
          <section
            className="catalogue"
            aria-labelledby="catalogue-title"
          >
            <div className="catalogue-heading">
              <div>
                <p className="section-kicker">
                  STORE INVENTORY
                </p>

                <h1 id="catalogue-title">
                  {view === "low-stock"
                    ? "Low-stock products"
                    : "Browse products"}
                </h1>

                <p className="section-description">
                  {view ===
                  "low-stock"
                    ? "Products with 10 or fewer units in stock."
                    : "Electronics and accessories for every setup."}
                </p>
              </div>

              {!loading &&
                !error && (
                  <p className="product-count">
                    <strong>
                      {products.length}
                    </strong>{" "}
                    products
                  </p>
                )}
            </div>

            {sale && (
              <div
                className="sale-confirmation"
                ref={receiptRef}
                role="status"
              >
                <h2>
                  Sale Completed
                </h2>

                <div className="receipt">
                  <h3>
                    TECHPOINT RECEIPT
                  </h3>

                  <p>
                    <strong>
                      Cashier:
                    </strong>{" "}
                    {sale.cashier}
                  </p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      sale.completedAt
                    ).toLocaleString()}
                  </p>

                  <hr />

                  {sale.items.map(
                    (item) => (
                      <div
                        key={item.id}
                        className="receipt-item"
                      >
                        <div>
                          <strong>
                            {
                              item.title
                            }
                          </strong>

                          <p>
                            {
                              item.quantity
                            }{" "}
                            ×{" "}
                            {formatKsh(
                              item.price
                            )}
                          </p>
                        </div>

                        <strong>
                          {formatKsh(
                            item.price *
                              item.quantity
                          )}
                        </strong>
                      </div>
                    )
                  )}

                  <hr />

                  <div className="receipt-total">
                    <strong>
                      TOTAL
                    </strong>

                    <strong>
                      {formatKsh(
                        sale.total
                      )}
                    </strong>
                  </div>
                </div>

                <p className="sale-success-message">
                  ✓ Sale completed
                  successfully.
                </p>

                <button
                  onClick={() =>
                    setSale(null)
                  }
                >
                  New Sale
                </button>
              </div>
            )}

            <div className="catalogue-controls">
              <SearchBar
                value={search}
                onChange={setSearch}
              />

              <CategoryFilter
                categories={
                  categories
                }
                selected={category}
                onChange={
                  setCategory
                }
              />
            </div>

            {currentCashierHeldSales.length >
              0 && (
              <section className="held-sales">
                <div className="held-sales-header">
                  <div>
                    <p className="section-kicker">
                      HELD SALES
                    </p>

                    <h2>
                      {
                        currentCashierHeldSales.length
                      }{" "}
                      sale
                      {currentCashierHeldSales.length ===
                      1
                        ? ""
                        : "s"}{" "}
                      on hold
                    </h2>
                  </div>
                </div>

                <div className="held-sales-list">
                  {currentCashierHeldSales.map(
                    (heldSale) => (
                      <div
                        className="held-sale-card"
                        key={
                          heldSale.id
                        }
                      >
                        <div>
                          <strong>
                            Sale #
                            {
                              heldSale.id
                            }
                          </strong>

                          <p>
                            {
                              heldSale.items.reduce(
                                (
                                  total,
                                  item
                                ) =>
                                  total +
                                  item.quantity,
                                0
                              )
                            }{" "}
                            item(s)
                          </p>

                          <small>
                            Held{" "}
                            {new Date(
                              heldSale.heldAt
                            ).toLocaleTimeString()}
                          </small>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            restoreHeldSale(
                              heldSale.id
                            )
                          }
                        >
                          Restore Sale
                        </button>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {loading ? (
              <div
                className="catalogue-message"
                role="status"
                aria-live="polite"
              >
                <span
                  className="loading-indicator"
                  aria-hidden="true"
                />

                <p>
                  Loading products...
                </p>
              </div>
            ) : error ? (
              <div
                className="catalogue-message catalogue-message--error"
                role="alert"
              >
                <h2>
                  Products couldn’t be
                  loaded
                </h2>

                <p>{error}</p>
              </div>
            ) : products.length ===
              0 ? (
              <div className="catalogue-message">
                <h2>
                  No products available
                </h2>

                <p>
                  There are no matching
                  products to display
                  right now.
                </p>
              </div>
            ) : filteredProducts.length ===
              0 ? (
              <div className="catalogue-message">
                <h2>
                  {view ===
                  "low-stock"
                    ? "No low-stock products"
                    : "No products match your search"}
                </h2>

                <button
                  className="clear-filters-button"
                  onClick={
                    clearFilters
                  }
                >
                  {view ===
                  "low-stock"
                    ? "Show all products"
                    : "Clear filters"}
                </button>
              </div>
            ) : (
              <div className="catalogue-layout">
                <div className="catalogue-panel">
                  <p className="catalogue-summary">
                    {view ===
                    "low-stock"
                      ? `Showing ${filteredProducts.length} low-stock products`
                      : `Showing ${filteredProducts.length} of ${products.length} products`}
                  </p>

                  <ProductList
                    products={
                      filteredProducts
                    }
                    cart={cart}
                    showStock={
                      view ===
                      "low-stock"
                    }
                    onAddToCart={(
                      product
                    ) =>
                      dispatch({
                        type: "ADD",
                        product,
                      })
                    }
                    onViewDetails={
                      handleViewDetails
                    }
                  />
                </div>

                <Cart
                  items={cart}
                  onIncrement={(
                    id
                  ) =>
                    dispatch({
                      type: "INCREMENT",
                      id,
                    })
                  }
                  onDecrement={(
                    id
                  ) =>
                    dispatch({
                      type: "DECREMENT",
                      id,
                    })
                  }
                  onRemove={(id) =>
                    dispatch({
                      type: "REMOVE",
                      id,
                    })
                  }
                  onClear={() =>
                    dispatch({
                      type: "CLEAR",
                    })
                  }
                  onCheckout={
                    completeSale
                  }
                  onHoldSale={
                    holdSale
                  }
                />
              </div>
            )}

            {selectedProduct && (
              <div
                ref={
                  productDetailsRef
                }
              >
                <ProductDetails
                  product={
                    selectedProduct
                  }
                  onClose={() =>
                    setSelectedProduct(
                      null
                    )
                  }
                  onAddToCart={(
                    product
                  ) =>
                    dispatch({
                      type: "ADD",
                      product,
                    })
                  }
                />
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

function AppWithRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={<App />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppWithRouter;