import { useNotification } from "@/hooks/use-notification"
import { useLocation } from "wouter"
import {
  NotificationToast,
  NotificationProvider,
  NotificationViewport,
  NotificationIcon,
  NotificationContent,
  NotificationTitle,
  NotificationDescription,
  NotificationClose,
} from "@/components/ui/notification-toast"

export function NotificationToaster() {
  const { notifications, dismiss } = useNotification()
  const [, setLocation] = useLocation()

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/mark-read/${notificationId}`, {
        method: 'POST',
      });
      
      // Trigger a refresh of notification data
      window.dispatchEvent(new CustomEvent('notificationRead'));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if we have a notification ID
    if (notification.notificationId) {
      await markNotificationAsRead(notification.notificationId);
    }

    // Dismiss the toast
    dismiss(notification.id);

    // Navigate based on notification type
    if (notification.type === 'profile_view' && notification.fromUserId) {
      setLocation(`/profile/${notification.fromUserId}`);
    } else if (notification.type === 'message_received' && notification.fromUserId) {
      setLocation(`/chat/${notification.fromUserId}`);
    }
  }

  return (
    <NotificationProvider>
      {notifications.map((notification) => (
        <NotificationToast 
          key={notification.id} 
          variant={notification.type}
          open={notification.open}
          onOpenChange={notification.onOpenChange}
          className="cursor-pointer hover:shadow-xl transition-shadow duration-200"
          onClick={() => handleNotificationClick(notification)}
        >
          <NotificationIcon 
            type={notification.type} 
            fromUserPhoto={notification.fromUserPhoto}
            fromUserName={notification.fromUserName}
          />
          <NotificationContent>
            <NotificationTitle>{notification.title}</NotificationTitle>
            {notification.description && (
              <NotificationDescription>
                {notification.description}
              </NotificationDescription>
            )}
          </NotificationContent>
          <NotificationClose />
        </NotificationToast>
      ))}
      <NotificationViewport />
    </NotificationProvider>
  )
}