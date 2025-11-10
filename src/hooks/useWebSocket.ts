import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IFrame, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Message, MessageNotification } from '@/types/message';

interface UseWebSocketOptions {
  onMessage?: (message: Message) => void;
  onNotification?: (notification: MessageNotification) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  conversationId?: string;
}

export function useWebSocket(enabled: boolean = true, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const subscriptionsRef = useRef<any[]>([]);

  const connect = useCallback(() => {
    if (!enabled || clientRef.current?.active) return;

    try {
      // Use the base URL from env or default to localhost
      // SockJS requires HTTP/HTTPS URL, not WS/WSS
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.spacevox.com';
      const sockUrl = baseUrl + '/ws'; // Keep HTTP/HTTPS for SockJS

      const client = new Client({
        webSocketFactory: () => new SockJS(sockUrl),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: (frame: IFrame) => {
          console.log('STOMP connected:', frame);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          
          // Subscribe to user-specific notifications
          const userSub = client.subscribe('/user/queue/notifications', (message: IMessage) => {
            try {
              const notification: MessageNotification = JSON.parse(message.body);
              
              if (notification.type === 'NEW_MESSAGE' && notification.message) {
                options.onMessage?.(notification.message);
              }
              
              options.onNotification?.(notification);
            } catch (error) {
              console.error('Failed to parse notification:', error);
            }
          });
          subscriptionsRef.current.push(userSub);

          // Subscribe to conversation topic if conversationId provided
          if (options.conversationId) {
            const convSub = client.subscribe(
              `/topic/conversation.${options.conversationId}`,
              (message: IMessage) => {
                try {
                  const notification: MessageNotification = JSON.parse(message.body);
                  
                  if (notification.type === 'NEW_MESSAGE' && notification.message) {
                    options.onMessage?.(notification.message);
                  }
                  
                  options.onNotification?.(notification);
                } catch (error) {
                  console.error('Failed to parse conversation message:', error);
                }
              }
            );
            subscriptionsRef.current.push(convSub);
          }

          options.onConnect?.();
        },

        onDisconnect: () => {
          console.log('STOMP disconnected');
          setIsConnected(false);
          subscriptionsRef.current = [];
          options.onDisconnect?.();
        },

        onStompError: (frame: IFrame) => {
          console.error('STOMP error:', frame.headers['message'], frame.body);
          
          // Attempt reconnection with exponential backoff
          if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`Will reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          }
        },

        onWebSocketError: (error: any) => {
          console.error('WebSocket error:', error);
        },
      });

      client.activate();
      clientRef.current = client;
    } catch (error) {
      console.error('Failed to create STOMP client:', error);
    }
  }, [enabled, options.conversationId]);

  const disconnect = useCallback(() => {
    // Unsubscribe from all subscriptions
    subscriptionsRef.current.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    });
    subscriptionsRef.current = [];

    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: Partial<Message>) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: '/app/message.send',
        body: JSON.stringify(message),
      });
    } else {
      console.warn('STOMP client not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Resubscribe when conversationId changes
  useEffect(() => {
    if (isConnected && options.conversationId && clientRef.current?.connected) {
      // Unsubscribe from old conversation
      const oldConvSub = subscriptionsRef.current.find(
        sub => sub.id?.includes('conversation.')
      );
      if (oldConvSub) {
        oldConvSub.unsubscribe();
        subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub !== oldConvSub);
      }

      // Subscribe to new conversation
      const convSub = clientRef.current.subscribe(
        `/topic/conversation.${options.conversationId}`,
        (message: IMessage) => {
          try {
            const notification: MessageNotification = JSON.parse(message.body);
            
            if (notification.type === 'NEW_MESSAGE' && notification.message) {
              options.onMessage?.(notification.message);
            }
            
            options.onNotification?.(notification);
          } catch (error) {
            console.error('Failed to parse conversation message:', error);
          }
        }
      );
      subscriptionsRef.current.push(convSub);
    }
  }, [options.conversationId, isConnected]);

  return {
    isConnected,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
