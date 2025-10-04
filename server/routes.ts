import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertMessageSchema, insertConversationSchema, insertNotificationSchema, type User } from "@shared/schema";
import { parse } from "url";
import { parse as parseCookie } from "cookie";

// Helper to convert user to safe public profile
function toPublicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    gender: user.gender,
    age: user.age,
    location: user.location,
    bio: user.bio,
    profilePhoto: user.profilePhoto,
    photos: user.photos,
    isOnline: user.isOnline,
    lastSeen: user.lastSeen
  };
}

interface AuthenticatedRequest extends Request {
  user?: User;
  file?: Express.Multer.File;
  isAuthenticated: any; // Passport.js method - using any to avoid complex typing issues
  logout: any; // Passport.js method - using any to avoid complex typing issues
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Get all users with optional filters (for discovery page)
  app.get("/api/users", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { gender, location, ageMin, ageMax } = req.query;
      
      let users = await storage.getAllUsers();
      
      // Filter out current user
      users = users.filter(user => user.id !== req.user!.id);
      
      // Apply filters with validation
      if (gender && gender !== '') {
        users = users.filter(user => user.gender === gender);
      }
      
      if (location && location !== '') {
        users = users.filter(user => 
          user.location && user.location.toLowerCase().includes((location as string).toLowerCase())
        );
      }
      
      if (ageMin) {
        const minAge = parseInt(ageMin as string);
        if (!isNaN(minAge) && minAge >= 18) {
          users = users.filter(user => user.age >= minAge);
        }
      }
      
      if (ageMax) {
        const maxAge = parseInt(ageMax as string);
        if (!isNaN(maxAge) && maxAge <= 99) {
          users = users.filter(user => user.age <= maxAge);
        }
      }
      
      // Return safe public profile data
      res.json(users.map(toPublicUser));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get online users with optional filters (for discovery page)
  app.get("/api/users/online", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { gender, location, ageMin, ageMax } = req.query;
      
      let users = await storage.getOnlineUsers();
      
      // Filter out current user
      users = users.filter(user => user.id !== req.user!.id);
      
      // Apply filters with validation
      if (gender && gender !== '') {
        users = users.filter(user => user.gender === gender);
      }
      
      if (location && location !== '') {
        users = users.filter(user => 
          user.location && user.location.toLowerCase().includes((location as string).toLowerCase())
        );
      }
      
      if (ageMin) {
        const minAge = parseInt(ageMin as string);
        if (!isNaN(minAge) && minAge >= 18) {
          users = users.filter(user => user.age >= minAge);
        }
      }
      
      if (ageMax) {
        const maxAge = parseInt(ageMax as string);
        if (!isNaN(maxAge) && maxAge <= 99) {
          users = users.filter(user => user.age <= maxAge);
        }
      }
      
      res.json(users.map(toPublicUser));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });

