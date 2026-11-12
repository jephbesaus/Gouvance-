-- Étape 24 : identifiants livrés à l'écran, vues, notifications de messages, signature recenseur, onglets admin
ALTER TABLE users ADD COLUMN IF NOT EXISTS delivery_pin text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS post_views(post_id bigint REFERENCES posts ON DELETE CASCADE, user_id uuid REFERENCES users ON DELETE CASCADE, PRIMARY KEY(post_id,user_id));
ALTER TABLE families ADD COLUMN IF NOT EXISTS signature text;
CREATE TABLE IF NOT EXISTS admin_tabs(id serial PRIMARY KEY, title text NOT NULL, body text NOT NULL DEFAULT '', created_at timestamptz DEFAULT now());
