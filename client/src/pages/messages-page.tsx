import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Clock, Send, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { User, Conversation, Message } from "@shared/schema";

interface ConversationWithDetails extends Conversation {
  otherUser: User;
  lastMessage?: Message;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Listen for real-time WebSocket events
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      // Refresh conversations when new message arrives
      fetchConversations();
    };

    const handleOnlineStatusChanged = () => {
      // Refresh conversations to update online status
      fetchConversations();
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);
    };
  }, []);

  if (!user) return null;

  const ConversationCard = ({ conversation }: { conversation: ConversationWithDetails }) => (
    <Link href={`/chat/${conversation.otherUser.id}`} className="block">
      <Card className="hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.otherUser.profilePhoto || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                  {conversation.otherUser.firstName[0]}{conversation.otherUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              {conversation.otherUser.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full"></div>
              )}
            </div>

            {/* Message Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm truncate">
                  {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                </h3>
                <div className="flex items-center space-x-2">
                  {conversation.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.lastMessage.timestamp!), { addSuffix: true })}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {conversation.otherUser.age}
                  </Badge>
                </div>
              </div>

              {/* Last Message Preview */}
              {conversation.lastMessage ? (
                <div className="flex items-center space-x-2">
                  {conversation.lastMessage.senderId === user.id ? (
                    <Send className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <MessageCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage.imageUrl ? (
                      <span className="italic">📷 Photo</span>
                    ) : (
                      conversation.lastMessage.content
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No messages yet</p>
              )}

              {/* Location */}
              {conversation.otherUser.location && (
                <p className="text-xs text-muted-foreground mt-1">
                  📍 {conversation.otherUser.location}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your messages...</p>
        </div>
      </div>
    );
  }

  // Filter conversations for tabs
  const allConversations = conversations;
  const unreadConversations = conversations.filter(conv => 
    conv.lastMessage && conv.lastMessage.senderId !== user.id
  );
  const sentConversations = conversations.filter(conv => 
    conv.lastMessage && conv.lastMessage.senderId === user.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="p-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground">{conversations.length} conversations</p>
        </div>
      </div>

      {/* Messages Content */}
      <div className="p-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              All ({allConversations.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unread ({unreadConversations.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent ({sentConversations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {allConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground">Start discovering people and begin chatting!</p>
              </div>
            ) : (
              allConversations.map((conversation) => (
                <ConversationCard key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-3">
            {unreadConversations.length === 0 ? (
              <div className="text-center py-12">
                <CheckCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No unread messages</p>
              </div>
            ) : (
              unreadConversations.map((conversation) => (
                <ConversationCard key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-3">
            {sentConversations.length === 0 ? (
              <div className="text-center py-12">
                <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sent messages</h3>
                <p className="text-muted-foreground">Start a conversation!</p>
              </div>
            ) : (
              sentConversations.map((conversation) => (
                <ConversationCard key={conversation.id} conversation={conversation} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}