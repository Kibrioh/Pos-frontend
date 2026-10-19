import { useState } from "react";
import { login } from "../api/client";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError("Please enter your username and password.");
      return;
    }

    try {
      const user = await login(username, password);
      setError("");
      onLogin(user);
    } catch (err) {
      setError(err.status === 401 ? "Invalid username or password." : err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-icon">TP</div>

        <h1>TechPoint</h1>

        <p>
          Smart sales. Simple management.
        </p>
      </div>

      <div className="login-card">
        <div className="login-header">
          <h2>Welcome back</h2>

          <p>
            Sign in to access the TechPoint POS system.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Enter your username"
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="login-button"
            type="submit"
          >
            Sign In
          </button>
        </form>

        <div className="login-footer">
          <span></span>
          <p>TechPoint POS</p>
          <span></span>
        </div>
      </div>
    </div>
  );
}

export default Login;
