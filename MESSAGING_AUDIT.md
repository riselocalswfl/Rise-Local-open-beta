# Rise Local Messaging System Audit

**Audit Date:** January 28, 2026
**Scope:** B2B/B2C Messaging, Permissions, Data Integrity
**Status:** FIXES APPLIED

---

## Summary of Fixes Applied

| Issue ID | Severity | Status | Description |
|----------|----------|--------|-------------|
| MSG-001 | CRITICAL | FIXED | IDOR in notification marking - added ownership verification |
| MSG-002 | CRITICAL | FIXED | Legacy messages - added input validation, receiver check, length limit |
| MSG-003 | CRITICAL | FIXED | Missing unique constraint - added to schema + migration |
| MSG-007 | MEDIUM | FIXED | No message length limit - added 5000 char max |
| MSG-009 | MEDIUM | FIXED | Missing DB indexes - added to schema + migration |
| MSG-011 | LOW | FIXED | No "Send As" indicator - added to ConversationPage |

---

## 1. Messaging Architecture Map

### Database Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `conversations` | B2C conversation threads | `id`, `consumerId`, `vendorId`, `dealId`, `lastMessageAt` |
| `conversationMessages` | Messages within B2C threads | `id`, `conversationId`, `senderId`, `senderRole`, `content`, `isRead` |
| `messages` | Legacy direct user-to-user | `id`, `senderId`, `receiverId`, `content`, `isRead` |
| `notifications` | In-app notifications | `id`, `userId`, `actorId`, `type`, `referenceId`, `referenceType` |
| `emailJobs` | Delayed email notifications | `id`, `recipientId`, `referenceId`, `scheduledFor`, `status` |

### API Endpoints

| Method | Endpoint | Purpose | Auth | Access Control |
|--------|----------|---------|------|----------------|
| POST | `/api/b2c/conversations/start` | Start/get conversation | Required | Consumer initiates |
| GET | `/api/b2c/conversations` | List user's conversations | Required | Role-based (consumer/vendor) |
| GET | `/api/b2c/conversations/:id` | Get conversation + messages | Required | Consumer or vendor owner |
| POST | `/api/b2c/conversations/:id/messages` | Send message | Required | Consumer or vendor owner |
| GET | `/api/b2c/unread-count` | Get unread count | Required | Role-based |
| POST | `/api/messages` | Legacy: Send direct message | Required | **NONE** |
| GET | `/api/conversations` | Legacy: List conversations | Required | Own messages only |
| GET | `/api/messages/:userId` | Legacy: Get messages with user | Required | Own messages only |
| PATCH | `/api/notifications/:id/read` | Mark notification read | Required | **NONE - IDOR BUG** |

### Frontend Pages

| Route | Component | Purpose |
|-------|-----------|---------|
| `/messages` | `MessagesPage.tsx` | Conversation list + business search |
| `/messages/:conversationId` | `ConversationPage.tsx` | Conversation thread view |

### Current Message Flow

```
Consumer → POST /api/b2c/conversations/start → Creates/retrieves conversation
         → POST /api/b2c/conversations/:id/messages → Creates message
         → Creates notification for vendor owner
         → Schedules email (5-min delay, rate-limited)

Vendor   → GET /api/b2c/conversations → Lists conversations for their vendor
         → POST /api/b2c/conversations/:id/messages → Replies to consumer
```

---

## 2. Issues Found

### CRITICAL Severity

| ID | Issue | Location | Status | Description |
|----|-------|----------|--------|-------------|
| MSG-001 | **IDOR: Notification Mark Read** | `routes.ts:5417` | **FIXED** | Any user can mark ANY notification as read - added ownership check |
| MSG-002 | **Legacy Messages No Access Control** | `routes.ts:5083` | **FIXED** | Added input validation, receiver existence check, length limit |
| MSG-003 | **Missing Unique Constraint** | `schema.ts:593` | **FIXED** | Added unique index on `(consumerId, vendorId)` |

### HIGH Severity

| ID | Issue | Location | Status | Description |
|----|-------|----------|--------|-------------|
| MSG-004 | **No B2B Messaging Support** | Schema | NOT FIXED | Future enhancement - no way for businesses to message each other |
| MSG-005 | **Consumer Spam Risk** | `routes.ts:5152` | PARTIAL | No rate limiting on conversation creation (auth rate limits apply) |
| MSG-006 | **Multi-Vendor Owner Edge Case** | `routes.ts:5189` | NOT FIXED | User owning multiple vendors sees only first vendor's conversations |

### MEDIUM Severity

| ID | Issue | Location | Status | Description |
|----|-------|----------|--------|-------------|
| MSG-007 | **No Message Length Limit** | `routes.ts:5277` | **FIXED** | Added 5000 character limit |
| MSG-008 | **No Pagination** | `storage.ts:806` | NOT FIXED | Future enhancement - all messages loaded at once |
| MSG-009 | **Missing DB Indexes** | `schema.ts` | **FIXED** | Added indexes for conversations, messages, notifications |
| MSG-010 | **Inconsistent Role Detection** | `routes.ts:5199` | NOT FIXED | Lower priority - multiple methods work but could be simplified |

### LOW Severity

| ID | Issue | Location | Status | Description |
|----|-------|----------|--------|-------------|
| MSG-011 | **No "Send As" Indicator** | `ConversationPage.tsx` | **FIXED** | Added "Sending as [Business/yourself]" indicator |
| MSG-012 | **Hardcoded Response Time** | `ConversationPage.tsx:179` | NOT FIXED | Cosmetic - "Typically responds in a few hours" is hardcoded |

