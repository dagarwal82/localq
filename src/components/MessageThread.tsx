import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Send, MoreVertical, Ban, AlertCircle, X } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Message, Conversation } from '@/types/message';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageThreadProps {
  conversationId?: string;
  recipientId?: string;
  productId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MessageThread({
  conversationId,
  recipientId,
  productId,
  open,
  onOpenChange,
}: MessageThreadProps) {
  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [actualConversationId, setActualConversationId] = useState<string | undefined>(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user
  const { data: currentUser } = useQuery<{ id: string; email: string }>({
    queryKey: ['/api/auth/me'],
    queryFn: () => apiRequest('GET', '/api/auth/me'),
    staleTime: 60_000,
  });

  // Fetch conversation details
  const { data: conversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', actualConversationId],
    queryFn: () => apiRequest('GET', `/api/conversations/${actualConversationId}`),
    enabled: !!actualConversationId && open,
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', conversationId, recipientId, productId],
    queryFn: async () => {
      if (conversationId) {
        return apiRequest('GET', `/api/messages?conversationId=${conversationId}`);
      } else if (recipientId) {
        const params = new URLSearchParams({ recipientId });
        if (productId) params.append('productId', productId);
        return apiRequest('GET', `/api/messages?${params.toString()}`);
      }
      return [];
    },
    enabled: open && (!!conversationId || !!recipientId),
  });

  // Merge fetched messages with local optimistic updates
  const allMessages = [...messages, ...localMessages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Extract conversationId from messages if not provided
  useEffect(() => {
    if (!actualConversationId && messages.length > 0 && messages[0].conversationId) {
      setActualConversationId(messages[0].conversationId);
    }
  }, [messages, actualConversationId]);

  // Update actualConversationId when conversationId prop changes
  useEffect(() => {
    if (conversationId) {
      setActualConversationId(conversationId);
    }
  }, [conversationId]);

  // WebSocket for real-time messages
  const { isConnected } = useWebSocket(open, {
    conversationId: actualConversationId,
    onMessage: (message) => {
      if (message.conversationId === actualConversationId) {
        queryClient.invalidateQueries({ queryKey: ['/api/messages', actualConversationId] });
        scrollToBottom();
      }
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest('POST', '/api/messages', {
        conversationId,
        recipientId,
        productId,
        text,
      });
    },
    onMutate: async (text) => {
      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId || '',
        senderId: currentUser?.id || '',
        recipientId: recipientId || '',
        productId,
        text,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setLocalMessages((prev) => [...prev, optimisticMessage]);
      scrollToBottom();
    },
    onSuccess: () => {
      setLocalMessages([]);
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: (error: any) => {
      setLocalMessages([]);
      toast({
        variant: 'destructive',
        title: 'Failed to send message',
        description: error?.message || 'Please try again',
      });
    },
  });

  // Block/unblock mutation
  const blockMutation = useMutation({
    mutationFn: async (block: boolean) => {
      return apiRequest('POST', `/api/conversations/${actualConversationId}/block`, { block });
    },
    onSuccess: (_, block) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: block ? 'User blocked' : 'User unblocked',
        description: block
          ? 'You will no longer receive messages from this user'
          : 'You can now receive messages from this user',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: error?.message || 'Please try again',
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change or dialog opens
  useEffect(() => {
    if (open && allMessages.length > 0) {
      scrollToBottom();
    }
  }, [allMessages.length, open]);

  useEffect(() => {
    if (messages.length > 0 && currentUser?.id) {
      // Mark messages as read - only messages where current user is the RECIPIENT
      const unreadIds = messages
        .filter((m) => !m.read && m.recipientId === currentUser.id && m.senderId !== currentUser.id)
        .map((m) => m.id);
      
      if (unreadIds.length > 0) {
        apiRequest('PATCH', '/api/messages/mark-read', { messageIds: unreadIds }).catch(() => {});
      }
    }
  }, [messages, currentUser?.id]);

  const handleSend = () => {
    const text = messageText.trim();
    if (!text || sendMutation.isPending) return;

    if (conversation?.isBlocked) {
      toast({
        variant: 'destructive',
        title: 'Cannot send message',
        description: 'This conversation is blocked',
      });
      return;
    }

    sendMutation.mutate(text);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[600px] flex flex-col p-0 [&>button]:hidden">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <div className="bg-primary/10 text-primary font-semibold flex items-center justify-center w-full h-full">
                  {conversation?.participantName?.charAt(0).toUpperCase() || '?'}
                </div>
              </Avatar>
              <div>
                <DialogTitle className="text-base">
                  {conversation?.participantName || 'User'}
                </DialogTitle>
                {conversation?.productTitle && (
                  <p className="text-xs text-muted-foreground">
                    Re: {conversation.productTitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isConnected && (
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Offline
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => blockMutation.mutate(!conversation?.blockedByMe)}
                    className="text-destructive"
                    disabled={!actualConversationId}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {conversation?.blockedByMe ? 'Unblock User' : 'Block User'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading messages...
            </div>
          ) : allMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          ) : (
            allMessages.map((message) => {
              const isMe = message.senderId === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      isMe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3 flex-shrink-0">
          {conversation?.isBlocked ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              <Ban className="w-4 h-4 inline-block mr-1" />
              This conversation is blocked
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sendMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!messageText.trim() || sendMutation.isPending}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
