import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Ban } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/types/message';

interface ConversationListProps {
  selectedConversationId?: string;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationList({
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
    queryFn: () => apiRequest('GET', '/api/conversations'),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const formatLastMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
      return format(date, 'EEEE'); // Day of week
    }
    return format(date, 'MMM d');
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-3">
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold text-lg mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation by messaging a seller or buyer
        </p>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-2">
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedConversationId;
          const hasUnread = (conversation.unreadCount || 0) > 0;

          return (
            <Card
              key={conversation.id}
              className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                isSelected ? 'bg-accent' : ''
              } ${hasUnread ? 'border-primary/50' : ''}`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    {conversation.productImage ? (
                      <img
                        src={conversation.productImage}
                        alt={conversation.productTitle}
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-primary/10 text-primary font-semibold flex items-center justify-center w-full h-full">
                        {conversation.participantName?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </Avatar>
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1 bg-primary rounded-full w-5 h-5 flex items-center justify-center">
                      <span className="text-xs text-primary-foreground font-semibold">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm truncate ${
                          hasUnread ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {conversation.participantName || 'Unknown User'}
                      </h4>
                      {conversation.productTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.productTitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatLastMessageTime(conversation.lastMessageAt)}
                        </span>
                      )}
                      {conversation.isBlocked && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0">
                          <Ban className="w-3 h-3 mr-1" />
                          Blocked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {conversation.lastMessage && (
                    <p
                      className={`text-sm truncate ${
                        hasUnread
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
