import { useState, useEffect } from "react"
import { Bell, Eye, Trash2, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { Notification } from "@shared/schema"

type NotificationWithUser = Notification & {
  fromUser: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
}

async function fetchNotifications(): Promise<NotificationWithUser[]> {
  const response = await fetch('/api/notifications', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
}

async function markNotificationAsRead(id: string) {
  const response = await fetch(`/api/notifications/mark-read/${id}`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
}

async function markAllNotificationsAsRead() {
  const response = await fetch('/api/notifications/mark-all-read', {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to mark all notifications as read');
}

async function deleteNotification(id: string) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to delete notification');
}

function formatTimeAgo(date: Date) {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  })

  useEffect(() => {
    const handleNotificationUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] })
    }

    window.addEventListener('notificationReceived', handleNotificationUpdate)
    window.addEventListener('notificationRead', handleNotificationUpdate)
    
    return () => {
      window.removeEventListener('notificationReceived', handleNotificationUpdate)
      window.removeEventListener('notificationRead', handleNotificationUpdate)
    }
  }, [queryClient])

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] })
    },
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] })
    },
  })

  const markAsRead = (id: string) => {
    markAsReadMutation.mutate(id)
  }
  
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }
  
  const deleteNotificationHandler = (id: string) => {
    deleteNotificationMutation.mutate(id)
  }
  
  const clearAll = () => {
    notifications.forEach(notification => {
      deleteNotificationMutation.mutate(notification.id)
    })
  }
  
  const unreadCount = notifications.filter(n => !n.isRead).length
  
  const getNotificationDescription = (notification: NotificationWithUser) => {
    switch (notification.type) {
      case 'profile_view':
        return `${notification.fromUser.firstName} viewed your profile.`
      case 'message_received':
        return `${notification.fromUser.firstName} sent you a message.`
      default:
        return 'New notification'
    }
  }

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case 'profile_view':
        return 'Profile View'
      case 'message_received':
        return 'New Message'
      default:
        return 'Notification'
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center space-x-3">
              <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <Bell className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto animate-pulse" />
            <p className="text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border/50">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center space-x-3">
              <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <Bell className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" />
            <p className="text-red-500 font-medium">Failed to load notifications</p>
            <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <div className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                  {unreadCount}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="rounded-full hover:bg-primary/10 hover:border-primary transition-all duration-200"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Mark all</span>
                </Button>
              )}
              {notifications.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAll}
                  className="rounded-full hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Clear all</span>
                  <span className="sm:hidden">Clear</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto py-4 sm:py-6">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center p-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold mb-2">No notifications</h2>
              <p className="text-muted-foreground max-w-sm text-sm sm:text-base">
                You're all caught up! New notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative rounded-2xl border transition-all duration-200 hover:shadow-lg ${
                    !notification.isRead 
                      ? "bg-primary/5 border-primary/20 shadow-md" 
                      : "bg-card/50 border-border/50 hover:bg-card/80"
                  }`}
                >
                  {/* Unread indicator badge */}
                  {!notification.isRead && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full ring-4 ring-background shadow-sm" />
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Profile Photo */}
                      <div className="flex-shrink-0">
                        <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-background shadow-sm">
                          <AvatarImage src={notification.fromUser.profilePhoto || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {notification.fromUser.firstName[0]}{notification.fromUser.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm sm:text-base text-foreground">
                              {getNotificationTitle(notification.type)}
                            </h3>
                            <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
                              {getNotificationDescription(notification)}
                            </p>
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground/80 whitespace-nowrap font-medium">
                            {formatTimeAgo(new Date(notification.createdAt!))}
                          </span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-200 text-xs sm:text-sm"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Mark read
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotificationHandler(notification.id)}
                            className="h-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all duration-200 text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
