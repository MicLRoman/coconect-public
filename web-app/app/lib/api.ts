// Shared API base for the FastAPI ai-engine.
export const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

export const USER_KEY = "coconect_user_id";
export const TOKEN_KEY = "coconect_token";

export function getUserId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(USER_KEY);
}

export function setUserId(id: string) {
    if (typeof window !== "undefined") localStorage.setItem(USER_KEY, id);
}

// ---- session token (bearer; выдаётся бэком на входах, см. auth.py) ----
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null | undefined) {
    if (typeof window === "undefined" || !t) return;
    localStorage.setItem(TOKEN_KEY, t);
}

export function clearAuth() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): Record<string, string> {
    const t = getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Глобальный перехватчик: автоматически добавляет Authorization: Bearer <token>
 * ко ВСЕМ запросам на API_URL. Одна точка — не нужно править каждый fetch.
 */
let _installed = false;
export function installAuthInterceptor() {
    if (_installed || typeof window === "undefined" || !window.fetch) return;
    _installed = true;
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
        try {
            const url =
                typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url || "";
            const token = getToken();
            if (token && url.startsWith(API_URL)) {
                const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
                if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
                init = { ...init, headers };
            }
        } catch {
            /* passthrough on any error */
        }
        return orig(input, init);
    };
}

// Ставим перехватчик при первом импорте на клиенте.
installAuthInterceptor();
