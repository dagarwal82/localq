import { useState } from 'react';
import { ConversationList } from '@/components/ConversationList';
import { MessageThread } from '@/components/MessageThread';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { Conversation } from '@/types/message';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with navigation */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
          <Link href="/home">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversation List - Left side on desktop */}
          <div className="lg:col-span-1">
            <ConversationList
              selectedConversationId={selectedConversation?.id}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          {/* Message Thread - Right side on desktop, full screen on mobile */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <Card className="h-[calc(100vh-10rem)]">
                <MessageThread
                  conversationId={selectedConversation.id}
                  open={true}
                  onOpenChange={() => setSelectedConversation(null)}
                  inline={true}
                />
              </Card>
            ) : (
              <Card className="h-[calc(100vh-10rem)] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-1">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to start messaging</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
