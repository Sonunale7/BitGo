import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Message,
  MessageStatus,
  generateMessageId,
  getChatId,
  getLocalMessages,
  addMessageLocally,
  updateMessageStatusLocally,
  sendMessageToFirebase,
  addToQueue,
  subscribeToNewMessages,
} from '../services/messageService';
import { useMessageQueueProcessor } from '../services/networkService';

export const useChat = (currentUserPhone: string, otherUserPhone: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const chatId = getChatId(currentUserPhone, otherUserPhone);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const isSubscribedRef = useRef(false);

  // Handle status updates from queue processor - update only the specific message
  const handleStatusUpdate = useCallback((messageId: string, msgChatId: string, status: 'sent' | 'queued') => {
    if (!isMountedRef.current) return;
    if (msgChatId === chatId) {
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === messageId);
        if (idx === -1 || prev[idx].status === status) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status };
        return updated;
      });
    }
  }, [chatId]);

  const { isOnline, queueLength } = useMessageQueueProcessor(handleStatusUpdate);

  // Load local messages on mount - no refetch on updates
  useEffect(() => {
    isMountedRef.current = true;
    isSubscribedRef.current = false;

    const loadMessages = async () => {
      if (!isMountedRef.current) return;
      
      setIsLoading(true);
      const localMessages = await getLocalMessages(chatId);
      
      if (!isMountedRef.current) return;
      
      setMessages(localMessages);
      
      // Build known message IDs set to prevent duplicates
      knownMessageIdsRef.current = new Set(localMessages.map(m => m.id));
      
      setIsLoading(false);

      // Prevent duplicate listener subscription
      if (isSubscribedRef.current) return;
      isSubscribedRef.current = true;

      // Subscribe to new messages from Firebase with limitToLast(30)
      const lastTimestamp = localMessages.length > 0 
        ? Math.max(...localMessages.map(m => m.timestamp))
        : 0;

      unsubscribeRef.current = subscribeToNewMessages(
        chatId,
        lastTimestamp,
        async (newMessage) => {
          if (!isMountedRef.current) return;
          
          // Skip if already known (duplicate prevention)
          if (knownMessageIdsRef.current.has(newMessage.id)) {
            return;
          }
          
          // Only add if not from current user (avoid duplicates)
          if (newMessage.sender !== currentUserPhone) {
            knownMessageIdsRef.current.add(newMessage.id);
            await addMessageLocally(chatId, newMessage);
            
            if (!isMountedRef.current) return;
            
            // Update state without refetching entire chat
            setMessages(prev => {
              if (prev.find(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp);
            });
          }
        },
        knownMessageIdsRef.current
      );
    };

    if (currentUserPhone && otherUserPhone) {
      loadMessages();
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      isSubscribedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [chatId, currentUserPhone, otherUserPhone]);

  // Send message - local first approach, uses same messageId on retry
  const sendMessage = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || !isMountedRef.current) return;

    const messageId = generateMessageId();
    const message: Message = {
      id: messageId,
      text: text.trim(),
      sender: currentUserPhone,
      timestamp: Date.now(),
      status: 'sending',
    };

    // Track this message ID to prevent duplicates
    knownMessageIdsRef.current.add(messageId);

    // 1. Add to local state immediately (instant feedback)
    setMessages(prev => [...prev, message]);

    // 2. Save to local storage
    await addMessageLocally(chatId, message);

    // 3. Try to send to Firebase (same messageId used for retry)
    const success = await sendMessageToFirebase(chatId, message);

    if (!isMountedRef.current) return;

    if (success) {
      // Update only status, not refetch
      await updateMessageStatusLocally(chatId, message.id, 'sent');
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === message.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'sent' };
        return updated;
      });
    } else {
      // Add to queue for retry - uses same messageId
      await addToQueue(chatId, message);
      await updateMessageStatusLocally(chatId, message.id, 'queued');
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === message.id);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: 'queued' };
        return updated;
      });
    }
  }, [chatId, currentUserPhone]);

  return {
    messages,
    sendMessage,
    isLoading,
    isOnline,
    queueLength,
    chatId,
  };
};