---

## 3. Conversation Type Support

### Current State

| Type | Supported | Notes |
|------|-----------|-------|
| B2C (Business ↔ Consumer) | Yes | Primary use case |
| B2B (Business ↔ Business) | **No** | Not implemented |
| C2C (Consumer ↔ Consumer) | Partial | Legacy `messages` table, no UI routing |

### Recommended Rules

1. **B2C Conversations:**
   - Consumer can initiate with any verified vendor
   - Vendor can only reply to existing conversations (cannot cold-message consumers)
   - One thread per (consumer, vendor) pair

2. **B2B Conversations (if implemented):**
   - Either business can initiate
   - One thread per (vendor_a, vendor_b) normalized pair
   - Requires separate table or `conversationType` field

---

## 4. Detailed Issue Analysis

### MSG-001: IDOR in Notification Marking

**File:** `server/routes.ts:5417-5425`

```typescript
app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    await storage.markNotificationAsRead(id);  // NO OWNERSHIP CHECK!
    res.json({ success: true });
  } catch (error) {
    // ...
  }
});
```

**Impact:** Any authenticated user can mark any other user's notifications as read, potentially:
- Hiding important notifications from victims
- Enabling social engineering attacks

**Fix Required:** Verify notification belongs to current user before marking.

---

### MSG-002: Legacy Messages No Access Control

**File:** `server/routes.ts:5083-5103`

```typescript
app.post("/api/messages", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const messageData = insertMessageSchema.parse({
      ...req.body,
      senderId: userId,  // Sender is authenticated user
    });
    const message = await storage.createMessage(messageData);
    res.json(message);
  }
});
```

**Impact:**
- User can send messages to any `receiverId` without consent
- No verification that receiver exists
- No verification of relationship between users
- Potential for harassment/spam

**Recommendation:** Deprecate legacy messaging in favor of B2C system, or add restrictions.

---

### MSG-003: Missing Unique Constraint on Conversations

**File:** `shared/schema.ts:593-600`

```typescript
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consumerId: varchar("consumer_id").notNull().references(() => users.id),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id),
  dealId: varchar("deal_id").references(() => deals.id),
  // ... NO UNIQUE CONSTRAINT
});
```

**Risk:** Race condition in `getOrCreateConversation()` could create duplicate threads.

**Fix:** Add unique index: `UNIQUE (consumer_id, vendor_id)`

---

## 5. Test Plan

### B2C Messaging Manual Test Checklist

#### As Consumer:
- [ ] Search for business and start new conversation
- [ ] Send message to business
- [ ] Receive reply notification
- [ ] View conversation shows correct role labels
- [ ] Unread badge clears when conversation viewed
- [ ] Cannot access another consumer's conversation (403)

#### As Vendor Owner:
- [ ] See all conversations for my business
- [ ] Reply to consumer message
- [ ] Consumer receives notification
- [ ] Back button goes to dashboard (not /messages)
- [ ] Cannot access conversations for other vendors (403)

#### As User with Both Roles:
- [ ] Can switch context between consumer and vendor views
- [ ] Conversations correctly separated by role

#### Security Tests:
- [ ] Try accessing `/api/b2c/conversations/[other-user-conversation-id]` → 403
- [ ] Try `PATCH /api/notifications/[other-user-notification-id]/read` → should fail after fix
- [ ] Try creating conversation with non-existent vendor → 404

---

## 6. Migration Requirements

### Required Database Changes

```sql
-- Add unique constraint to prevent duplicate conversations
ALTER TABLE conversations
ADD CONSTRAINT conversations_consumer_vendor_unique
UNIQUE (consumer_id, vendor_id);

-- Add missing indexes for query performance
CREATE INDEX idx_conversation_messages_conversation_id
ON conversation_messages(conversation_id);

CREATE INDEX idx_conversation_messages_created_at
ON conversation_messages(conversation_id, created_at);

CREATE INDEX idx_notifications_user_id
ON notifications(user_id);

CREATE INDEX idx_notifications_user_read
ON notifications(user_id, is_read);
```

---

---

## 7. Files Changed

| File | Changes |
|------|---------|
| `server/routes.ts` | IDOR fix for notifications, legacy message validation, B2C message length limit |
| `server/storage.ts` | Added `getNotification()` method |
| `shared/schema.ts` | Added unique constraint + indexes on conversations, conversationMessages, notifications |
| `client/src/pages/ConversationPage.tsx` | Added "Sending as" indicator |
| `migrations/0002_messaging_security.sql` | New migration for DB constraints and indexes |

---

## 8. Deployment Notes

### Before Deploying

1. **Run the migration:** The migration `0002_messaging_security.sql` adds:
   - Unique constraint on conversations (may fail if duplicates exist)
   - Indexes for performance

2. **Check for duplicate conversations:**
   ```sql
   SELECT consumer_id, vendor_id, COUNT(*) as count
   FROM conversations
   GROUP BY consumer_id, vendor_id
   HAVING COUNT(*) > 1;
   ```
   If duplicates exist, merge them before running migration.

### After Deploying

1. Verify notification IDOR fix:
   - Attempt to mark another user's notification as read → should get 403

2. Verify message length limit:
   - Try sending > 5000 char message → should get 400 error

---

*Audit completed January 28, 2026*
