import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/useAuth';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
} from '@/features/notifications';
import { useTranslation } from 'react-i18next';

const PAGE_LIMIT = 100;

const Notifications = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useNotifications(PAGE_LIMIT);
  const markNotificationAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('notifications.title')}</h1>
            <p className="text-muted-foreground mt-2">{t('notifications.description')}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate({ limit: PAGE_LIMIT })}
            disabled={unreadCount === 0 || markAllAsRead.isPending}
          >
            {markAllAsRead.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCheck className="w-4 h-4 mr-2" />}
            {t('notifications.markAllAsRead')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('notifications.inbox')}</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="py-16 px-6 text-center text-muted-foreground">
                <Bell className="w-14 h-14 mx-auto mb-3 opacity-60" />
                <p>{t('notifications.empty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`p-4 md:p-5 ${notification.isRead ? 'bg-background' : 'bg-primary/5'}`}>
                    <div className="flex gap-3 items-start">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.actorAvatarUrl || undefined} alt={notification.actorDisplayName || notification.actorUsername || 'User'} />
                        <AvatarFallback>
                          {(notification.actorDisplayName || notification.actorUsername || '?').slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{notification.title}</p>
                        {notification.message && <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>}
                        {notification.actorUsername && (
                          <p className="text-xs text-muted-foreground mt-1">
                            @{notification.actorUsername}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => markNotificationAsRead.mutate({ notificationId: notification.id, limit: PAGE_LIMIT })}
                          disabled={markNotificationAsRead.isPending}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          {t('notifications.markAsRead')}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
