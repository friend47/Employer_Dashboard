export const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const EMPLOYER_ID =
  (typeof localStorage !== "undefined" && localStorage.getItem("employer_id")) ||
  import.meta.env.VITE_EMPLOYER_ID ||
  "";

function withEmployer(path: string) {
  if (!EMPLOYER_ID) return path;
  const hasQuery = path.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${path}${sep}employer_id=${encodeURIComponent(EMPLOYER_ID)}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const url = withEmployer(path);
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}
