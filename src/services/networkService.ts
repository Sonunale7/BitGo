import { useEffect, useState, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  getMessageQueue,
  removeFromQueue,
  saveMessageQueue,
  sendMessageToFirebase,
  updateMessageStatusLocally,
  QueuedMessage
} from './messageService';

const RETRY_INTERVAL = 3000; // 3 seconds
const MAX_RETRIES = 10;
const MAX_QUEUE_SIZE = 50; // Prevent queue growth when offline long

// Simple network check by attempting a small fetch
const checkNetwork = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    return false;
  }
};

// Process queued messages with safety checks
export const processQueue = async (
  onStatusUpdate?: (messageId: string, chatId: string, status: 'sent' | 'queued') => void
): Promise<number> => {
  const queue = await getMessageQueue();
  let successCount = 0;
  const updatedQueue: QueuedMessage[] = [];

  for (const item of queue) {
    // Skip if already marked as sent
    if (item.message.status === 'sent') {
      continue;
    }

    // Skip if max retries exceeded
    if (item.retryCount >= MAX_RETRIES) {
      await updateMessageStatusLocally(item.chatId, item.message.id, 'failed');
      continue;
    }

    const success = await sendMessageToFirebase(item.chatId, item.message);
    
    if (success) {
      await updateMessageStatusLocally(item.chatId, item.message.id, 'sent');
      onStatusUpdate?.(item.message.id, item.chatId, 'sent');
      successCount++;
    } else {
      // Increment retry count and keep in queue
      updatedQueue.push({
        ...item,
        retryCount: item.retryCount + 1
      });
    }
  }

  // Limit queue size to prevent memory issues
  const trimmedQueue = updatedQueue.slice(-MAX_QUEUE_SIZE);
  await saveMessageQueue(trimmedQueue);

  return successCount;
};

// Hook for managing queue retry with Android lifecycle handling
export const useMessageQueueProcessor = (
  onStatusUpdate?: (messageId: string, chatId: string, status: 'sent' | 'queued') => void
) => {
  const [isOnline, setIsOnline] = useState(true);
  const [queueLength, setQueueLength] = useState(0);
  const retryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isProcessingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Clear interval safely
  const clearRetryInterval = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }
  }, []);

  // Start interval safely
  const startRetryInterval = useCallback(() => {
    clearRetryInterval();
    retryIntervalRef.current = setInterval(async () => {
      if (!isMountedRef.current || isProcessingRef.current) return;
      if (appStateRef.current !== 'active') return;
      
      isProcessingRef.current = true;
      try {
        const online = await checkNetwork();
        if (isMountedRef.current) {
          setIsOnline(online);
          if (online) {
            await processQueue(onStatusUpdate);
          }
          const queue = await getMessageQueue();
          setQueueLength(queue.length);
        }
      } finally {
        isProcessingRef.current = false;
      }
    }, RETRY_INTERVAL);
  }, [clearRetryInterval, onStatusUpdate]);

  // Process queue once
  const processAndUpdate = useCallback(async () => {
    if (!isMountedRef.current || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    try {
      const online = await checkNetwork();
      if (isMountedRef.current) {
        setIsOnline(online);
        if (online) {
          await processQueue(onStatusUpdate);
        }
        const queue = await getMessageQueue();
        setQueueLength(queue.length);
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [onStatusUpdate]);

  useEffect(() => {
    isMountedRef.current = true;

    // Initial check
    processAndUpdate();

    // Start retry interval only if app is active
    if (appStateRef.current === 'active') {
      startRetryInterval();
    }

    // Android lifecycle handling - pause/resume retry
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState.match(/inactive|background/) && nextState === 'active') {
        // App returned to foreground - resume retry
        processAndUpdate();
        startRetryInterval();
      } else if (prevState === 'active' && nextState.match(/inactive|background/)) {
        // App went to background - pause retry to save battery
        clearRetryInterval();
      }
    });

    return () => {
      isMountedRef.current = false;
      clearRetryInterval();
      subscription.remove();
    };
  }, [processAndUpdate, startRetryInterval, clearRetryInterval]);

  return { isOnline, queueLength, processQueue: processAndUpdate };
};
