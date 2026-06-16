const fallbackBase =
  typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : window.location.origin)
    : 'http://localhost:3000';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || fallbackBase || 'http://localhost:3000').replace(/\/$/, '');
const API_URL = `${API_BASE_URL}/api`;

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Removed redirect to login - allow direct access
    throw new Error('Unauthorized');
  }

  return response.json();
}

// API wrapper for easier usage (similar to axios)
const api = {
  get: async (endpoint: string) => {
    const data = await apiCall(endpoint, { method: 'GET' });
    return { data };
  },

  post: async (endpoint: string, body?: any, config?: { headers?: Record<string, string> }) => {
    const token = localStorage.getItem('token');

    // Check if body is FormData
    const isFormData = body instanceof FormData;

    const headers: Record<string, string> = {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...config?.headers,
    };

    // Don't set Content-Type for FormData (browser will set it with boundary)
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: isFormData ? body : JSON.stringify(body),
    });

    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Nu mai redirecționăm - aplicația funcționează fără login
      throw new Error('Unauthorized');
    }

    const data = await response.json();
    return { data };
  },

  put: async (endpoint: string, body?: any) => {
    const data = await apiCall(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  },

  delete: async (endpoint: string) => {
    const data = await apiCall(endpoint, { method: 'DELETE' });
    return { data };
  },
};

export default api;
export { API_BASE_URL };

export function getToken() {
  return localStorage.getItem('token');
}

export function getUser() {
  const user = localStorage.getItem('user');
  if (!user) return null;

  const parsed = JSON.parse(user);
  // Handle nested user object from /auth/me response
  return parsed.user || parsed;
}

export function setAuth(token: string, user: any) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

// Debouncing and caching for token verification
let verificationPromise: Promise<boolean> | null = null;
let lastVerificationTime = 0;
const VERIFICATION_CACHE_TIME = 30000; // 30 seconds cache

// Verify token is still valid by calling /auth/me
export async function verifyToken(): Promise<boolean> {
  const token = localStorage.getItem('token');
  if (!token) return false;

  // Return cached result if recent verification
  const now = Date.now();
  if (now - lastVerificationTime < VERIFICATION_CACHE_TIME && verificationPromise) {
    console.log('[Auth] Using cached verification result');
    return verificationPromise;
  }

  // If verification is already in progress, return existing promise
  if (verificationPromise) {
    console.log('[Auth] Verification already in progress, waiting...');
    return verificationPromise;
  }

  // Start new verification
  console.log('[Auth] Starting new token verification');
  verificationPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        console.log('[Auth] Token invalid (401), clearing auth');
        clearAuth();
        verificationPromise = null;
        return false;
      }

      if (response.ok) {
        const data = await response.json();
        // Extract user from { user: {...} } response
        const user = data.user || data;
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(user));
        lastVerificationTime = Date.now();
        console.log('[Auth] Token verified successfully');

        // Clear promise after a delay to allow caching
        setTimeout(() => {
          verificationPromise = null;
        }, VERIFICATION_CACHE_TIME);

        return true;
      }

      console.log('[Auth] Token verification failed with status:', response.status);
      verificationPromise = null;
      return false;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[Auth] Token verification timeout');
      } else {
        console.error('[Auth] Token verification failed:', error);
      }
      verificationPromise = null;
      return false;
    }
  })();

  return verificationPromise;
}
