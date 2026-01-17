/**
 * NEXUS PLATFORM - CORE API SERVICE
 * Connects the React Frontend (5173) to the Node.js/XAMPP Backend (5000)
 */

import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

// 1. Create the Axios instance
const api = axios.create({
  // Default to Port 5000 where your Node.js/XAMPP server is running
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 30000, // 30 seconds to allow for business PDF uploads
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Helper: Sanitizes the JWT token to prevent header corruption.
 * Removes whitespace or accidental quotes added by different browsers.
 */
const getCleanToken = (): string | null => {
  const rawToken = localStorage.getItem("token");
  if (!rawToken) return null;

  const cleaned = rawToken.trim().replace(/^["']|["']$/g, "");

  // Milestone 7 Security: Basic validation of JWT structure
  if (cleaned.split(".").length !== 3) {
    console.error("Auth System: Invalid token format. Session wiped.");
    localStorage.clear();
    return null;
  }
  return cleaned;
};

/**
 * REQUEST INTERCEPTOR
 * Automatically attaches the security token and manages content types.
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getCleanToken();
    
    if (token && config.headers) {
      // Attaches the 'Bearer' token for all authorized routes (Meetings, Payments, etc.)
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Milestone 5: Automatic support for Multer file uploads (Pitch Decks)
    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR
 * Global error handler for connection issues and session expiry.
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    
    // 1. Handle Connectivity Issues (If Backend or XAMPP is offline)
    if (!error.response) {
      return Promise.reject(
        new Error("System Offline: Ensure XAMPP is active and 'node index.js' is running in your terminal.")
      );
    }

    // 2. Handle Milestone 7 Security: 401 Unauthorized (Invalid or Expired Session)
    if (error.response.status === 401) {
      console.warn("Security Alert: Unauthorized access detected. Wiping session.");
      
      // Clear all session data to protect user privacy
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      localStorage.removeItem("userName");

      // THE LOOP BREAKER: Only redirect if the user isn't already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;