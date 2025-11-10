import { useState } from 'react';
import { ConversationList } from '@/components/ConversationList';
import { MessageThread } from '@/components/MessageThread';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import type { Conversation } from '@/types/message';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showThread, setShowThread] = useState(false);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowThread(true);
  };

  const handleCloseThread = () => {
    setShowThread(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="w-8 h-8" />
          Messages
        </h1>
        <p className="text-muted-foreground mt-1">
          Chat with buyers and sellers about your listings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation List - Left side on desktop */}
        <div className="lg:col-span-1">
          <ConversationList
            selectedConversationId={selectedConversation?.id}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        {/* Message Thread - Right side on desktop, dialog on mobile */}
        <div className="lg:col-span-2 hidden lg:block">
          {selectedConversation ? (
            <Card className="h-[calc(100vh-12rem)]">
              <MessageThread
                conversationId={selectedConversation.id}
                open={true}
                onOpenChange={() => setSelectedConversation(null)}
              />
            </Card>
          ) : (
            <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-1">Select a conversation</p>
                <p className="text-sm">Choose a conversation from the list to start messaging</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile dialog */}
      {selectedConversation && (
        <MessageThread
          conversationId={selectedConversation.id}
          open={showThread}
          onOpenChange={handleCloseThread}
        />
      )}
    </div>
  );
}
