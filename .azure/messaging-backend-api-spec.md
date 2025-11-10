# Messaging Backend API Specification

## Overview
This document specifies the REST and WebSocket APIs needed to support the messaging feature frontend.

---

## REST API Endpoints

### 1. Get User Conversations
**Endpoint:** `GET /api/conversations`

**Description:** Retrieve all conversations for the authenticated user.

**Authentication:** Required (session/JWT)

**Query Parameters:** None

**Response:** `200 OK`
```json
[
  {
    "id": "conv-uuid-1",
    "productId": "product-uuid",
    "productTitle": "Vintage Camera",
    "productImage": "https://storage.../image.jpg",
    "participantId": "user-uuid-2",
    "participantName": "John Doe",
    "participantEmail": "john@example.com",
    "lastMessage": "Is this still available?",
    "lastMessageAt": "2025-11-10T14:30:00Z",
    "unreadCount": 3,
    "isBlocked": false,
    "blockedByMe": false
  }
]
```

**Business Logic:**
- Return conversations where current user is either participant
- Order by `lastMessageAt` DESC (most recent first)
- Calculate `unreadCount` as messages where `recipientId = currentUserId` AND `read = false`
- Set `isBlocked` true if conversation is blocked by either party
- Set `blockedByMe` true if current user blocked the other party

**Error Responses:**
- `401 Unauthorized` - User not authenticated

---

### 2. Get Conversation by ID
**Endpoint:** `GET /api/conversations/{conversationId}`

**Description:** Get details of a specific conversation.

**Authentication:** Required

**Path Parameters:**
- `conversationId` (string, required) - Conversation UUID

**Response:** `200 OK`
```json
{
  "id": "conv-uuid-1",
  "productId": "product-uuid",
  "productTitle": "Vintage Camera",
  "productImage": "https://storage.../image.jpg",
  "participantId": "user-uuid-2",
  "participantName": "John Doe",
  "participantEmail": "john@example.com",
  "lastMessage": "Is this still available?",
  "lastMessageAt": "2025-11-10T14:30:00Z",
  "unreadCount": 3,
  "isBlocked": false,
  "blockedByMe": false
}
```

**Business Logic:**
- Verify current user is a participant in this conversation
- Return 404 if conversation doesn't exist or user not authorized

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not a participant
- `404 Not Found` - Conversation doesn't exist

---

### 3. Get Messages
**Endpoint:** `GET /api/messages`

**Description:** Retrieve messages for a conversation or create new conversation.

**Authentication:** Required

**Query Parameters (Option A - Existing Conversation):**
- `conversationId` (string) - UUID of existing conversation

**Query Parameters (Option B - New/Find Conversation):**
- `recipientId` (string) - UUID of other user
- `productId` (string, optional) - UUID of product being discussed

**Response:** `200 OK`
```json
[
  {
    "id": "msg-uuid-1",
    "conversationId": "conv-uuid-1",
    "senderId": "user-uuid-1",
    "recipientId": "user-uuid-2",
    "productId": "product-uuid",
    "text": "Is this still available?",
    "createdAt": "2025-11-10T14:30:00Z",
    "read": false,
    "senderName": "Jane Smith",
    "senderEmail": "jane@example.com"
  }
]
```

**Business Logic:**
- **Option A:** Return all messages for the conversation, ordered by `createdAt` ASC
- **Option B:** Find or create conversation between current user and recipient
  - If conversation exists (same participants + same productId), return existing messages
  - If no conversation exists, return empty array (conversation created on first message)
- Include sender details for display
- Limit to last 100 messages by default (pagination optional)

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not a participant in conversation
- `400 Bad Request` - Invalid query parameters

---

### 4. Send Message (REST Fallback)
**Endpoint:** `POST /api/messages`

**Description:** Send a new message (REST fallback when WebSocket unavailable).

**Authentication:** Required

**Request Body:**
```json
{
  "conversationId": "conv-uuid-1",  // Optional if recipientId provided
  "recipientId": "user-uuid-2",      // Required if no conversationId
  "productId": "product-uuid",       // Optional, product context
  "text": "Is this still available?"
}
```

**Response:** `201 Created`
```json
{
  "id": "msg-uuid-1",
  "conversationId": "conv-uuid-1",
  "senderId": "user-uuid-1",
  "recipientId": "user-uuid-2",
  "productId": "product-uuid",
  "text": "Is this still available?",
  "createdAt": "2025-11-10T14:30:00Z",
  "read": false,
  "senderName": "Jane Smith",
  "senderEmail": "jane@example.com"
}
```

