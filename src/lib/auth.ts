import axios from 'axios';

// Base API host (no trailing /api here; endpoints will include full path segments)
const API_URL = (import.meta.env.VITE_API_URL || 'https://api.spacevox.com').replace(/\/$/, '');

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  timezone?: string | null;
}

interface AuthResponse {
  token: string;
  user: User;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await axios.post(`${API_URL}/api/public/auth/signin`, {
    email: normalizedEmail,
    password,
  }, { withCredentials: true }); // send cookies
  return response.data;
};

export const signup = async (
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  timezone?: string
): Promise<AuthResponse> => {
  const normalizedEmail = email.trim().toLowerCase();
  const response = await axios.post(`${API_URL}/api/public/auth/signup`, {
    email: normalizedEmail,
    password,
    firstName,
    lastName,
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  }, { withCredentials: true }); // send cookies
  return response.data;
};

export const logout = async () => {
  await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await axios.get(`${API_URL}/api/auth/me`, { withCredentials: true });
    return response.data.user;
  } catch {
    return null;
  }
};

export const updateTimezone = async (timezone: string): Promise<void> => {
  await axios.post(`${API_URL}/api/account/timezone`, { timezone }, { withCredentials: true });
};

// No getToken needed, authentication handled by httpOnly cookie

// Ensure axios sends cookies for all requests
axios.defaults.withCredentials = true;