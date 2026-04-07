# MG — Developer Specification

---

## 1. Overview

MG is a real-time messaging and community platform combining:

- Direct messaging
- Server-based communities
- Advanced customization
- Gamified systems
- Admin-controlled feature injection

The system is modular, scalable, and permission-driven.

---

## 2. Authentication & User System

### 2.1 Account Creation

Users register with:

- Email
- Username
- Password

### 2.2 Login

- Email or username + password
- Session-based authentication (JWT recommended)

### 2.3 Password Recovery

"Forgot Password" flow:

1. User enters email
2. System generates secure reset token
3. Token emailed to user
4. User clicks link and sets new password

Tokens expire (recommended: 15–30 minutes).

### 2.4 Profile System

Fields:

- `user_id` (UUID)
- `username` (unique)
- `display_name`
- `email` (unique)
- `bio`
- `avatar_url`
- `banner_url`
- `status` (`online | idle | dnd | offline`)
- `last_seen` (timestamp, optional visibility)

### 2.5 Social Controls

- Block user
- Report user

---

## 3. Direct Messaging System

### 3.1 Chat Model

- `dm_id`
- `participants` (2 users)

### 3.2 Message Model

- `message_id`
- `sender_id`
- `dm_id`
- `content`
- `attachments[]`
- `created_at`
- `edited_at`
- `status` (`sent | delivered | read`)

### 3.3 Features

- Typing indicators (WebSocket events)
- Read receipts
- Message editing / deletion
- Replies (message reference ID)
- Reactions (emoji-based)
- Media uploads
- Full-text search indexing

---

## 4. Server System

### 4.1 Server Model

- `server_id`
- `name`
- `description`
- `icon_url`
- `owner_id`
- `visibility` (`public | private`)
- `invite_codes[]`

### 4.2 Membership

- User joins via invite or public listing
- `server_member` table:
  - `user_id`
  - `server_id`
  - `roles[]`

---

## 5. Channel System

### 5.1 Channel Types

- TEXT
- VOICE
- ANNOUNCEMENT
- FILE
- BOT

### 5.2 Channel Model

- `channel_id`
- `server_id`
- `type`
- `name`
- `permissions_overrides`

---

## 6. Roles & Permissions

### 6.1 Role Model

- `role_id`
- `server_id`
- `name`
- `color`
- `icon`
- `permissions_bitmask`

### 6.2 Permission System

Use bitmask flags:

- `SEND_MESSAGES`
- `DELETE_MESSAGES`
- `MANAGE_CHANNELS`
- `MANAGE_ROLES`
- `KICK_USERS`
- `BAN_USERS`
- `CREATE_INVITES`

### 6.3 Hierarchy

- Owner > Admin > Moderator > Member
- Higher roles override lower roles

---

## 7. Messaging Infrastructure

- Real-time via WebSockets
- Fallback polling for reliability
- Message queue (Kafka / Redis Streams recommended)
- Media storage (S3-compatible)

---

## 8. Team System

### 8.1 Structure

- `tag` (4 chars)
- `emoji`
- `server_id`

### 8.2 Rules

- Created by owner
- Requires admin activation
- Optional user display toggle

---

## 9. Global Admin System

### 9.1 Root Admin

- Hardcoded account: `memegodmidas`
- Immutable permissions

### 9.2 Capabilities

- Global ban system
- Server deletion/restoration
- Permission override layer
- System-wide logging access

### 9.3 Feature Injection

Feature flags per:

- `user_id`
- `server_id`

---

## 10. GOD System (Premium)

### 10.1 Assignment

- Granted manually by admin

### 10.2 Features

- Cosmetic enhancements
- Extended upload limits
- Beta feature flags

### 10.3 Visibility

- Configurable visibility states

---

## 11. MIDAS System

### 11.1 Role

- Delegated moderation layer

### 11.2 Restrictions

- Cannot override admins
- Scoped permissions only

---

## 12. Customization Engine

### 12.1 Architecture

- Theme JSON configs
- Client-rendered styles

### 12.2 Scope

- User-level
- Server-level
- Channel-level

---

## 13. Smart Systems

- AI moderation suggestions
- Semantic search (vector DB recommended)
- Message summarization

---

## 14. Bot System

### 14.1 Framework

- API-based bot integration
- OAuth-style bot authorization

### 14.2 Permissions

- Scoped via role system

---

## 15. Economy System

### 15.1 Data

- `xp`
- `level`
- `coins`

### 15.2 Mechanics

- Activity-based XP
- Shop transactions

---

## 16. Achievements

- Event-driven unlock system
- Stored per user

---

## 17. Discovery System

- Indexed servers
- Recommendation engine
- Trending algorithm

---

## 18. Server Progression

- XP per server
- Unlockable features
- Upgrade tiers

---

## 19. Identity System

- Per-server overrides
- Layered rendering:
  - Role
  - Team
  - Profile

---

## 20. Multi-Server Features

- Aggregated feeds
- Unified notification service

---

## 21. Security

- Rate limiting
- Input sanitization
- Anti-spam detection
- Audit logs

---

## 22. Tech Stack (Recommended)

- Backend: Node.js / Go
- Database: PostgreSQL
- Cache: Redis
- Realtime: WebSockets
- Storage: S3

---

## 23. Future Expansion

- Plugin marketplace
- Mobile-native optimizations
- AI assistants per server

---

END OF SPEC