**Business Logic:**
- Validate message text (not empty, max 10,000 chars)
- If `conversationId` provided:
  - Verify conversation exists and user is participant
  - Create message in that conversation
- If `recipientId` provided without `conversationId`:
  - Find existing conversation between users for this product (if productId provided)
  - If no conversation exists, create new one
  - Create message
- Set `senderId` to current authenticated user
- Set `read` to false
- Set `createdAt` to current timestamp
- Update conversation's `lastMessage` and `lastMessageAt`
- **Send WebSocket notification to recipient** (if connected)
- Check if conversation is blocked - return 403 if blocked

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid request body (empty text, missing required fields)
- `403 Forbidden` - Conversation is blocked
- `404 Not Found` - Conversation or recipient not found

---

### 5. Mark Messages as Read
**Endpoint:** `PATCH /api/messages/mark-read`

**Description:** Mark one or more messages as read.

**Authentication:** Required

**Request Body:**
```json
{
  "messageIds": ["msg-uuid-1", "msg-uuid-2", "msg-uuid-3"]
}
```

**Response:** `200 OK`
```json
{
  "updatedCount": 3
}
```

**Business Logic:**
- Verify all messages belong to conversations where current user is the recipient
- Set `read = true` for all specified messages where `recipientId = currentUserId`
- Only update messages that aren't already read
- **Send WebSocket notification to sender** (MESSAGE_READ event)

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Invalid message IDs
- `403 Forbidden` - User not authorized to mark these messages

---

### 6. Block/Unblock Conversation
**Endpoint:** `POST /api/conversations/{conversationId}/block`

**Description:** Block or unblock a conversation.

**Authentication:** Required

**Path Parameters:**
- `conversationId` (string, required) - Conversation UUID

**Request Body:**
```json
{
  "block": true  // true to block, false to unblock
}
```

**Response:** `200 OK`
```json
{
  "conversationId": "conv-uuid-1",
  "blocked": true,
  "blockedBy": "user-uuid-1"
}
```

**Business Logic:**
- Verify current user is a participant in conversation
- If `block = true`:
  - Create or update block record: `conversation_id`, `blocked_by_user_id`, `created_at`
  - Prevent sending new messages in this conversation (check in POST /api/messages)
- If `block = false`:
  - Remove block record for this user
  - Allow messages again
- **Send WebSocket notification to other participant** (optional)

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not a participant
- `404 Not Found` - Conversation doesn't exist

---

## WebSocket API (STOMP over WebSocket)

### Connection Setup
**Endpoint:** `ws://localhost:5000/ws` (or `wss://` for production)

**Protocol:** STOMP over WebSocket

**Authentication:** Session cookie or JWT token in connection headers

### Client Subscribe Destinations

#### 1. Subscribe to Conversation Updates
**Destination:** `/topic/conversation.{conversationId}`

**Message Format:**
```json
{
  "type": "NEW_MESSAGE",
  "conversationId": "conv-uuid-1",
  "message": {
    "id": "msg-uuid-1",
    "conversationId": "conv-uuid-1",
    "senderId": "user-uuid-2",
    "recipientId": "user-uuid-1",
    "productId": "product-uuid",
    "text": "Yes, it's still available!",
    "createdAt": "2025-11-10T14:35:00Z",
    "read": false,
    "senderName": "John Doe",
    "senderEmail": "john@example.com"
  }
}
```

**Usage:**
- Client subscribes when opening a conversation
- Receives real-time message updates
- Unsubscribes when closing conversation

#### 2. Subscribe to User-Specific Notifications
**Destination:** `/user/queue/notifications`

**Message Formats:**

**New Message Notification:**
```json
{
  "type": "NEW_MESSAGE",
  "conversationId": "conv-uuid-1",
  "message": {
    "id": "msg-uuid-1",
    "text": "Message preview...",
    "senderId": "user-uuid-2",
    "senderName": "John Doe"
  }
}
```

**Message Read Notification:**
```json
{
  "type": "MESSAGE_READ",
  "conversationId": "conv-uuid-1",
  "messageIds": ["msg-uuid-1", "msg-uuid-2"],
  "userId": "user-uuid-2"
}
```

**Typing Indicator (Optional):**
```json
{
  "type": "USER_TYPING",
  "conversationId": "conv-uuid-1",
  "userId": "user-uuid-2"
}
```

