-- Publications au nom d'une famille
ALTER TABLE posts ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES families;
