export type UserRole = "entrepreneur" | "investor"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string
  bio: string
  location?: string
  website?: string
  linkedin?: string
  twitter?: string
  isOnline?: boolean
  createdAt: string
  lastSeen?: string
  twoFactorEnabled?: boolean
}

export interface Entrepreneur extends User {
  role: "entrepreneur"
  startupName: string
  pitchSummary: string
  fundingNeeded: string
  industry: string
  foundedYear: number
  teamSize: number
  // For populated fields
  website?: string
  linkedin?: string
}

export interface Investor extends User {
  role: "investor"
  investmentInterests: string[]
  investmentStage: string[]
  portfolioCompanies: string[]
  totalInvestments: number
  minimumInvestment: string
  maximumInvestment: string
  location: string
}

export interface MessageUser {
  id: string
  name: string
  avatarUrl: string
  email?: string
  role?: UserRole
  bio?: string
  createdAt?: Date
  isOnline?: boolean
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  isRead: boolean
  messageType: "text" | "image" | "document" | "system"
  readAt?: string
  isEdited: boolean
  editedAt?: string
  replyTo?: string
  conversationId: string
  createdAt: string
  // For populated fields
  sender?: MessageUser
  receiver?: MessageUser
  isEncrypted?: boolean
}

export interface ChatConversation {
  id: string
  participants: string[]
  lastMessage?: Message
  updatedAt: Date
  unreadCount: number
  otherUser: MessageUser
}

export interface CollaborationRequest {
  id: string
  investorId: string
  entrepreneurId: string
  message: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string
  requestType: "investment" | "mentorship" | "partnership" | "advisory"
  proposedAmount?: string
  proposedTerms?: string
  respondedAt?: string
  responseMessage?: string
  meetingScheduled?: boolean
  meetingDetails?: MeetingDetails
}

export interface MeetingDetails {
  scheduledFor: string
  duration: number
  location?: string
  meetingLink?: string
  agenda?: string
  status: "pending" | "confirmed" | "cancelled" | "completed"
  createdBy: string
  participants: MeetingParticipant[]
  calendarEventId?: string
}

export interface MeetingParticipant {
  userId: string
  response: "pending" | "accepted" | "rejected" | "tentative"
  responseAt?: string
}

export interface Document {
  id: string
  name: string
  type: string
  size: string
  lastModified: string
  shared: boolean
  url: string
  ownerId: string
}

export interface AuthContextType {
  user: User | null
  login: (email: string, password: string, role: UserRole) => Promise<void>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  updateProfile: (userId: string, updates: Partial<User>) => Promise<void>
  isAuthenticated: boolean
  isLoading: boolean
  changePassword?: (currentPassword: string, newPassword: string) => Promise<void>
  enable2FA?: () => Promise<void>
  disable2FA?: (password: string) => Promise<void>
  uploadAvatar?: (file: File) => Promise<void>
}

export interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalMessages: number
  hasNext: boolean
  hasPrev: boolean
}


// Deal types used by Deals page & service
export type DealStatus = "Due Diligence" | "Term Sheet" | "Negotiation" | "Closed" | "Passed"

export interface Deal {
  _id: string
  investorId: string
  startup: {
    name: string
    logo?: string
    industry?: string
  }
  amount: string
  equity: string
  status: DealStatus
  stage?: string
  lastActivity: string | Date
  createdAt?: string
  updatedAt?: string
}

