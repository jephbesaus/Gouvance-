ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamptz;
CREATE TABLE IF NOT EXISTS messages(id bigserial PRIMARY KEY, sender uuid NOT NULL REFERENCES users, receiver uuid NOT NULL REFERENCES users,
 kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','voice')), body text, media_url text,
 created_at timestamptz DEFAULT now(), read_at timestamptz);
CREATE INDEX IF NOT EXISTS msg_pair ON messages(sender,receiver,id DESC);
CREATE INDEX IF NOT EXISTS msg_unread ON messages(receiver,sender) WHERE read_at IS NULL;
