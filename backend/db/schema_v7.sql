-- Fichiers (photos, vocaux) stockés dans la base : aucun service supplémentaire à créer pour démarrer.
CREATE TABLE IF NOT EXISTS files(name text PRIMARY KEY, mime text NOT NULL, data bytea NOT NULL, created_at timestamptz DEFAULT now());
