import { Link, useLocation } from "wouter";
import { Users, MessageCircle, User, Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect } from "react";

const navItems = [
  {
    label: "Discover",
    icon: Search,
    path: "/discover",
  },
  {
    label: "Messages",
    icon: MessageCircle,
    path: "/messages",
  },
  {
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
    hasCounter: true,
  },
  {
    label: "Profile",
    icon: User,
    path: "/profile",
  },
];

function NotificationIcon({ isActive, unreadCount }: { isActive: boolean, unreadCount: number }) {
  return (
    <div className="relative">
      <Bell 
        className={cn(
          "h-5 w-5 transition-all duration-200",
          isActive ? "scale-110" : "scale-100"
        )} 
      />
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center min-w-[20px] shadow-lg">
          <span className="text-xs font-bold text-primary-foreground leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        </div>
      )}
    </div>
  )
}

export function BottomNavigation() {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 30000,
  });
  
  const unreadNotificationsCount = unreadData?.count || 0;

  useEffect(() => {
    const handleNotificationUpdate = () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/notifications/unread-count"] 
      });
    };

    window.addEventListener('notificationReceived', handleNotificationUpdate);
    window.addEventListener('notificationRead', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notificationReceived', handleNotificationUpdate);
      window.removeEventListener('notificationRead', handleNotificationUpdate);
    };
  }, [queryClient]);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 z-50 supports-[backdrop-filter]:bg-background/80"
      style={{ 
        paddingBottom: 'env(safe-area-inset-bottom)',
        marginBottom: '0',
        WebkitBackdropFilter: 'blur(12px)'
      }}
    >
      <div className="flex items-center justify-around max-w-screen-xl mx-auto px-2 sm:px-4">
        {navItems.map((item) => {
          const isActive = location === item.path || 
                         (item.path === "/" && location === "/") ||
                         (item.path !== "/" && location.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-3 px-2 rounded-lg transition-all duration-200",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.hasCounter ? (
                <NotificationIcon isActive={isActive} unreadCount={unreadNotificationsCount} />
              ) : (
                <item.icon 
                  className={cn(
                    "h-5 w-5 sm:h-6 sm:w-6 transition-all duration-200",
                    isActive ? "scale-110" : "scale-100"
                  )} 
                />
              )}
              <span className={cn(
                "text-[10px] sm:text-xs font-medium leading-tight",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
