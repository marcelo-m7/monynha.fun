import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, MessageCircle, Send } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/useAuth';
import {
  useConversation,
  useInboxConversations,
  useMarkConversationAsRead,
  useSendDirectMessage,
} from '@/features/messages';
import { useTranslation } from 'react-i18next';

const MAX_MESSAGE_LENGTH = 1000;

const Messages = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUsername = searchParams.get('with') || undefined;

  const { data: conversations = [], isLoading: conversationsLoading } = useInboxConversations();
  const { data: messages = [], isLoading: messagesLoading } = useConversation(selectedUsername);
  const sendMessage = useSendDirectMessage();
  const markConversationAsRead = useMarkConversationAsRead();

  const [content, setContent] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!selectedUsername || messages.length === 0) return;

    const hasUnreadFromPartner = messages.some((message) => !message.isMine && !message.isRead);
    if (hasUnreadFromPartner) {
      markConversationAsRead.mutate({ otherUsername: selectedUsername });
    }
  }, [markConversationAsRead, messages, selectedUsername]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.partnerUsername === selectedUsername),
    [conversations, selectedUsername],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUsername || !content.trim()) return;

    await sendMessage.mutateAsync({
      receiverUsername: selectedUsername,
      content: content.trim(),
    });

    setContent('');
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('messages.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('messages.description')}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <Card className="h-[70vh]">
            <CardHeader>
              <CardTitle className="text-lg">{t('messages.inbox')}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(70vh-74px)]">
                {conversationsLoading ? (
                  <div className="p-6 text-muted-foreground text-sm">{t('common.loading')}</div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-muted-foreground text-sm">{t('messages.emptyInbox')}</div>
                ) : (
                  <div className="divide-y divide-border">
                    {conversations.map((conversation) => {
                      const isSelected = conversation.partnerUsername === selectedUsername;
                      return (
                        <button
                          key={conversation.partnerUsername}
                          type="button"
                          className={`w-full text-left p-4 transition-colors ${
                            isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSearchParams({ with: conversation.partnerUsername })}
                        >
                          <div className="flex gap-3 items-start">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={conversation.partnerAvatarUrl || undefined} alt={conversation.partnerDisplayName || conversation.partnerUsername} />
                              <AvatarFallback>
                                {(conversation.partnerDisplayName || conversation.partnerUsername).slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{conversation.partnerDisplayName || conversation.partnerUsername}</p>
                              <p className="text-xs text-muted-foreground truncate">@{conversation.partnerUsername}</p>
                              <p className="text-sm text-muted-foreground mt-1 truncate">{conversation.lastMessageContent}</p>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <span className="text-xs font-bold rounded-full min-w-6 h-6 px-2 bg-primary text-primary-foreground inline-flex items-center justify-center">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="h-[70vh] flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedConversation ? (
                  <span>
                    {selectedConversation.partnerDisplayName || selectedConversation.partnerUsername}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      @{selectedConversation.partnerUsername}
                    </span>
                  </span>
                ) : (
                  t('messages.selectConversation')
                )}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
              {!selectedUsername ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                  <MessageCircle className="h-14 w-14 mb-4 opacity-60" />
                  <p className="font-medium">{t('messages.selectConversation')}</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 px-4 py-4">
                    {messagesLoading ? (
                      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                    ) : messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground">{t('messages.emptyConversation')}</div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                message.isMine
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted rounded-bl-md'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <Separator />
                  <form onSubmit={onSubmit} className="p-4 flex gap-2">
                    <Input
                      value={content}
                      onChange={(event) => setContent(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                      placeholder={t('messages.inputPlaceholder')}
                      maxLength={MAX_MESSAGE_LENGTH}
                      disabled={sendMessage.isPending}
                    />
                    <Button type="submit" disabled={!content.trim() || sendMessage.isPending}>
                      {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {!selectedUsername && (
          <p className="text-sm text-muted-foreground">
            {t('messages.tipPrefix')}{' '}
            <Link className="text-primary hover:underline" to="/community">
              {t('messages.tipLink')}
            </Link>
            .
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
