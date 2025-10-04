import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Smile, 
  Phone, 
  Video, 
  MoreVertical,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import { User, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import EmojiPicker from "@/components/chat/emoji-picker";

interface ChatContentProps {
  chatUser: User;
}

function ChatContent({ chatUser }: ChatContentProps) {
  const { user: currentUser } = useAuth();
  const { sendMessage, sendTyping, typingUsers, isConnected, openChatWindow, closeChatWindow } = useSocket();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", chatUser.id, "messages"],
    enabled: !!chatUser.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    if (chatUser.id) {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", chatUser.id, "messages"] 
      });
      
      openChatWindow(chatUser.id);
    }
    
    return () => {
      if (chatUser.id) {
        closeChatWindow(chatUser.id);
      }
    };
  }, [chatUser.id, queryClient, openChatWindow, closeChatWindow]);

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      
      const isRelevantMessage = (
        (message.senderId === chatUser.id && message.receiverId === currentUser?.id) ||
        (message.senderId === currentUser?.id && message.receiverId === chatUser.id)
      );
      
      if (isRelevantMessage) {
        queryClient.setQueryData(
          ["/api/conversations", chatUser.id, "messages"],
          (oldMessages: Message[] = []) => {
            const messageExists = oldMessages.some(m => m.id === message.id);
            if (messageExists) return oldMessages;
            
            return [...oldMessages, message];
          }
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    const handleMessageConfirmed = (event: CustomEvent) => {
      const { message } = event.detail;
      
      const isRelevantMessage = (
        (message.senderId === chatUser.id && message.receiverId === currentUser?.id) ||
        (message.senderId === currentUser?.id && message.receiverId === chatUser.id)
      );
      
      if (isRelevantMessage) {
        queryClient.setQueryData(
          ["/api/conversations", chatUser.id, "messages"],
          (oldMessages: Message[] = []) => {
            const messageExists = oldMessages.some(m => m.id === message.id);
            if (messageExists) return oldMessages;
            
            return [...oldMessages, message];
          }
        );
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('messageConfirmed', handleMessageConfirmed as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('messageConfirmed', handleMessageConfirmed as EventListener);
    };
  }, [chatUser.id, currentUser?.id, queryClient]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !isConnected) return;

    sendMessage(chatUser.id, messageText.trim());
    setMessageText("");
    
    if (isTyping) {
      sendTyping(chatUser.id, false);
      setIsTyping(false);
    }
  };

  const handleTyping = (text: string) => {
    setMessageText(text);

    if (!isConnected) return;

    if (!isTyping && text.trim()) {
      sendTyping(chatUser.id, true);
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        sendTyping(chatUser.id, false);
        setIsTyping(false);
      }
    }, 2000);
  };

  const imageUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('messageImage', file);
      const res = await fetch('/api/upload/message', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      sendMessage(chatUser.id, undefined, data.imageUrl);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      imageUploadMutation.mutate(file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
    const date = formatDate(message.timestamp!);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background/50 via-background to-muted/20">
      <ScrollArea className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-8" ref={scrollAreaRef}>
        <div className="w-full max-w-full lg:max-w-6xl mx-auto space-y-2 pb-8">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              <div className="flex items-center justify-center my-8">
                <div className="bg-card/90 backdrop-blur-md border border-border/50 shadow-md text-muted-foreground px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wide">
                  {date}
                </div>
              </div>

              <div className="space-y-4">
                {dateMessages.map((message, index) => {
                  const isOwn = message.senderId === currentUser?.id;
                  const showAvatar = !isOwn && (
                    index === dateMessages.length - 1 || 
                    dateMessages[index + 1]?.senderId !== message.senderId
                  );

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-2 sm:gap-2.5 max-w-[85%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%] animate-in fade-in-0 slide-in-from-bottom-3 duration-300",
                        isOwn ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {!isOwn && (
                        <div className="flex-shrink-0 mb-1">
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-background shadow-md ring-1 ring-primary/10">
                              <AvatarImage src={chatUser.profilePhoto || ""} />
                              <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/30">
                                {chatUser.firstName[0]}{chatUser.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-8 w-8 sm:h-9 sm:w-9" />
                          )}
                        </div>
                      )}

                      <div className={cn(
                        "flex flex-col gap-1.5 min-w-0",
                        isOwn ? "items-end" : "items-start"
                      )}>
                        <div
                          className={cn(
                            "group relative rounded-2xl px-4 py-3 break-words shadow-md transition-all duration-200 hover:shadow-lg",
                            isOwn 
                              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md" 
                              : "bg-card text-card-foreground border border-border/60 rounded-bl-md backdrop-blur-sm"
                          )}
                        >
                          {message.imageUrl ? (
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-xl group/image">
                                <img 
                                  src={message.imageUrl} 
                                  alt="Shared image"
                                  loading="lazy"
                                  className="max-w-[280px] max-h-[280px] sm:max-w-[300px] sm:max-h-[300px] w-auto h-auto object-cover cursor-pointer rounded-lg transition-all duration-300 group-hover/image:scale-105 group-hover/image:shadow-xl"
                                  onClick={() => window.open(message.imageUrl!, '_blank')}
                                />
                              </div>
                              {message.content && (
                                <p className="text-sm leading-relaxed mt-2">{message.content}</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          )}
                        </div>
                        
                        <span className={cn(
                          "text-xs text-muted-foreground/70 px-1 font-medium",
                          isOwn ? "text-right" : "text-left"
                        )}>
                          {formatTime(message.timestamp!)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {typingUsers[chatUser.id] && (
            <div className="flex items-end gap-2 sm:gap-2.5 max-w-[75%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] animate-in fade-in-0 slide-in-from-bottom-3 duration-300">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 mb-1 border-2 border-background shadow-md ring-1 ring-primary/10">
                <AvatarImage src={chatUser.profilePhoto || ""} />
                <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/30">
                  {chatUser.firstName[0]}{chatUser.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-6 py-3.5 shadow-md backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-duration:1s]"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-duration:1s]" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-duration:1s]" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-border/50 bg-card/95 backdrop-blur-md p-3 sm:p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] flex-shrink-0">
        <div className="w-full max-w-full lg:max-w-6xl mx-auto">
          <div className="flex items-end gap-2 sm:gap-2.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0 h-10 w-10 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 transition-all hover:scale-105 active:scale-95 mb-0.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected || imageUploadMutation.isPending}
            >
              {imageUploadMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Paperclip className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </Button>
            
            <div className="flex-1 relative min-w-0">
              <Textarea
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="min-h-[42px] sm:min-h-[44px] max-h-32 resize-none pr-11 sm:pr-12 py-2.5 sm:py-2.5 px-4 sm:px-4 rounded-2xl border-border/50 focus:border-primary/50 bg-card shadow-sm transition-all focus:shadow-md text-sm sm:text-base leading-normal"
                disabled={!isConnected}
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-primary/10 transition-all hover:scale-105 active:scale-95"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={!isConnected}
              >
                <Smile className="h-[18px] w-[18px] sm:h-5 sm:w-5 text-muted-foreground hover:text-primary transition-colors" />
              </Button>
              
              {showEmojiPicker && (
                <EmojiPicker
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
            
            <Button 
              onClick={handleSendMessage}
              disabled={!messageText.trim() || !isConnected}
              size="icon"
              className="flex-shrink-0 h-10 w-10 sm:h-10 sm:w-10 rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 mb-0.5"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />
          
          {!isConnected && (
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground/70 font-medium">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Connecting to chat...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatUser = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const userData = await response.json();
          setChatUser(userData);
        } else {
          console.error("Failed to fetch chat user");
        }
      } catch (error) {
        console.error("Error fetching chat user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChatUser();
  }, [userId]);

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-medium">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chatUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="text-center space-y-4 px-4">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-2xl">😕</span>
          </div>
          <h3 className="text-lg font-semibold">User not found</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">This user could not be loaded. They may have been removed or the link is incorrect.</p>
          <Button onClick={() => setLocation("/discover")} className="mt-4 rounded-full shadow-md hover:shadow-lg transition-all">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-background via-background to-muted/30 pb-16">
      <div className="border-b bg-card/95 backdrop-blur-md shadow-md flex-shrink-0">
        <div className="w-full max-w-full px-3 py-3 sm:px-4 sm:py-3.5 lg:max-w-6xl lg:mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLocation(`/profile/${chatUser.id}`)}>
              <div className="relative flex-shrink-0">
                <Avatar className="h-10 w-10 sm:h-11 sm:w-11 border-2 border-background shadow-md">
                  <AvatarImage src={chatUser.profilePhoto || ""} />
                  <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/30">
                    {chatUser.firstName[0]}{chatUser.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                {chatUser.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-card rounded-full ring-2 ring-background animate-pulse"></div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base truncate leading-tight">
                  {chatUser.firstName} {chatUser.lastName}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {chatUser.isOnline ? (
                    <span className="text-green-600 dark:text-green-500 font-medium">Online</span>
                  ) : (
                    <span>{chatUser.age} · {chatUser.location || 'Location not set'}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 transition-colors">
              <Phone className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 transition-colors">
              <Video className="h-5 w-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-primary/10 transition-colors">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        <ChatContent chatUser={chatUser} />
      </div>
    </div>
  );
}
