"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Bell, MessageCircle, UserPlus, DollarSign, Calendar, Phone, Eye, EyeOff } from "lucide-react"
import { Card, CardBody } from "../../components/ui/Card"
import { Avatar } from "../../components/ui/Avatar"
import { Badge } from "../../components/ui/Badge"
import { Button } from "../../components/ui/Button"
import NotificationService, { type Notification } from "../../services/notificationService"
import { useNotifications } from "../../context/NotificationContext" // Import the hook

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [markingAsReadId, setMarkingAsReadId] = useState<string | null>(null)
  
  // Use the notification context
  const { unreadCount, decrementUnreadCount, resetUnreadCount } = useNotifications()

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await NotificationService.getNotifications()
      if (response.success) {
        setNotifications(response.data.notifications ?? [])
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      setMarkingAsReadId(notificationId)
      const result = await NotificationService.markAsRead(notificationId)
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId
              ? { ...notification, status: "read", readAt: new Date().toISOString() }
              : notification,
          ),
        )
        // Update the global unread count
        decrementUnreadCount()
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    } finally {
      setMarkingAsReadId(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAllRead(true)
      const result = await NotificationService.markAllAsRead()
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) => ({
            ...notification,
            status: "read" as const,
            readAt: new Date().toISOString(),
          })),
        )
        // Reset the global unread count
        resetUnreadCount()
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle size={16} className="text-primary-600" />
      case "collaboration_request":
        return <UserPlus size={16} className="text-secondary-600" />
      case "connection":
        return <UserPlus size={16} className="text-secondary-600" />
      case "investment":
        return <DollarSign size={16} className="text-accent-600" />
      case "meeting":
        return <Calendar size={16} className="text-blue-600" />
      case "call":
        return <Phone size={16} className="text-green-600" />
      default:
        return <Bell size={16} className="text-gray-600" />
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Stay updated with your network activity</p>
          </div>
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardBody className="flex items-start p-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Stay updated with your network activity</p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} disabled={markingAllRead}>
            {markingAllRead ? "Marking..." : "Mark all as read"}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {(notifications?.length ?? 0) === 0 ? (
          <Card>
            <CardBody className="text-center py-12">
              <Bell size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-600">
                When you receive messages, collaboration requests, or other updates, they'll appear here.
              </p>
            </CardBody>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification._id}
              className={`transition-colors duration-200 ${
                notification.status === "new" ? "bg-primary-50 border-primary-200" : ""
              }`}
            >
              <CardBody className="flex items-start p-4">
                <Avatar
                  src={notification.senderId?.avatarUrl}
                  alt={notification.senderId?.name}
                  size="md"
                  className="flex-shrink-0 mr-4"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{notification.senderId?.name}</span>
                      {notification.status === "new" && (
                        <Badge variant="primary" size="sm" rounded>
                          New
                        </Badge>
                      )}
                    </div>
                    
                    {notification.status === "new" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification._id)}
                        disabled={markingAsReadId === notification._id}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                      >
                        <Eye size={14} />
                        {markingAsReadId === notification._id ? "Marking..." : "Mark read"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <EyeOff size={14} />
                        Read
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 mb-2">{notification.content}</p>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {getNotificationIcon(notification.type)}
                    <span>{formatTime(notification.createdAt)}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

