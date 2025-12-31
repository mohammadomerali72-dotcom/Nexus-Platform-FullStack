import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { SocketProvider } from "./context/SocketContext"
import { NotificationProvider } from "./context/NotificationContext" // Import NotificationProvider
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

function AppContent() {
  const { incomingCall, acceptCall, declineCall } = useCallManager()

  return (
    <>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="entrepreneur" element={<EntrepreneurDashboard />} />
          <Route path="investor" element={<InvestorDashboard />} />
        </Route>

        {/* Profile Routes */}
        <Route path="/profile" element={<DashboardLayout />}>
          <Route path="entrepreneur/:id" element={<EntrepreneurProfile />} />
          <Route path="investor/:id" element={<InvestorProfile />} />
        </Route>

        {/* Feature Routes */}
        <Route path="/investors" element={<DashboardLayout />}>
          <Route index element={<InvestorsPage />} />
        </Route>

        <Route path="/entrepreneurs" element={<DashboardLayout />}>
          <Route index element={<EntrepreneursPage />} />
        </Route>

        <Route path="/messages" element={<DashboardLayout />}>
          <Route index element={<MessagesPage />} />
        </Route>

        <Route path="/notifications" element={<DashboardLayout />}>
          <Route index element={<NotificationsPage />} />
        </Route>

        <Route path="/documents" element={<DashboardLayout />}>
          <Route index element={<DocumentsPage />} />
        </Route>

        <Route path="/wallet" element={<DashboardLayout />}>
          <Route index element={<WalletPage />} />
        </Route>

        <Route path="/settings" element={<DashboardLayout />}>
          <Route index element={<SettingsPage />} />
        </Route>

        <Route path="/help" element={<DashboardLayout />}>
          <Route index element={<HelpPage />} />
        </Route>

        <Route path="/deals" element={<DashboardLayout />}>
          <Route index element={<DealsPage />} />
        </Route>

        {/* Chat Routes */}
        <Route path="/chat" element={<DashboardLayout />}>
          <Route index element={<ChatPage />} />
          <Route path=":userId" element={<ChatPage />} />
        </Route>

        {/* Full-screen call routes (no layout) */}
        <Route path="/calls/audio/:roomId/:userId" element={<FullScreenCallPage callType="audio" />} />
        <Route path="/calls/video/:roomId/:userId" element={<FullScreenCallPage callType="video" />} />

        {/* Legacy call routes (with layout) */}
        <Route path="/calls/:roomId" element={<CallPage />} />
        <Route path="/calls" element={<DashboardLayout />}>
          <Route path=":roomId" element={<CallPage />} />
        </Route>

        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch all other routes and redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

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

function App() {
  return (
    <AuthProvider>
      <NotificationProvider> {/* Add NotificationProvider here */}
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </NotificationProvider> {/* Close NotificationProvider here */}
    </AuthProvider>
  )
}

export default App

