-- Étape 2 : à exécuter après schema.sql.
ALTER TABLE users ADD COLUMN IF NOT EXISTS lang text DEFAULT 'fr' CHECK (lang IN ('fr','sw','en'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_review jsonb;
CREATE TABLE IF NOT EXISTS notifications(id bigserial PRIMARY KEY, user_id uuid REFERENCES users, family_id uuid REFERENCES families,
 title text NOT NULL, body text NOT NULL, read boolean DEFAULT false, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS notif_user ON notifications(user_id); CREATE INDEX IF NOT EXISTS notif_fam ON notifications(family_id);
CREATE TABLE IF NOT EXISTS salongo_sessions(id serial PRIMARY KEY, day date UNIQUE NOT NULL, fine bigint NOT NULL DEFAULT 1000, closed boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS salongo_attendance(session_id int REFERENCES salongo_sessions, family_id uuid REFERENCES families,
 token text UNIQUE NOT NULL, confirmed_at timestamptz DEFAULT now(), PRIMARY KEY(session_id,family_id));
CREATE TABLE IF NOT EXISTS salongo_fines(id bigserial PRIMARY KEY, session_id int REFERENCES salongo_sessions, family_id uuid REFERENCES families,
 amount bigint NOT NULL, paid boolean DEFAULT false, paid_at timestamptz, UNIQUE(session_id,family_id));
