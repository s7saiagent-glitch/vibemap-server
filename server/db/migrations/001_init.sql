-- لبيه (Labbeih) - المخطط الأساسي لقاعدة البيانات
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- الباقات
CREATE TABLE IF NOT EXISTS plans (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(20) UNIQUE NOT NULL,      -- 'free' | 'paid'
  name_ar           VARCHAR(60) NOT NULL,
  price_sar_month   NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_channels      INTEGER,                          -- NULL = غير محدود
  max_members       INTEGER,                          -- NULL = غير محدود
  retention_hours   INTEGER,                           -- NULL = بلا حدود (أرشيف كامل)
  features          JSONB NOT NULL DEFAULT '{}'::jsonb, -- transcription, ai_summary, location, emergency
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- المستخدمون (رقم جوال + OTP)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE NOT NULL,
  name          VARCHAR(80) NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- أكواد OTP
CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone        VARCHAR(20) NOT NULL,
  code         VARCHAR(10) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed     BOOLEAN NOT NULL DEFAULT false,
  attempts     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

-- المنشآت (Workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  invite_code   VARCHAR(12) UNIQUE NOT NULL,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       INTEGER NOT NULL REFERENCES plans(id) DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- أعضاء المنشأة
CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          VARCHAR(20) NOT NULL DEFAULT 'member', -- admin | member
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- القنوات (منشأة دائمة أو مؤقتة QR)
CREATE TABLE IF NOT EXISTS channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  type          VARCHAR(20) NOT NULL DEFAULT 'workspace', -- workspace | temporary
  qr_token      VARCHAR(40) UNIQUE,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ,                              -- للقنوات المؤقتة (48 ساعة)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_channels_workspace ON channels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_channels_qr_token ON channels(qr_token);

-- أعضاء القناة الحاليون (تسجيل حضور، يشمل الضيوف)
CREATE TABLE IF NOT EXISTS channel_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  is_guest      BOOLEAN NOT NULL DEFAULT false,
  guest_name    VARCHAR(60),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id);

-- الرسائل الصوتية
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name     VARCHAR(80) NOT NULL,
  is_guest        BOOLEAN NOT NULL DEFAULT false,
  audio_path      TEXT NOT NULL,
  duration_ms     INTEGER NOT NULL DEFAULT 0,
  mime_type       VARCHAR(60) NOT NULL DEFAULT 'audio/webm;codecs=opus',
  expires_at      TIMESTAMPTZ,                            -- NULL = محفوظ بلا نهاية (باقة مدفوعة)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expires ON messages(expires_at);

-- التفريغ النصي (المرحلة 2)
CREATE TABLE IF NOT EXISTS transcripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    UUID NOT NULL UNIQUE REFERENCES messages(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  language      VARCHAR(10) NOT NULL DEFAULT 'ar',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- الباقات الافتراضية
INSERT INTO plans (id, code, name_ar, price_sar_month, max_channels, max_members, retention_hours, features)
VALUES
  (1, 'free', 'مجاني', 0, 1, 5, 24, '{"transcription":false,"ai_summary":false,"location":false,"emergency":false}'::jsonb),
  (2, 'paid', 'مدفوع', 29, NULL, NULL, NULL, '{"transcription":true,"ai_summary":true,"location":true,"emergency":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
