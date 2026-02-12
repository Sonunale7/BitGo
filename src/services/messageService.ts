import { ref, push, set, get, onChildAdded, off, serverTimestamp, query, orderByChild, startAt, limitToLast } from 'firebase/database';
import { database } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type MessageStatus = 'sending' | 'sent' | 'queued' | 'failed';

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  status: MessageStatus;
}

const QUEUE_KEY = '@bitgo_message_queue';
const MESSAGES_KEY = '@bitgo_messages_';

// Track active listeners to prevent duplicates
const activeListeners = new Map<string, boolean>();

// Generate unique message ID locally
export const generateMessageId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get chat ID from two user phones (sorted for consistency)
export const getChatId = (phone1: string, phone2: string): string => {
  const sorted = [phone1, phone2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

// Save messages locally for a chat
export const saveMessagesLocally = async (chatId: string, messages: Message[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(MESSAGES_KEY + chatId, JSON.stringify(messages));
  } catch (e) {
    // Silent fail in production
  }
};

// Get messages from local storage
export const getLocalMessages = async (chatId: string): Promise<Message[]> => {
  try {
    const data = await AsyncStorage.getItem(MESSAGES_KEY + chatId);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

// Add single message to local storage
export const addMessageLocally = async (chatId: string, message: Message): Promise<void> => {
  try {
    const messages = await getLocalMessages(chatId);
    const exists = messages.find(m => m.id === message.id);
    if (!exists) {
      messages.push(message);
      // Keep only last 100 messages locally
      const trimmed = messages.slice(-100);
      await saveMessagesLocally(chatId, trimmed);
    }
  } catch (e) {
    // Silent fail in production
  }
};

// Update message status locally
export const updateMessageStatusLocally = async (
  chatId: string, 
  messageId: string, 
  status: MessageStatus
): Promise<void> => {
  try {
    const messages = await getLocalMessages(chatId);
    const index = messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      messages[index].status = status;
      await saveMessagesLocally(chatId, messages);
    }
  } catch (e) {
    // Silent fail in production
  }
};

// Send message to Firebase (minimal payload) - checks for duplicate before writing
export const sendMessageToFirebase = async (
  chatId: string, 
  message: Message
): Promise<boolean> => {
  try {
    const messageRef = ref(database, `chats/${chatId}/messages/${message.id}`);
    
    // Check if message already exists (prevent duplicates on retry)
    const snapshot = await get(messageRef);
    if (snapshot.exists()) {
      return true;
    }
    
    // Minimal payload only - text, sender, timestamp, status
    await set(messageRef, {
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp,
      status: 'sent'
    });
    
    // Update chat meta for sorting (lastMessage, lastTimestamp)
    const metaRef = ref(database, `chats/${chatId}/meta`);
    await set(metaRef, {
      lastMessage: message.text.substring(0, 50),
      lastTimestamp: message.timestamp
    });
    
    return true;
  } catch (e) {
    return false;
  }
};

// Queue management for offline messages
export interface QueuedMessage {
  chatId: string;
  message: Message;
  retryCount: number;
}

export const getMessageQueue = async (): Promise<QueuedMessage[]> => {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveMessageQueue = async (queue: QueuedMessage[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    // Silent fail in production
  }
};

export const addToQueue = async (chatId: string, message: Message): Promise<void> => {
  const queue = await getMessageQueue();
  // Check if already in queue
  const exists = queue.find(q => q.message.id === message.id);
  if (!exists) {
    queue.push({ chatId, message, retryCount: 0 });
    await saveMessageQueue(queue);
  }
};

export const removeFromQueue = async (messageId: string): Promise<void> => {
  const queue = await getMessageQueue();
  const filtered = queue.filter(q => q.message.id !== messageId);
  await saveMessageQueue(filtered);
};

// Subscribe to new messages only (efficient listener with limitToLast)
// Prevents duplicate listeners per chatId
export const subscribeToNewMessages = (
  chatId: string,
  lastTimestamp: number,
  onNewMessage: (message: Message) => void,
  knownMessageIds: Set<string>
): (() => void) => {
  // Prevent duplicate listeners for same chatId
  if (activeListeners.get(chatId)) {
    return () => {};
  }

  const messagesRef = ref(database, `chats/${chatId}/messages`);
  
  // Mark listener as active
  activeListeners.set(chatId, true);
  
  // Use limitToLast(30) to reduce data load on weak connections
  const messagesQuery = query(
    messagesRef,
    orderByChild('timestamp'),
    startAt(lastTimestamp + 1),
    limitToLast(30)
  );

  onChildAdded(messagesQuery, (snapshot) => {
    if (snapshot.exists()) {
      const messageId = snapshot.key || '';
      
      // Skip if we already have this message (prevent duplicates)
      if (knownMessageIds.has(messageId)) {
        return;
      }
      
      const data = snapshot.val();
      const message: Message = {
        id: messageId,
        text: data.text,
        sender: data.sender,
        timestamp: data.timestamp,
        status: 'sent'
      };
      onNewMessage(message);
    }
  });

  // Return unsubscribe function that cleans up properly
  return () => {
    off(messagesRef);
    activeListeners.delete(chatId);
  };
};
