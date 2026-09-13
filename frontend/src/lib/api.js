export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const getToken = () => localStorage.getItem("eb_token");
export const setToken = (t) => localStorage.setItem("eb_token", t);
export const clearToken = () => localStorage.removeItem("eb_token");

export function detailToString(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (auth && t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(detailToString(data?.detail) || "something went wrong");
  return data;
}

export const postScore = (game, score, handle) =>
  api("/scores", { method: "POST", body: { game, handle: handle || "anon", score } });

export const getScores = (game) => api(`/scores/${game}`, { auth: false });
