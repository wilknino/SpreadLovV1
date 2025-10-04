import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type Notification, type InsertNotification } from "@shared/schema";
import { randomUUID } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  getConversation(user1Id: string, user2Id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Array<Conversation & { otherUser: User; lastMessage?: Message }>>;
  
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  getAllUsers(): Promise<User[]>;
  getOnlineUsers(): Promise<User[]>;
  setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
  
  // Notification methods
  getUserNotifications(userId: string): Promise<Array<Notification & { fromUser: User }>>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private notifications: Map<string, Notification>;
  public sessionStore: any;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.notifications = new Map();
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      isOnline: false,
      lastSeen: new Date(),
      createdAt: new Date(),
      profilePhoto: insertUser.profilePhoto || null,
      location: insertUser.location || null,
      bio: insertUser.bio || null,
      photos: insertUser.photos || null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getConversation(user1Id: string, user2Id: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(
      (conv) => 
        (conv.participant1Id === user1Id && conv.participant2Id === user2Id) ||
        (conv.participant1Id === user2Id && conv.participant2Id === user1Id)
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getUserConversations(userId: string): Promise<Array<Conversation & { otherUser: User; lastMessage?: Message }>> {
    const userConversations = Array.from(this.conversations.values()).filter(
      (conv) => conv.participant1Id === userId || conv.participant2Id === userId
    );

    const enrichedConversations = await Promise.all(
      userConversations.map(async (conv) => {
        const otherUserId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        const otherUser = await this.getUser(otherUserId);
        const messages = await this.getMessages(conv.id);
        const lastMessage = messages[messages.length - 1];
        
        return {
          ...conv,
          otherUser: otherUser!,
          lastMessage,
        };
      })
    );

    return enrichedConversations.sort((a, b) => 
      new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
    );
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      content: insertMessage.content || null,
      imageUrl: insertMessage.imageUrl || null,
    };
    this.messages.set(id, message);
    
    // Update conversation's last message time
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      this.conversations.set(insertMessage.conversationId, {
        ...conversation,
        lastMessageAt: new Date(),
      });
    }
    
    return message;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isOnline);
  }

  async setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        isOnline,
        lastSeen: new Date(),
      });
    }
  }

  // Notification methods
  async getUserNotifications(userId: string): Promise<Array<Notification & { fromUser: User }>> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    const enrichedNotifications = await Promise.all(
      userNotifications.map(async (notification) => {
        const fromUser = await this.getUser(notification.fromUserId);
        return {
          ...notification,
          fromUser: fromUser!,
        };
      })
    );

    return enrichedNotifications;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: false,
      data: insertNotification.data || null,
      conversationId: insertNotification.conversationId || null,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.notifications.set(notificationId, {
        ...notification,
        isRead: true,
      });
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .forEach(notification => {
        this.notifications.set(notification.id, {
          ...notification,
          isRead: true,
        });
      });
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .length;
  }
}

import { PgStorage } from "./pg-storage";

// Use PostgreSQL storage for production
export const storage = new PgStorage();
