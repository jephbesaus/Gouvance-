CREATE TABLE IF NOT EXISTS posts(id bigserial PRIMARY KEY, user_id uuid NOT NULL REFERENCES users, kind text NOT NULL DEFAULT 'post' CHECK (kind IN ('post','market')),
 body text, image_url text, price bigint, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS posts_created ON posts(id DESC);
CREATE TABLE IF NOT EXISTS likes(post_id bigint REFERENCES posts ON DELETE CASCADE, user_id uuid REFERENCES users, PRIMARY KEY(post_id,user_id));
CREATE TABLE IF NOT EXISTS comments(id bigserial PRIMARY KEY, post_id bigint REFERENCES posts ON DELETE CASCADE, user_id uuid REFERENCES users, body text NOT NULL, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS comments_post ON comments(post_id);