**Usage:**
- Client subscribes on app load when authenticated
- Receives global notifications (new messages in any conversation, read receipts)
- Used to update unread counts, show notifications

### Client Send Destinations

#### 1. Send Message via WebSocket
**Destination:** `/app/message.send`

**Message Format:**
```json
{
  "conversationId": "conv-uuid-1",
  "recipientId": "user-uuid-2",
  "productId": "product-uuid",
  "text": "Is this still available?"
}
```

**Server Response:** Broadcasts to conversation topic + recipient's user queue

**Usage:**
- Primary method for sending messages
- Faster than REST endpoint
- Server validates, persists, then broadcasts

#### 2. Send Typing Indicator (Optional)
**Destination:** `/app/typing.start`

**Message Format:**
```json
{
  "conversationId": "conv-uuid-1"
}
```

**Server Response:** Sends typing notification to other participant

---

## Database Schema

### Table: `conversations`
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  participant_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique conversation per product between two users
  CONSTRAINT unique_conversation UNIQUE (product_id, participant_a_id, participant_b_id),
  
  -- Ensure participant_a_id < participant_b_id for consistency (or handle in application)
  CONSTRAINT check_participants CHECK (participant_a_id != participant_b_id)
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_id, updated_at DESC);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_id, updated_at DESC);
CREATE INDEX idx_conversations_product ON conversations(product_id);
```

### Table: `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  text TEXT NOT NULL CHECK (length(text) > 0 AND length(text) <= 10000),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT check_different_users CHECK (sender_id != recipient_id)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_recipient_unread ON messages(recipient_id, read) WHERE read = FALSE;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### Table: `conversation_blocks`
```sql
CREATE TABLE conversation_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  blocked_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- One block record per user per conversation
  CONSTRAINT unique_block UNIQUE (conversation_id, blocked_by_user_id)
);

CREATE INDEX idx_conversation_blocks_conversation ON conversation_blocks(conversation_id);
CREATE INDEX idx_conversation_blocks_user ON conversation_blocks(blocked_by_user_id);
```

---

## Spring Boot Implementation Guide

### 1. Dependencies (Maven)
```xml
<!-- WebSocket Support -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-websocket</artifactId>
</dependency>

<!-- STOMP Messaging -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-messaging</artifactId>
</dependency>

<!-- JPA -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
```

### 2. WebSocket Configuration
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for topic and queue
        config.enableSimpleBroker("/topic", "/queue");
        
        // Set application destination prefix
        config.setApplicationDestinationPrefixes("/app");
        
        // Set user destination prefix
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS(); // Fallback for browsers without WebSocket
    }
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Add interceptor for authentication
        registration.interceptors(new AuthChannelInterceptor());
    }
}
```

### 3. Entity Classes

**Message.java:**
```java
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;
    
    @Column(name = "sender_id", nullable = false)
    private UUID senderId;
    
    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;
    
    @Column(name = "product_id")
    private UUID productId;
    
    @Column(nullable = false, length = 10000)
    private String text;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    @Column(nullable = false)
    private Boolean read = false;
    
    // Transient fields for response DTOs
    @Transient
    private String senderName;
    
    @Transient
    private String senderEmail;
    
    // Getters, setters, constructors
}
```

**Conversation.java:**
```java
@Entity
@Table(name = "conversations")
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "product_id", nullable = false)
    private UUID productId;
    
    @Column(name = "participant_a_id", nullable = false)
    private UUID participantAId;
    
    @Column(name = "participant_b_id", nullable = false)
    private UUID participantBId;
    
    @Column(name = "last_message")
    private String lastMessage;
    
    @Column(name = "last_message_at")
    private Instant lastMessageAt;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    @Column(name = "updated_at")
    private Instant updatedAt;
    
    // Transient fields for DTOs
    @Transient
    private String productTitle;
    
    @Transient
    private String productImage;
    
    @Transient
    private UUID participantId; // The OTHER participant (not current user)
    
    @Transient
    private String participantName;
    
    @Transient
    private String participantEmail;
    
    @Transient
    private Integer unreadCount;
    
    @Transient
    private Boolean isBlocked;
    
    @Transient
    private Boolean blockedByMe;
    
    // Getters, setters, constructors
}
```

**ConversationBlock.java:**
```java
@Entity
@Table(name = "conversation_blocks")
public class ConversationBlock {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "conversation_id", nullable = false)
    private UUID conversationId;
    
    @Column(name = "blocked_by_user_id", nullable = false)
    private UUID blockedByUserId;
    
    @Column(name = "created_at")
    private Instant createdAt;
    
    // Getters, setters, constructors
}
```

### 4. Repository Interfaces

```java
public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
    
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.createdAt ASC")
    List<Message> findMessagesByConversation(@Param("conversationId") UUID conversationId);
    
    @Modifying
    @Query("UPDATE Message m SET m.read = true WHERE m.id IN :messageIds AND m.recipientId = :userId")
    int markMessagesAsRead(@Param("messageIds") List<UUID> messageIds, @Param("userId") UUID userId);
    
    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.recipientId = :userId AND m.read = false")
    int countUnreadMessages(@Param("conversationId") UUID conversationId, @Param("userId") UUID userId);
}