  // Get specific user profile by ID
  app.get("/api/users/:userId", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { userId } = req.params;
      
      // Prevent users from accessing their own profile through this endpoint
      if (userId === req.user!.id) {
        return res.status(400).json({ message: "Use /api/user for your own profile" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create profile view notification for the viewed user
      try {
        const notification = await storage.createNotification({
          userId: userId,
          type: "profile_view",
          fromUserId: req.user!.id,
        });
        
        // Send real-time notification to viewed user if they're online
        const fromUser = await storage.getUser(req.user!.id);
        if (fromUser) {
          const sent = sendToUser(userId, {
            type: 'newNotification',
            notification: {
              id: notification.id,
              type: 'profile_view',
              fromUserId: req.user!.id,
              fromUserName: fromUser.firstName,
              fromUserPhoto: fromUser.profilePhoto,
              message: `${fromUser.firstName} viewed your profile.`,
              createdAt: notification.createdAt
            }
          });
          
          if (sent) {
            console.log(`Profile view notification sent to user ${userId} from ${fromUser.firstName}`);
          }
        }
      } catch (notificationError) {
        // Don't fail the request if notification creation fails
        console.error('Failed to create profile view notification:', notificationError);
      }
      
      res.json(toPublicUser(user));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user conversations
  app.get("/api/conversations", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversations = await storage.getUserConversations(req.user!.id);
      // Sanitize user data in conversations
      const safeConversations = conversations.map(conv => ({
        ...conv,
        otherUser: toPublicUser(conv.otherUser)
      }));
      res.json(safeConversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for a conversation
  app.get("/api/conversations/:userId/messages", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { userId } = req.params;
      let conversation = await storage.getConversation(req.user!.id, userId);
      
      if (!conversation) {
        // Create conversation if it doesn't exist
        conversation = await storage.createConversation({
          participant1Id: req.user!.id,
          participant2Id: userId,
        });
      }
      
      const messages = await storage.getMessages(conversation.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Update user profile
  app.patch("/api/profile", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const updates = req.body;
      delete updates.id; // Prevent ID modification
      delete updates.password; // Prevent password change through this route
      
      const updatedUser = await storage.updateUser(req.user!.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(toPublicUser(updatedUser));
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user's saved filter preferences
  app.get("/api/user/filters", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        gender: user.filterGender || "",
        location: user.filterLocation || "",
        ageMin: user.filterAgeMin || 20,
        ageMax: user.filterAgeMax || 40,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch filters" });
    }
  });

  // Save/update user's filter preferences
  app.patch("/api/user/filters", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { gender, location, ageMin, ageMax } = req.body;
      
      const updatedUser = await storage.updateUser(req.user!.id, {
        filterGender: gender || null,
        filterLocation: location || null,
        filterAgeMin: ageMin || null,
        filterAgeMax: ageMax || null,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        gender: updatedUser.filterGender || "",
        location: updatedUser.filterLocation || "",
        ageMin: updatedUser.filterAgeMin || 20,
        ageMax: updatedUser.filterAgeMax || 40,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to save filters" });
    }
  });

  // Reset user's filter preferences to default
  app.delete("/api/user/filters", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const updatedUser = await storage.updateUser(req.user!.id, {
        filterGender: null,
        filterLocation: null,
        filterAgeMin: null,
        filterAgeMax: null,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        gender: "",
        location: "",
        ageMin: 20,
        ageMax: 40,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset filters" });
    }
  });

  // Upload profile picture
  app.post("/api/upload/profile", upload.single('profilePicture'), async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const profilePhotoUrl = `/uploads/${req.file.filename}`;
      const updatedUser = await storage.updateUser(req.user!.id, { profilePhoto: profilePhotoUrl });
      
      res.json({ 
        profilePhoto: profilePhotoUrl, 
        user: updatedUser ? toPublicUser(updatedUser) : null 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  // Upload message image
  app.post("/api/upload/message", upload.single('messageImage'), async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Multiple photos upload for profile gallery (max 5 photos)
  app.post("/api/upload/photos", upload.array('photos', 5), async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      // Get current user to check existing photos
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get existing photos count
      const existingPhotos = currentUser.photos && Array.isArray(currentUser.photos) ? currentUser.photos : [];
      const newPhotoUrls = req.files.map(file => `/uploads/${file.filename}`);
      
      // Ensure total photos don't exceed 5 (including existing ones)
      const allPhotos = [...existingPhotos, ...newPhotoUrls];
      if (allPhotos.length > 5) {
        return res.status(400).json({ 
          message: `Maximum 5 photos allowed. You currently have ${existingPhotos.length} photos.`,
          maxPhotos: 5,
          currentCount: existingPhotos.length,
          attemptedUpload: newPhotoUrls.length
        });
      }
      
      // Update user with new photos array
      const updatedUser = await storage.updateUser(req.user!.id, { photos: allPhotos });
      
      res.json({ 
        photos: allPhotos,
        newPhotos: newPhotoUrls,
        user: updatedUser ? toPublicUser(updatedUser) : null 
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(500).json({ message: "Failed to upload photos" });
    }
  });

  // Delete a photo from user's gallery
  app.delete("/api/photos", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { photoUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ message: "Photo URL is required" });
      }
      
      const currentUser = await storage.getUser(req.user!.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const existingPhotos = currentUser.photos && Array.isArray(currentUser.photos) ? currentUser.photos : [];
      const updatedPhotos = existingPhotos.filter(photo => photo !== photoUrl);
      
      if (existingPhotos.length === updatedPhotos.length) {
        return res.status(404).json({ message: "Photo not found in gallery" });
      }
      
      const updatedUser = await storage.updateUser(req.user!.id, { photos: updatedPhotos });
      
      res.json({ 
        photos: updatedPhotos,
        user: updatedUser ? toPublicUser(updatedUser) : null 
      });
    } catch (error) {
      console.error('Photo delete error:', error);
      res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications.map(notification => ({
        ...notification,
        fromUser: toPublicUser(notification.fromUser),
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const count = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/notifications/mark-read/:id", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      await storage.markAllNotificationsAsRead(req.user!.id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req: AuthenticatedRequest, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { id } = req.params;
      await storage.deleteNotification(id);
      res.sendStatus(200);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const connectedUsers = new Map<string, { ws: WebSocket; userId: string }>();
  const activeChatWindows = new Map<string, Set<string>>(); // userId -> Set of otherUserIds they have chat windows open with
  
  function broadcastToAll(message: any) {
    connectedUsers.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  function sendToUser(userId: string, message: any) {
    const userConnection = connectedUsers.get(userId);
    if (userConnection && userConnection.ws.readyState === WebSocket.OPEN) {
      userConnection.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Logout route - placed here to access connectedUsers
  app.post("/api/logout", async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user!.id.toString();
    
    // Close WebSocket connection if exists
    const userConnection = connectedUsers.get(userId);
    if (userConnection) {
      userConnection.ws.close();
      connectedUsers.delete(userId);
      
      // Clear all active chat windows for this user during logout
      activeChatWindows.delete(userId);
      
      await storage.setUserOnlineStatus(userId, false);
      
      // Broadcast user offline status
      broadcastToAll({
        type: 'userOffline',
        userId,
      });
    }
    
    // Logout from session
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  wss.on('connection', async (ws: WebSocket, req: Request) => {
    let userId: string | null = null;
    
    // Secure WebSocket authentication: verify session instead of trusting client
    try {
      const cookies = parseCookie(req.headers.cookie || '');
      const sessionId = cookies['connect.sid'];
      
      if (!sessionId) {
        console.log('WebSocket connection rejected: no session cookie');
        ws.close(1008, 'Authentication required');
        return;
      }
      
      // Extract session ID from signed cookie (remove 's:' prefix and signature)
      const actualSessionId = sessionId.startsWith('s:') ? sessionId.slice(2).split('.')[0] : sessionId;
      
      // Get session from store
      const sessionData = await new Promise<any>((resolve, reject) => {
        storage.sessionStore.get(actualSessionId, (err: any, session: any) => {
          if (err) reject(err);
          else resolve(session);
        });
      });
      
      if (!sessionData || !sessionData.passport?.user) {
        console.log('WebSocket connection rejected: invalid or unauthenticated session');
        ws.close(1008, 'Authentication required');
        return;
      }
      
      // Get user ID from authenticated session - now guaranteed to be string
      const authenticatedUserId = sessionData.passport.user as string;
      userId = authenticatedUserId;
      const user = await storage.getUser(authenticatedUserId);
      
      if (!user) {
        console.log('WebSocket connection rejected: user not found');
        ws.close(1008, 'User not found');
        return;
      }
      
      // Successfully authenticated - set up connection
      connectedUsers.set(authenticatedUserId, { ws, userId: authenticatedUserId });
      await storage.setUserOnlineStatus(authenticatedUserId, true);
      
      console.log(`User ${user.username} (${userId}) connected via WebSocket`);
      
      // Broadcast user online status
      broadcastToAll({
        type: 'userOnline',
        userId,
      });
      
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.close(1011, 'Authentication failed');
      return;
    }

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          // Remove the vulnerable 'auth' case - authentication now happens on connection
            
          case 'openChatWindow':
            if (!userId) return;
            
            const { otherUserId: openUserId } = message;
            if (!activeChatWindows.has(userId)) {
              activeChatWindows.set(userId, new Set());
            }
            activeChatWindows.get(userId)!.add(openUserId);
            console.log(`User ${userId} opened chat window with ${openUserId}`);
            break;
            
          case 'closeChatWindow':
            if (!userId) return;
            
            const { otherUserId: closeUserId } = message;
            if (activeChatWindows.has(userId)) {
              activeChatWindows.get(userId)!.delete(closeUserId);
              if (activeChatWindows.get(userId)!.size === 0) {
                activeChatWindows.delete(userId);
              }
            }
            console.log(`User ${userId} closed chat window with ${closeUserId}`);
            break;
            
          case 'sendMessage':
            if (!userId) return;
            
            const { receiverId, content, imageUrl } = message;
            
            // Get or create conversation
            let conversation = await storage.getConversation(userId, receiverId);
            if (!conversation) {
              conversation = await storage.createConversation({
                participant1Id: userId,
                participant2Id: receiverId,
              });
            }
            
            // Create message
            const newMessage = await storage.createMessage({
              conversationId: conversation.id,
              senderId: userId,
              content,
              imageUrl,
            });
            
            // Send to receiver if online
            const receiverConnection = connectedUsers.get(receiverId);
            if (receiverConnection && receiverConnection.ws.readyState === WebSocket.OPEN) {
              const senderUser = await storage.getUser(userId);
              receiverConnection.ws.send(JSON.stringify({
                type: 'newMessage',
                message: newMessage,
                sender: senderUser ? toPublicUser(senderUser) : null,
              }));
            }
            
            // Check if both users have the chat window open (actively chatting)
            const senderHasChatOpen = activeChatWindows.has(userId) && activeChatWindows.get(userId)!.has(receiverId);
            const receiverHasChatOpen = activeChatWindows.has(receiverId) && activeChatWindows.get(receiverId)!.has(userId);
            const bothActivelyChatting = senderHasChatOpen && receiverHasChatOpen;
            
            // Only create notification if they're NOT both actively chatting
            if (!bothActivelyChatting) {
              try {
                const notification = await storage.createNotification({
                  userId: receiverId,
                  type: "message_received",
                  fromUserId: userId,
                  conversationId: conversation.id,
                });
                
                // Send real-time notification to receiver if they're online
                const senderUser = await storage.getUser(userId);
                if (senderUser && receiverConnection && receiverConnection.ws.readyState === WebSocket.OPEN) {
                  receiverConnection.ws.send(JSON.stringify({
                    type: 'newNotification',
                    notification: {
                      id: notification.id,
                      type: 'message_received',
                      fromUserId: userId,
                      fromUserName: senderUser.firstName,
                      fromUserPhoto: senderUser.profilePhoto,
                      message: `${senderUser.firstName} sent you a message.`,
                      createdAt: notification.createdAt
                    }
                  }));
                }
              } catch (notificationError) {
                console.error('Failed to create message notification:', notificationError);
              }
            }
            
            // Confirm to sender
            ws.send(JSON.stringify({
              type: 'messageConfirmed',
              message: newMessage,
            }));
            break;
            
          case 'typing':
            if (!userId) return;
            
            const { receiverId: typingReceiverId, isTyping } = message;
            const typingReceiverConnection = connectedUsers.get(typingReceiverId);
            
            if (typingReceiverConnection && typingReceiverConnection.ws.readyState === WebSocket.OPEN) {
              typingReceiverConnection.ws.send(JSON.stringify({
                type: 'userTyping',
                userId,
                isTyping,
              }));
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (userId) {
        connectedUsers.delete(userId);
        await storage.setUserOnlineStatus(userId, false);
        
        // Clear all active chat windows for this user
        activeChatWindows.delete(userId);
        
        console.log(`User ${userId} disconnected from WebSocket`);
        
        // Broadcast user offline status
        broadcastToAll({
          type: 'userOffline',
          userId,
        });
      }
    });
  });

  return httpServer;
}
