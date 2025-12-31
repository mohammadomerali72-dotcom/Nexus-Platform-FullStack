export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    VERIFY_EMAIL: "/auth/verify-email",
  },
  USERS: {
    PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/profile",
    AVATAR: (userId: string) => `/users/${userId}/avatar`,
    SEARCH: "/users/search",
    ENTREPRENEURS: "/users/entrepreneurs",
    INVESTORS: "/users/investors",
    BY_ID: (userId: string) => `/users/${userId}`,
  },
  PROFILES: {
    ENTREPRENEUR: (userId?: string) => (userId ? `/profiles/entrepreneur/${userId}` : "/profiles/entrepreneur"),
    INVESTOR: (userId?: string) => (userId ? `/profiles/investor/${userId}` : "/profiles/investor"),
    ENTREPRENEUR_DOCUMENTS: (userId: string) => `/profiles/entrepreneur/${userId}/documents`,
    INVESTOR_PORTFOLIO: (userId: string) => `/profiles/investor/${userId}/portfolio`,
    STATS: "/profiles/stats",
  },
  MESSAGES: {
    CONVERSATIONS: "/messages/conversations",
    BY_USER: (userId: string) => `/messages/user/${userId}`,
    SEND: "/messages/send",
    MARK_READ: (messageId: string) => `/messages/${messageId}/read`,
  },
  COLLABORATIONS: {
    REQUEST: "/collaborations/request",
    REQUESTS: "/collaborations/requests",
    // backend expects /collaborations/requests/:requestId/accept|reject
    ACCEPT: (requestId: string) => `/collaborations/requests/${requestId}/accept`,
    REJECT: (requestId: string) => `/collaborations/requests/${requestId}/reject`,
  },
}


