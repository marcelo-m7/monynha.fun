import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, MessageCircle, RefreshCw, Send } from 'lucide-react';
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
import { useCurrentUserProfile } from '@/features/profile/queries/useProfile';
import { useMetaTags } from '@/shared/hooks/useMetaTags';
import { useTranslation } from 'react-i18next';

const MAX_MESSAGE_LENGTH = 1000;

const Messages = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useMetaTags({
    title: `${t('messages.title')} | Tube O2`,
    description: t('messages.description'),
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUsername = searchParams.get('with') || undefined;

  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    isError: conversationsError,
    error: conversationsErrorDetails,
    refetch: refetchConversations,
  } = useInboxConversations();
  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
    error: messagesErrorDetails,
    refetch: refetchMessages,
  } = useConversation(selectedUsername);
  const { data: currentProfile } = useCurrentUserProfile();
  const sendMessage = useSendDirectMessage();
  const markConversationAsRead = useMarkConversationAsRead();

  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
  const isSelfConversation =
    !!selectedUsername &&
    !!currentProfile?.username &&
    selectedUsername.toLowerCase() === currentProfile.username.toLowerCase();
  const selectedLabel = selectedConversation?.partnerDisplayName || selectedConversation?.partnerUsername || selectedUsername;
  const remainingCharacters = MAX_MESSAGE_LENGTH - content.length;

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUsername || !content.trim() || isSelfConversation) return;

    try {
      await sendMessage.mutateAsync({
        receiverUsername: selectedUsername,
        content: content.trim(),
      });

      setContent('');
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
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
                ) : conversationsError ? (
                  <div className="space-y-4 p-6 text-sm">
                    <div className="flex items-start gap-3 text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">{t('messages.errorInbox')}</p>
                        {conversationsErrorDetails?.message && (
                          <p className="mt-1 text-muted-foreground">{conversationsErrorDetails.message}</p>
                        )}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => refetchConversations()}>
                      <RefreshCw className="h-4 w-4" />
                      {t('common.retry')}
                    </Button>
                  </div>
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
                {selectedUsername ? (
                  <span>
                    {selectedLabel}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      @{selectedUsername}
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
                    ) : messagesError ? (
                      <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3 text-destructive">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-medium">{t('messages.errorConversation')}</p>
                            {messagesErrorDetails?.message && (
                              <p className="mt-1 text-muted-foreground">{messagesErrorDetails.message}</p>
                            )}
                          </div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => refetchMessages()}>
                          <RefreshCw className="h-4 w-4" />
                          {t('common.retry')}
                        </Button>
                      </div>
                    ) : isSelfConversation ? (
                      <div className="text-sm text-muted-foreground">{t('messages.selfConversation')}</div>
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
                  <div className="p-4">
                    <form onSubmit={onSubmit} className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                        placeholder={isSelfConversation ? t('messages.selfConversation') : t('messages.inputPlaceholder')}
                        maxLength={MAX_MESSAGE_LENGTH}
                        disabled={sendMessage.isPending || isSelfConversation}
                        aria-describedby="message-character-count"
                      />
                      <Button
                        type="submit"
                        aria-label={t('messages.send')}
                        disabled={!content.trim() || sendMessage.isPending || isSelfConversation}
                      >
                        {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </form>
                    <p id="message-character-count" className="mt-2 text-right text-xs text-muted-foreground">
                      {t('messages.charactersRemaining', { count: remainingCharacters })}
                    </p>
                  </div>
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
