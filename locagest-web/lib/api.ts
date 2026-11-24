// Client HTTP centralisé (§8) : envoie les cookies de session Sanctum et le jeton CSRF.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;
  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

let csrfReady = false;

/** Récupère le cookie XSRF-TOKEN de Sanctum (une fois, ou après une erreur 419). */
export async function ensureCsrf(force = false) {
  if (csrfReady && !force && readCookie("XSRF-TOKEN")) return;
  await fetch(`${API_URL}/sanctum/csrf-cookie`, { credentials: "include" });
  csrfReady = true;
}

type Body = Record<string, unknown> | FormData | undefined;

async function request<T>(method: string, path: string, body?: Body, retry = true): Promise<T> {
  const isWrite = method !== "GET";
  if (isWrite) await ensureCsrf();

  const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" };
  const xsrf = readCookie("XSRF-TOKEN");
  if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_URL}/api${path}`, { method, headers, body: payload, credentials: "include" });

  if (res.status === 419 && retry) {
    // Jeton CSRF expiré : on le renouvelle et on rejoue la requête une fois.
    await ensureCsrf(true);
    return request<T>(method, path, body, false);
  }
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const messages: Record<number, string> = {
      401: "Votre session a expiré. Reconnectez-vous.",
      403: "Accès refusé.",
      404: "Élément introuvable.",
      429: "Trop de tentatives. Réessayez dans une minute.",
      500: "Erreur du serveur. Réessayez plus tard.",
    };
    throw new ApiError(res.status, data.message || messages[res.status] || "Une erreur est survenue.", data.errors ?? {});
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: Body) => request<T>("POST", path, body ?? {}),
  put: <T>(path: string, body?: Body) => request<T>("PUT", path, body ?? {}),
  patch: <T>(path: string, body?: Body) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/** Construit une query string en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Télécharge un fichier protégé (PDF, preuve) avec les cookies de session. */
export async function download(path: string, filename?: string, open = false) {
  const res = await fetch(`${API_URL}/api${path}`, { credentials: "include", headers: { Accept: "*/*" } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message || "Téléchargement impossible.");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (open) {
    window.open(url, "_blank");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
