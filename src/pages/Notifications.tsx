import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, CheckCheck, ArrowLeft, MessageCircle, UserPlus } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/features/notifications';

const formatWhen = (isoDate: string) => {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_message':
      return <MessageCircle className="h-4 w-4 text-primary" />;
    case 'new_follower':
      return <UserPlus className="h-4 w-4 text-primary" />;
    default:
      return <Bell className="h-4 w-4 text-primary" />;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: notifications, isLoading } = useNotifications(100);
  const markOneAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 space-y-4">
          <Skeleton className="h-10 w-56" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Notifications</h1>
          <p className="text-muted-foreground mb-8">You need to sign in to view notifications.</p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const unreadCount = notifications?.filter((item) => !item.is_read).length ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            disabled={unreadCount === 0 || markAllAsRead.isPending}
            onClick={() => markAllAsRead.mutate()}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        {!notifications || notifications.length === 0 ? (
          <Card className="p-10 text-center">
            <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No notifications yet</h2>
            <p className="text-muted-foreground">When someone follows you or sends a message, it will show up here.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 transition-colors ${notification.is_read ? 'bg-card' : 'bg-primary/5 border-primary/30'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.actor?.avatar_url || undefined} alt={notification.actor?.username || 'actor'} />
                      <AvatarFallback>
                        {notification.actor?.display_name?.charAt(0)?.toUpperCase() || notification.actor?.username?.charAt(0)?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getNotificationIcon(notification.type)}
                        <h3 className="font-semibold text-sm">{notification.title}</h3>
                        {!notification.is_read && <Badge variant="secondary">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{formatWhen(notification.created_at)}</p>
                    </div>
                  </div>

                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markOneAsRead.mutate(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