public interface ConversationRepository extends JpaRepository<Conversation, UUID> {
    @Query("SELECT c FROM Conversation c WHERE (c.participantAId = :userId OR c.participantBId = :userId) ORDER BY c.updatedAt DESC")
    List<Conversation> findByParticipant(@Param("userId") UUID userId);
    
    @Query("SELECT c FROM Conversation c WHERE c.productId = :productId AND ((c.participantAId = :userId1 AND c.participantBId = :userId2) OR (c.participantAId = :userId2 AND c.participantBId = :userId1))")
    Optional<Conversation> findByProductAndParticipants(
        @Param("productId") UUID productId,
        @Param("userId1") UUID userId1,
        @Param("userId2") UUID userId2
    );
}

public interface ConversationBlockRepository extends JpaRepository<ConversationBlock, UUID> {
    Optional<ConversationBlock> findByConversationIdAndBlockedByUserId(UUID conversationId, UUID userId);
    
    @Query("SELECT COUNT(cb) > 0 FROM ConversationBlock cb WHERE cb.conversationId = :conversationId")
    boolean isConversationBlocked(@Param("conversationId") UUID conversationId);
}
```

### 5. WebSocket Controller

```java
@Controller
public class MessageWebSocketController {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private MessageService messageService;
    
    @MessageMapping("/message.send")
    public void sendMessage(@Payload MessageRequest request, Principal principal) {
        UUID senderId = getCurrentUserId(principal);
        
        // Create and save message
        Message message = messageService.createMessage(
            request.getConversationId(),
            senderId,
            request.getRecipientId(),
            request.getProductId(),
            request.getText()
        );
        
        // Broadcast to conversation topic
        messagingTemplate.convertAndSend(
            "/topic/conversation." + message.getConversationId(),
            new MessageNotification("NEW_MESSAGE", message.getConversationId(), message, null)
        );
        
        // Send to recipient's user queue
        messagingTemplate.convertAndSendToUser(
            message.getRecipientId().toString(),
            "/queue/notifications",
            new MessageNotification("NEW_MESSAGE", message.getConversationId(), message, null)
        );
    }
    
    @MessageMapping("/typing.start")
    public void typingIndicator(@Payload TypingRequest request, Principal principal) {
        UUID userId = getCurrentUserId(principal);
        
        // Send typing notification to other participant
        messagingTemplate.convertAndSend(
            "/topic/conversation." + request.getConversationId(),
            new MessageNotification("USER_TYPING", request.getConversationId(), null, userId)
        );
    }
    
    private UUID getCurrentUserId(Principal principal) {
        // Extract user ID from authenticated principal
        // Implementation depends on your auth setup
        return UUID.fromString(principal.getName());
    }
}
```

### 6. REST Controller

```java
@RestController
@RequestMapping("/api")
public class MessageRestController {
    
    @Autowired
    private MessageService messageService;
    
    @Autowired
    private ConversationService conversationService;
    
    @GetMapping("/conversations")
    public List<Conversation> getUserConversations(Principal principal) {
        UUID userId = getCurrentUserId(principal);
        return conversationService.getUserConversations(userId);
    }
    
    @GetMapping("/conversations/{conversationId}")
    public Conversation getConversation(@PathVariable UUID conversationId, Principal principal) {
        UUID userId = getCurrentUserId(principal);
        return conversationService.getConversation(conversationId, userId);
    }
    
