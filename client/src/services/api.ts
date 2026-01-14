import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

/**
 * NEXUS PLATFORM - CORE API SERVICE
 * Connects React Frontend (5173) to Node.js Backend (5000)
 */

const api = axios.create({
  // Use Vercel/Render env variables in production, or localhost for XAMPP testing
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 15000, 
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Helper: Validates and cleans the JWT token from LocalStorage
 * Prevents "Invalid Token" errors in the Backend
 */
const getValidToken = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  // Remove whitespace or accidental quotes added by some browsers
  const cleaned = token.trim().replace(/^["']|["']$/g, "");

  // Basic check: JWT must have 3 parts (header.payload.signature)
  if (cleaned.split(".").length !== 3) {
    localStorage.clear(); // Clear corrupted session
    return null;
  }
  return cleaned;
};

/**
 * REQUEST INTERCEPTOR
 * Automatically attaches the 'Bearer Token' to every outgoing call.
 * This makes Milestone 3 (Meetings) and Milestone 6 (Payments) work securely.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getValidToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 * Handles global success/error logic for the entire platform.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    
    // 1. Handle Network/Connection Errors (Backend terminal is closed)
    if (!error.response) {
      return Promise.reject(
        new Error("Backend Unreachable: Please ensure XAMPP is active and 'node index.js' is running.")
      );
    }

    // 2. Handle Milestone 7 Security (Expired or Unauthorized Session)
    if (error.response.status === 401) {
      console.warn("Security Alert: Session expired or invalid token.");
      
      // Clear all keys used by the Nexus template
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      localStorage.removeItem("userName");

      // Stop any infinite loops by only redirecting if not already on Login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;