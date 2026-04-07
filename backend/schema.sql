-- MessageG0d (MG) initial PostgreSQL schema
-- Generated from the developer specification

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('online', 'idle', 'dnd', 'offline');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE visibility AS ENUM ('public', 'private');
CREATE TYPE channel_type AS ENUM ('TEXT', 'VOICE', 'ANNOUNCEMENT', 'FILE', 'BOT');

CREATE TABLE app_user (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  banner_url TEXT,
  status user_status NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_block (
  blocker_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE user_report (
  report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dm (
  dm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b),
  UNIQUE (user_a, user_b)
);

CREATE TABLE dm_message (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES dm(dm_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES dm_message(message_id) ON DELETE SET NULL,
  status message_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ
);

CREATE TABLE dm_message_reaction (
  message_id UUID NOT NULL REFERENCES dm_message(message_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE server (
  server_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon_url TEXT,
  owner_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE RESTRICT,
  visibility visibility NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE server_invite (
  code TEXT PRIMARY KEY,
  server_id UUID NOT NULL REFERENCES server(server_id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES app_user(user_id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE role (
  role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES server(server_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  permissions_bitmask BIGINT NOT NULL DEFAULT 0,
  UNIQUE(server_id, name)
);

CREATE TABLE server_member (
  user_id UUID NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES server(server_id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, server_id)
);

CREATE TABLE server_member_role (
  user_id UUID NOT NULL,
  server_id UUID NOT NULL,
  role_id UUID NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, server_id, role_id),
  FOREIGN KEY (user_id, server_id)
    REFERENCES server_member(user_id, server_id)
    ON DELETE CASCADE
);

CREATE TABLE channel (
  channel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES server(server_id) ON DELETE CASCADE,
  type channel_type NOT NULL,
  name TEXT NOT NULL,
  permissions_overrides JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE admin_feature_flag (
  flag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID REFERENCES app_user(user_id) ON DELETE CASCADE,
  server_id UUID REFERENCES server(server_id) ON DELETE CASCADE,
  CHECK (user_id IS NOT NULL OR server_id IS NOT NULL)
);
