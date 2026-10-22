const BASE_URL = "https://pos-backend-egns.onrender.com/api";
const TOKEN_KEY = "techpoint_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // some responses have no body
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.access_token);
  return data.user;
}

export async function registerManager(name, username, password) {
  const data = await apiFetch("/auth/manager-signup", {
    method: "POST",
    body: JSON.stringify({ name, username, password }),
  });
  setToken(data.access_token);
  return data.user;
}
