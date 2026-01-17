/**
 * NEXUS PLATFORM - MAIN APP ENTRY
 * Facilitates routing and global state management for the entire project.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { SocketProvider } from "./context/SocketContext"
import { NotificationProvider } from "./context/NotificationContext"
import { IncomingCallModal } from "./components/call/IncomingCallModal"
import { useCallManager } from "./hooks/useCallManager"

// Layouts
import { DashboardLayout } from "./components/layout/DashboardLayout"

// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage"
import { RegisterPage } from "./pages/auth/RegisterPage"

// Dashboard Pages
import { EntrepreneurDashboard } from "./pages/dashboard/EntrepreneurDashboard"
import { InvestorDashboard } from "./pages/dashboard/InvestorDashboard"

// Profile Pages
import { EntrepreneurProfile } from "./pages/profile/EntrepreneurProfile"
import { InvestorProfile } from "./pages/profile/InvestorProfile"

// Feature Pages
import { InvestorsPage } from "./pages/investors/InvestorsPage"
import { EntrepreneursPage } from "./pages/entrepreneurs/EntrepreneursPage"
import { MessagesPage } from "./pages/messages/MessagesPage"
import { NotificationsPage } from "./pages/notifications/NotificationsPage"
import { DocumentsPage } from "./pages/documents/DocumentsPage"
import { SettingsPage } from "./pages/settings/SettingsPage"
import { HelpPage } from "./pages/help/HelpPage"
import { DealsPage } from "./pages/deals/DealsPage"
import { CallPage } from "./pages/calls/CallPage"
import { FullScreenCallPage } from "./pages/calls/FullScreenCallPage"
import { WalletPage } from "./pages/Wallet/WalletPage"

// Chat Pages
import { ChatPage } from "./pages/chat/ChatPage"

/**
 * AppContent Component:
 * Handles the actual routing and the global Call Modal.
 */
function AppContent() {
  // Milestone 4: Call manager logic for real-time signaling
  const { incomingCall, acceptCall, declineCall } = useCallManager()

  return (
    <>
      <Routes>
        {/* --- AUTHENTICATION ROUTES (Milestone 2) --- */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* --- DASHBOARD ROUTES (Milestone 2 & 8) --- */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
          <Route path="investor" element={<InvestorDashboard />} />
        </Route>

        {/* --- PROFILE ROUTES (Fixes User Not Found) --- */}
        <Route path="/profile" element={<DashboardLayout />}>
          <Route path="entrepreneur/:id" element={<EntrepreneurProfile />} />
          <Route path="investor/:id" element={<InvestorProfile />} />
        </Route>

        {/* --- COLLABORATION FEATURES (Milestones 3, 5, 6) --- */}
        <Route element={<DashboardLayout />}>
          <Route path="/investors" element={<InvestorsPage />} />
          <Route path="/entrepreneurs" element={<EntrepreneursPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/deals" element={<DealsPage />} />
          
          {/* Chat Integration */}
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:userId" element={<ChatPage />} />
        </Route>

        {/* --- VIDEO CALL ROUTES (Milestone 4) --- */}
        {/* Full-screen UI for active calls */}
        <Route path="/calls/audio/:roomId/:userId" element={<FullScreenCallPage callType="audio" />} />
        <Route path="/calls/video/:roomId/:userId" element={<FullScreenCallPage callType="video" />} />
        
        {/* Room Join Logic */}
        <Route path="/calls/:roomId" element={<CallPage />} />
        <Route path="/calls" element={<DashboardLayout />}>
          <Route path=":roomId" element={<CallPage />} />
        </Route>

        {/* --- REDIRECTS --- */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* Real-time Video Call Notification Layer */}
      {incomingCall && (
        <IncomingCallModal
          caller={incomingCall.caller}
          callType={incomingCall.callType}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
    </>
  )
}

/**
 * Root App Provider Wrapper:
 * Standardizes the order of global state providers for the internship submission.
 */
function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App;