import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import {
  useConversation,
  useInboxConversations,
  useMarkConversationAsRead,
  useSendMessage,
} from '@/features/messages';
import { useProfileByUsername } from '@/features/profile/queries/useProfile';
import type { MessageProfile } from '@/entities/direct_message/direct_message.types';

const formatWhen = (isoDate: string) => {
  const date = new Date(isoDate);
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const profileName = (profile: MessageProfile) => profile.display_name || profile.username || 'Unknown user';

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedUsername = searchParams.get('user') || undefined;

  const { user, loading } = useAuth();
  const [selectedUsername, setSelectedUsername] = useState<string | undefined>(preselectedUsername);
  const [draft, setDraft] = useState('');

  const { data: inbox, isLoading: inboxLoading } = useInboxConversations();
  const { data: preselectedProfile } = useProfileByUsername(preselectedUsername);
  const { data: conversation, isLoading: conversationLoading } = useConversation(selectedUsername);

  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkConversationAsRead();

  const contacts = useMemo(() => {
    const map = new Map<string, MessageProfile>();

    inbox?.forEach((item) => map.set(item.partner.username, item.partner));

    if (preselectedProfile?.username) {
      map.set(preselectedProfile.username, {
        username: preselectedProfile.username,
        display_name: preselectedProfile.display_name,
        avatar_url: preselectedProfile.avatar_url,
      });
    }

    return [...map.values()];
  }, [inbox, preselectedProfile]);

  useEffect(() => {
    if (!selectedUsername && contacts.length > 0) {
      setSelectedUsername(contacts[0].username);
    }
  }, [contacts, selectedUsername]);

  useEffect(() => {
    if (!selectedUsername || !conversation || conversation.length === 0) return;
    markReadMutation.mutate({ otherUsername: selectedUsername });
  }, [selectedUsername, conversation, markReadMutation]);

  const selectedContact = contacts.find((contact) => contact.username === selectedUsername);

  const handleSend = async () => {
    if (!selectedUsername || !draft.trim()) return;
    await sendMessageMutation.mutateAsync({ receiverUsername: selectedUsername, content: draft });
    setDraft('');
  };

  if (loading || inboxLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container py-8 space-y-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
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
          <h1 className="text-3xl font-bold mb-4">Messages</h1>
          <p className="text-muted-foreground mb-8">You need to sign in to use direct messages.</p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">Private conversations with curators and community members.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[640px]">
          <Card className="p-0 overflow-hidden lg:col-span-1">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Contacts</h2>
            </div>
            <ScrollArea className="h-[580px]">
              <div className="p-2 space-y-1">
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">
                    No contacts yet. Follow users to start messaging.
                  </p>
                ) : (
                  contacts.map((contact) => {
                    const inboxItem = inbox?.find((item) => item.partner.username === contact.username);
                    const isActive = selectedUsername === contact.username;

                    return (
                      <button
                        key={contact.username}
                        type="button"
                        onClick={() => setSelectedUsername(contact.username)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={contact.avatar_url || undefined} alt={profileName(contact)} />
                            <AvatarFallback>{profileName(contact).charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{profileName(contact)}</p>
                            <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>
                          </div>
                          {inboxItem && inboxItem.unreadCount > 0 && (
                            <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                              {inboxItem.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="p-0 overflow-hidden lg:col-span-2 flex flex-col">
            {selectedContact ? (
              <>
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={selectedContact.avatar_url || undefined} alt={profileName(selectedContact)} />
                    <AvatarFallback>{profileName(selectedContact).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{profileName(selectedContact)}</p>
                    <p className="text-xs text-muted-foreground">@{selectedContact.username}</p>
                  </div>
                </div>

                <ScrollArea className="flex-1 h-[470px]">
                  <div className="p-4 space-y-3">
                    {conversationLoading ? (
                      Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : !conversation || conversation.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2" />
                        <p>No messages yet. Start the conversation.</p>
                      </div>
                    ) : (
                      conversation.map((message) => {
                        const isMine = message.is_mine;

                        return (
                          <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                                isMine
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-foreground border border-border'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                {formatWhen(message.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>

                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button onClick={handleSend} disabled={!draft.trim() || sendMessageMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <MessageCircle className="w-10 h-10 mb-3" />
                <p className="font-medium mb-1">Select a contact</p>
                <p className="text-sm">Choose someone from your contacts to start messaging.</p>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Messages;
