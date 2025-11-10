# Messaging Feature - Frontend Implementation Summary

## Overview
Implemented a complete real-time messaging system frontend with WebSocket support, conversation management, and blocking capability.

## Components Created

### 1. Types & Interfaces (`src/types/message.ts`)
- **Message**: Core message type with sender/recipient, product context, read status
- **Conversation**: Conversation thread with participant info, product context, unread counts, blocking status
- **MessageNotification**: WebSocket notification types (NEW_MESSAGE, MESSAGE_READ, USER_TYPING)

### 2. WebSocket Hook (`src/hooks/useWebSocket.ts`)
- Auto-connect/disconnect lifecycle management
- Exponential backoff reconnection (max 5 attempts, up to 30s delay)
- Message send/receive handlers
- Connection state tracking
- Support for real-time notifications

### 3. MessageThread Component (`src/components/MessageThread.tsx`)
Features:
- Real-time 1-on-1 messaging with WebSocket
- Optimistic message updates for instant UX
- Auto-scroll to bottom on new messages
- Read receipt marking (automatic when messages viewed)
- Conversation blocking/unblocking UI
- Product context display in header
- Offline indicator badge
- Time formatting (Today, Yesterday, date/time)
- Message history via REST API fallback

### 4. ConversationList Component (`src/components/ConversationList.tsx`)
Features:
- Display all active conversations
- Unread message counts with visual badges
- Product thumbnail/avatar display
- Last message preview
- Smart time display (minutes, hours, days)
- Blocked conversation indicators
- Empty state messaging
- Click to select conversation
- Auto-refresh every 30 seconds

### 5. MessagesPage (`src/pages/Messages.tsx`)
Features:
- Main messaging hub (/messages route)
- Two-column layout (conversations + thread) on desktop
- Mobile-responsive with dialog for selected conversation
- Empty state when no conversation selected
- Integration with ConversationList and MessageThread

## Integration Points

### ProductCard (`src/components/ProductCard.tsx`)
**For Buyers:**
- Message button next to "I'm Interested" button
- Opens message thread with seller
- Auth check before opening (inline login if needed)

**For Sellers:**
- Message buttons in BuyerQueueItem for each interested buyer
- Quick access to communicate with queue members

### BuyerQueueItem (`src/components/BuyerQueueItem.tsx`)
- Added message button for sellers to contact buyers
- Appears next to Approve/Deny buttons for pending interests

### Home Page (`src/pages/Home.tsx`)
- Added "Messages" menu item in DetailsMenu dropdown
- Navigation link to /messages page

### App Router (`src/App.tsx`)
- Added `/messages` route
- Imported and registered MessagesPage component

## User Flows

### Buyer → Seller Messaging
1. Buyer views product card
2. Clicks message button (MessageSquare icon)
3. If not authenticated: inline auth dialog appears
4. MessageThread opens with seller as recipient, product context included
5. Messages sent via WebSocket with optimistic updates
6. Both parties see real-time updates

### Seller → Buyer Messaging
1. Seller views buyer in interest queue
2. Clicks message button in BuyerQueueItem
3. MessageThread opens with buyer as recipient, product context included
4. Real-time bidirectional messaging

### Conversation Management
1. User navigates to /messages
2. ConversationList shows all active chats
3. Unread counts displayed prominently
4. Click conversation to view/reply
5. Desktop: side-by-side view
6. Mobile: dialog overlay

### Blocking
1. Open conversation in MessageThread
2. Click three-dot menu (MoreVertical)
3. Select "Block User" or "Unblock User"
4. Confirmation via mutation
5. Visual indicator shows blocked status
6. Blocked users can't send new messages

## Backend Requirements (Not Yet Implemented)

### WebSocket Endpoints (Spring Boot STOMP)
```
/ws - WebSocket connection endpoint
/app/message.send - Send message
/topic/conversation.{conversationId} - Subscribe to conversation updates
/user/queue/notifications - User-specific notifications
```

### REST API Endpoints
```
GET /api/conversations - List user's conversations
GET /api/messages?conversationId={id} - Get conversation messages
GET /api/messages?recipientId={id}&productId={id} - Get/create conversation
POST /api/messages - Send message (fallback/initial)
PATCH /api/messages/mark-read - Mark messages as read
POST /api/conversations/{id}/block - Block/unblock conversation
```

### Database Schema Needed
- `messages` table: id, conversation_id, sender_id, recipient_id, product_id, text, created_at, read
- `conversations` table: id, product_id, participant_a_id, participant_b_id, updated_at
- `conversation_blocks` table: conversation_id, blocked_by_user_id

### WebSocket Configuration
- STOMP over WebSocket
- Session-based auth integration
- Message persistence
- Read receipt handling
- Typing indicators (optional)

## Technical Details

### State Management
- React Query for REST API calls and caching
- Local state for optimistic updates
- WebSocket connection managed via custom hook
- Automatic cache invalidation on message send/receive

### Performance Optimizations
- Optimistic updates (messages appear instantly)
- Automatic reconnection with exponential backoff
- Query caching with 30s stale time for conversations
- Virtualization ready (can add for long message lists)

### Error Handling
- Network failure detection and reconnection
- Failed message send indication
- Auth check before message actions
- Graceful degradation to REST API if WebSocket unavailable

### Accessibility
- Semantic HTML structure
- ARIA labels for icons
- Keyboard navigation support
- Screen reader friendly time formatting

## Files Modified/Created

### Created
- `src/types/message.ts`
- `src/hooks/useWebSocket.ts`
- `src/components/MessageThread.tsx`
- `src/components/ConversationList.tsx`
- `src/pages/Messages.tsx`

### Modified
- `src/components/ProductCard.tsx` - Added message buttons and handlers
- `src/components/BuyerQueueItem.tsx` - Added message button for sellers
- `src/pages/Home.tsx` - Added Messages menu item
- `src/App.tsx` - Added /messages route

## Next Steps for Backend

1. **Set up Spring Boot WebSocket STOMP configuration**
   - Add WebSocket dependencies
   - Configure STOMP endpoints
   - Integrate with existing auth

2. **Create Message entity and repository**
   - Message JPA entity
   - MessageRepository with query methods
   - Conversation management logic

3. **Implement MessageController**
   - REST endpoints for message history
   - Send message endpoint
   - Mark as read endpoint
   - Block/unblock endpoints

4. **Implement WebSocket handlers**
   - Message sending via STOMP
   - Real-time message distribution
   - Typing indicators (optional)

5. **Add horizontal scaling support**
   - Redis pub/sub for WebSocket message distribution
   - Sticky sessions or shared session storage
   - Database read replicas for message history

## Estimated Scaling Capacity

### Single Instance
- 5,000-10,000 concurrent WebSocket connections
- 500K-1M messages per day
- Sufficient for MVP and early growth

### Horizontal Scaling (Multiple Instances)
- 50,000+ concurrent users with Redis pub/sub
- Sticky sessions via load balancer
- Read replicas for message history queries
- Unlimited message volume with proper indexing
