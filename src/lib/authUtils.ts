// ...existing code...
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Unified logout utility (fetch-based) to align with apiRequest usage.
// Performs backend logout, clears local token (if any), and returns success boolean.
export async function performLogout(): Promise<boolean> {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'https://api.spacevox.com';
  const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
    // Remove any stray token storage from earlier flows
    try { localStorage.removeItem('token'); } catch {}
    return res.ok;
  } catch (e) {
    console.error('Logout failed', e);
    return false;
  }
}
