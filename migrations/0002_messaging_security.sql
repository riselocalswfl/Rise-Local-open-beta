-- Migration: Messaging Security Improvements
-- Date: 2026-01-28
-- Description: Add unique constraint and indexes for messaging system

-- Add unique constraint to prevent duplicate conversations between same consumer and vendor
-- This ensures only one thread per (consumer, vendor) pair
ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_consumer_vendor_unique"
UNIQUE ("consumer_id", "vendor_id");
--> statement-breakpoint

-- Add index for faster conversation message lookups
CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conversation_id"
ON "conversation_messages" ("conversation_id");
--> statement-breakpoint

-- Add composite index for conversation messages ordered by time
CREATE INDEX IF NOT EXISTS "idx_conversation_messages_conv_created"
ON "conversation_messages" ("conversation_id", "created_at");
--> statement-breakpoint

-- Add index for faster notification lookups by user
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
ON "notifications" ("user_id");
--> statement-breakpoint

-- Add composite index for unread notifications query
CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread"
ON "notifications" ("user_id", "is_read");
--> statement-breakpoint

-- Add index for email jobs by reference (for cancellation lookups)
CREATE INDEX IF NOT EXISTS "idx_email_jobs_reference_id"
ON "email_jobs" ("reference_id", "recipient_id", "status");
--> statement-breakpoint

-- Add index for conversations by consumer
CREATE INDEX IF NOT EXISTS "idx_conversations_consumer_id"
ON "conversations" ("consumer_id");
--> statement-breakpoint

-- Add index for conversations by vendor
CREATE INDEX IF NOT EXISTS "idx_conversations_vendor_id"
ON "conversations" ("vendor_id");
--> statement-breakpoint

-- Add index for legacy messages
CREATE INDEX IF NOT EXISTS "idx_messages_sender_receiver"
ON "messages" ("sender_id", "receiver_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_messages_receiver_sender"
ON "messages" ("receiver_id", "sender_id");
