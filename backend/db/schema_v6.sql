CREATE TABLE IF NOT EXISTS follows(follower uuid REFERENCES users ON DELETE CASCADE, followee uuid REFERENCES users ON DELETE CASCADE, PRIMARY KEY(follower,followee));
CREATE INDEX IF NOT EXISTS follows_followee ON follows(followee);
