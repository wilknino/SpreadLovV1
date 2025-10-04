import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, Smile, Info, Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/hooks/use-socket";
import { User, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import EmojiPicker from "./emoji-picker";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  currentUser: User;
  selectedUser: User | null;
  onToggleUserInfo: () => void;
}

export default function ChatWindow({ currentUser, selectedUser, onToggleUserInfo }: ChatWindowProps) {
  const { sendMessage, sendTyping, typingUsers } = useSocket();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentSelectedUser, setCurrentSelectedUser] = useState(selectedUser);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/conversations", selectedUser?.id, "messages"],
    enabled: !!selectedUser,
  });

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
      if (selectedUser) {
        sendMessage(selectedUser.id, undefined, data.imageUrl);
      }
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when new messages arrive (but not during upload to prevent shifting)
  useEffect(() => {
    if (!imageUploadMutation.isPending) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, imageUploadMutation.isPending]);

  // Update currentSelectedUser when prop changes
  useEffect(() => {
    setCurrentSelectedUser(selectedUser);
  }, [selectedUser]);

  // Force refresh messages when selectedUser changes
  useEffect(() => {
    if (selectedUser?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", selectedUser.id, "messages"] 
      });
    }
  }, [selectedUser?.id, queryClient]);

  // Listen for real-time online status changes and refresh user data
  useEffect(() => {
    const handleOnlineStatusChanged = async (event: CustomEvent) => {
      const { userId, isOnline } = event.detail || {};
      
      console.log(`[ChatWindow] Received onlineStatusChanged event: userId=${userId}, isOnline=${isOnline}, selectedUser.id=${selectedUser?.id}`);
      
      // Only update if the status change is for the user we're currently chatting with
      if (selectedUser?.id && userId === selectedUser.id) {
        console.log(`[ChatWindow] Updating status for ${userId} to ${isOnline ? 'online' : 'offline'}`);
        try {
          const response = await fetch(`/api/users/${selectedUser.id}`);
          if (response.ok) {
            const updatedUser = await response.json();
            console.log(`[ChatWindow] Fetched updated user data:`, updatedUser);
            setCurrentSelectedUser(updatedUser);
          }
        } catch (error) {
          console.error("Failed to fetch updated user data:", error);
        }
      }
    };

    console.log(`[ChatWindow] Setting up onlineStatusChanged listener for selectedUser.id=${selectedUser?.id}`);
    window.addEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);
    return () => {
      console.log(`[ChatWindow] Removing onlineStatusChanged listener`);
      window.removeEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);
    };
  }, [selectedUser?.id]);

  // Listen for new messages via WebSocket
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const { message } = event.detail;
      
      // Check if this message is relevant to the current conversation
      const isRelevantMessage = selectedUser && (
        // Message is from the person we're chatting with to us
        (message.senderId === selectedUser.id && message.receiverId === currentUser?.id) ||
        // Or message is from us to the person we're chatting with
        (message.senderId === currentUser?.id && message.receiverId === selectedUser.id)
      );
      
      if (isRelevantMessage) {
        // Immediately add the new message to the cache for instant display
        queryClient.setQueryData(
          ["/api/conversations", selectedUser.id, "messages"],
          (oldMessages: Message[] = []) => {
            // Check if message already exists to prevent duplicates
            const messageExists = oldMessages.some(m => m.id === message.id);
            if (messageExists) return oldMessages;
            
            // Add new message to the end of the list
            return [...oldMessages, message];
          }
        );
      }
      
      // Always refetch conversations to update last message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    const handleMessageConfirmed = (event: CustomEvent) => {
      const { message } = event.detail;
      
      // Check if this confirmed message is relevant to the current conversation
      const isRelevantMessage = selectedUser && (
        // Message is from the person we're chatting with to us
        (message.senderId === selectedUser.id && message.receiverId === currentUser?.id) ||
        // Or message is from us to the person we're chatting with
        (message.senderId === currentUser?.id && message.receiverId === selectedUser.id)
      );
      
      if (isRelevantMessage) {
        // Immediately add our own confirmed message to the cache
        queryClient.setQueryData(
          ["/api/conversations", selectedUser.id, "messages"],
          (oldMessages: Message[] = []) => {
            // Check if message already exists to prevent duplicates
            const messageExists = oldMessages.some(m => m.id === message.id);
            if (messageExists) return oldMessages;
            
            // Add new message to the end of the list
            return [...oldMessages, message];
          }
        );
      }
      
      // Refetch conversations to update last message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    };

    window.addEventListener('newMessage', handleNewMessage as EventListener);
    window.addEventListener('messageConfirmed', handleMessageConfirmed as EventListener);

    return () => {
      window.removeEventListener('newMessage', handleNewMessage as EventListener);
      window.removeEventListener('messageConfirmed', handleMessageConfirmed as EventListener);
    };
  }, [queryClient, selectedUser?.id, currentUser?.id]);

  const handleSendMessage = () => {
    if (!selectedUser || !messageText.trim()) return;

    sendMessage(selectedUser.id, messageText.trim());
    setMessageText("");
    
    // Close emoji picker if open
    if (showEmojiPicker) {
      setShowEmojiPicker(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    
    if (!selectedUser) return;

    // Send typing indicator
    sendTyping(selectedUser.id, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(selectedUser.id, false);
    }, 1000);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (images only)
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Only image files are allowed",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (e.g., max 5MB)
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
    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Select a conversation to start chatting
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose someone from your contacts to send a message
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="relative">
            <AvatarImage src={currentSelectedUser?.profilePhoto || undefined} />
            <AvatarFallback>{currentSelectedUser?.firstName[0]}{currentSelectedUser?.lastName[0]}</AvatarFallback>
            {currentSelectedUser?.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent border-2 border-card rounded-full"></div>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold" data-testid="text-selected-user-name">
              {currentSelectedUser?.firstName} {currentSelectedUser?.lastName}
            </h3>
            <p className={cn(
              "text-sm",
              currentSelectedUser?.isOnline ? "text-accent" : "text-muted-foreground"
            )}>
              {currentSelectedUser?.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleUserInfo}
            data-testid="button-toggle-user-info"
          >
            <Info className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            data-testid="button-toggle-sidebar"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.senderId === currentUser.id;
            
            return (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3",
                  isOwn && "justify-end"
                )}
                data-testid={`message-${message.id}`}
              >
                {!isOwn && (
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarImage src={selectedUser.profilePhoto || undefined} />
                    <AvatarFallback>{selectedUser.firstName[0]}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className="message-bubble max-w-[70%]">
                  <div className={cn(
                    "rounded-lg p-3",
                    isOwn 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-secondary rounded-tl-none"
                  )}>
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Shared image"
                        className="rounded-md max-w-xs w-full h-auto cursor-pointer hover:opacity-90 transition-opacity mb-2"
                        onClick={() => window.open(message.imageUrl!, '_blank')}
                        data-testid={`image-message-${message.id}`}
                      />
                    )}
                    {message.content && (
                      <p className="text-sm" data-testid={`text-message-content-${message.id}`}>
                        {message.content}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs text-muted-foreground mt-1 block",
                    isOwn && "text-right"
                  )} data-testid={`text-message-time-${message.id}`}>
                    {formatTime(message.timestamp!)} {isOwn && "✓✓"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers[selectedUser.id] && (
            <div className="flex items-start space-x-3" data-testid="typing-indicator">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={selectedUser.profilePhoto || undefined} />
                <AvatarFallback>{selectedUser.firstName[0]}</AvatarFallback>
              </Avatar>
              <div className="message-bubble max-w-[70%]">
                <div className="bg-secondary rounded-lg rounded-tl-none p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input Area */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex items-end space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFileUpload}
            disabled={imageUploadMutation.isPending}
            data-testid="button-upload-file"
          >
            {imageUploadMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 relative">
            <Textarea
              placeholder="Type a message..."
              value={messageText}
              onChange={handleTyping}
              onKeyDown={handleKeyPress}
              className="resize-none min-h-[48px] max-h-32 pr-10"
              data-testid="textarea-message-input"
            />
            
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              data-testid="button-emoji-picker"
            >
              <Smile className="h-4 w-4" />
            </Button>

            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={(emoji) => {
                  setMessageText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          data-testid="input-file-upload"
        />
      </div>
    </div>
  );
}