    @GetMapping("/messages")
    public List<Message> getMessages(
        @RequestParam(required = false) UUID conversationId,
        @RequestParam(required = false) UUID recipientId,
        @RequestParam(required = false) UUID productId,
        Principal principal
    ) {
        UUID userId = getCurrentUserId(principal);
        
        if (conversationId != null) {
            return messageService.getConversationMessages(conversationId, userId);
        } else if (recipientId != null) {
            return messageService.getOrCreateConversationMessages(userId, recipientId, productId);
        } else {
            throw new BadRequestException("Either conversationId or recipientId required");
        }
    }
    
    @PostMapping("/messages")
    public Message sendMessage(@RequestBody MessageRequest request, Principal principal) {
        UUID senderId = getCurrentUserId(principal);
        return messageService.createMessage(
            request.getConversationId(),
            senderId,
            request.getRecipientId(),
            request.getProductId(),
            request.getText()
        );
    }
    
    @PatchMapping("/messages/mark-read")
    public Map<String, Integer> markMessagesAsRead(
        @RequestBody MarkReadRequest request,
        Principal principal
    ) {
        UUID userId = getCurrentUserId(principal);
        int count = messageService.markAsRead(request.getMessageIds(), userId);
        return Map.of("updatedCount", count);
    }
    
    @PostMapping("/conversations/{conversationId}/block")
    public Map<String, Object> blockConversation(
        @PathVariable UUID conversationId,
        @RequestBody BlockRequest request,
        Principal principal
    ) {
        UUID userId = getCurrentUserId(principal);
        conversationService.setBlocked(conversationId, userId, request.isBlock());
        
        return Map.of(
            "conversationId", conversationId,
            "blocked", request.isBlock(),
            "blockedBy", userId
        );
    }
    
    private UUID getCurrentUserId(Principal principal) {
        // Extract from auth context
        return UUID.fromString(principal.getName());
    }
}
```

---

## Testing Checklist

### REST API Tests
- [ ] GET /api/conversations returns user's conversations
- [ ] GET /api/messages with conversationId returns messages
- [ ] GET /api/messages with recipientId creates new conversation
- [ ] POST /api/messages creates message and updates conversation
- [ ] POST /api/messages fails when conversation blocked
- [ ] PATCH /api/messages/mark-read updates read status
- [ ] POST /api/conversations/{id}/block blocks conversation
- [ ] Unauthorized requests return 401

### WebSocket Tests
- [ ] Client can connect to /ws endpoint
- [ ] Client can subscribe to conversation topic
- [ ] Sending message via /app/message.send broadcasts to subscribers
- [ ] Recipient receives notification on /user/queue/notifications
- [ ] Typing indicator works
- [ ] WebSocket authentication works

### Integration Tests
- [ ] Message sent via WebSocket appears in REST GET /api/messages
- [ ] Blocking conversation prevents new messages
- [ ] Unread count updates correctly
- [ ] Multiple conversations for same product work
- [ ] Message history pagination works (if implemented)

---

## Security Considerations

1. **Authentication Required:** All endpoints require authenticated user
2. **Authorization Checks:**
   - Users can only access conversations they're participants in
   - Users can only mark their own messages as read
   - Users can only block conversations they're in
3. **Input Validation:**
   - Message text: 1-10,000 characters
   - Prevent XSS by sanitizing HTML (or use plain text only)
   - Validate UUIDs
4. **Rate Limiting:**
   - Limit messages per user per minute (e.g., 60 messages/min)
   - Prevent spam
5. **WebSocket Security:**
   - Authenticate WebSocket connections
   - Verify user can subscribe to topics they request

---

## Performance Optimizations

1. **Database Indexing:** Already specified in schema
2. **Message Pagination:** Limit to 100 most recent messages, load more on scroll
3. **Caching:** Cache conversation list for 30 seconds
4. **WebSocket Scaling:**
   - Use Redis pub/sub for multi-instance deployments
   - Sticky sessions on load balancer
5. **Read Receipts Batching:** Batch mark-as-read updates every 2-3 seconds
6. **Database Read Replicas:** Use replicas for GET endpoints

---

## Future Enhancements (Optional)

1. **Message Attachments:** Support images, files
2. **Message Editing:** Allow editing sent messages within 5 minutes
3. **Message Deletion:** Soft delete with tombstone messages
4. **Push Notifications:** Mobile/desktop push when user offline
5. **Message Search:** Full-text search across conversations
6. **Group Conversations:** Support 3+ participants
7. **Message Reactions:** Emoji reactions to messages
8. **Voice Messages:** Audio message support
9. **Online Status:** Show when users are online/offline
10. **Message Encryption:** End-to-end encryption for privacy
