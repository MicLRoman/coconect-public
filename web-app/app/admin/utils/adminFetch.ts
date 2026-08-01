import { API_URL } from '../../lib/api';

const TOKEN_KEY = 'tablr_admin_token';

export const getAdminToken = () =>
    (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
export const setAdminToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);

export async function adminFetch(path: string, options: RequestInit = {}) {
    const token = getAdminToken();
    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const url = path.startsWith('http') ? path : `${API_URL}${path}`;
    return fetch(url, { ...options, headers });
}
