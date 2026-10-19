import { NavLink } from "react-router-dom";

function ManagerNav({ user, onLogout }) {
  return (
    <header className="manager-header">
      <div className="manager-brand">
        <h1>TechPoint</h1>
        <p>Manager Portal</p>
      </div>

     <nav className="manager-nav">
  <NavLink to="/manager">
    Dashboard
  </NavLink>

  <NavLink to="/manager/sales">
    Sales
  </NavLink>

  <NavLink to="/manager/products">
    Products & Inventory
  </NavLink>

  <NavLink to="/manager/purchasing">
    Purchasing
  </NavLink>

  <NavLink to="/manager/shifts">
    Shifts
  </NavLink>

  <NavLink to="/manager/audit">
    Audit
  </NavLink>

  <NavLink to="/manager/cashiers">
    Cashiers
  </NavLink>
</nav>

      <div className="manager-user">
        <span>Welcome, {user.username}</span>

        <button onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default ManagerNav;
