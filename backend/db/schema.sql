CREATE SEQUENCE IF NOT EXISTS user_seq START 10000001;
CREATE SEQUENCE IF NOT EXISTS family_seq START 1;
CREATE TABLE users(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 gouvance_id text UNIQUE, full_name text NOT NULL, email text UNIQUE NOT NULL,
 gender char(1) CHECK (gender IN ('M','F')), birth_date date, phone text,
 commune text, avenue text, quartier text, bio text, photo_url text,
 email_verified boolean DEFAULT false, kyc_status text DEFAULT 'none',
 status text DEFAULT 'pending' CHECK (status IN ('pending','active','blocked')),
 pin_hash text, wallet_pin_hash text, failed_attempts int DEFAULT 0, locked_until timestamptz,
 created_at timestamptz DEFAULT now());
CREATE INDEX ON users(lower(avenue)); CREATE INDEX ON users(lower(quartier)); CREATE INDEX ON users(phone);
CREATE TABLE email_otps(id bigserial PRIMARY KEY, email text NOT NULL, code_hash text NOT NULL,
 expires_at timestamptz NOT NULL, attempts int DEFAULT 0, used boolean DEFAULT false);
CREATE INDEX ON email_otps(email);
CREATE TABLE user_roles(user_id uuid REFERENCES users ON DELETE CASCADE,
 role text CHECK (role IN ('admin','bourgmestre','chef_avenue','chef_quartier','recenseur')),
 scope text NOT NULL DEFAULT '*', PRIMARY KEY(user_id,role,scope));
CREATE TABLE wallets(user_id uuid PRIMARY KEY REFERENCES users, balance bigint NOT NULL DEFAULT 0 CHECK (balance>=0));
CREATE TABLE families(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text UNIQUE NOT NULL DEFAULT ('G'||lpad(nextval('family_seq')::text,9,'0')),
 pin_hash text NOT NULL, family_name text NOT NULL, commune text, avenue text, quartier text, phone text,
 enumerator_id uuid REFERENCES users, paid boolean DEFAULT false, paid_at timestamptz, created_at timestamptz DEFAULT now());
CREATE INDEX ON families(phone); CREATE INDEX ON families(lower(avenue));
CREATE TABLE family_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), family_id uuid REFERENCES families ON DELETE CASCADE,
 kind text CHECK (kind IN ('father','mother','child')), full_name text NOT NULL, gender char(1),
 birth_date date, photo_url text, deceased boolean DEFAULT false);
CREATE TABLE transactions(id bigserial PRIMARY KEY, code text UNIQUE NOT NULL, kind text NOT NULL,
 from_user uuid REFERENCES users, to_user uuid REFERENCES users, amount bigint NOT NULL CHECK (amount>0),
 family_id uuid REFERENCES families, created_at timestamptz DEFAULT now());
CREATE INDEX ON transactions(from_user); CREATE INDEX ON transactions(to_user);
