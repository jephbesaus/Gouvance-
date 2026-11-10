CREATE TABLE IF NOT EXISTS communes(id serial PRIMARY KEY, name text UNIQUE NOT NULL, lat double precision NOT NULL, lng double precision NOT NULL);
-- Coordonnées approximatives (centre des communes) : à corriger par l'admin si besoin
INSERT INTO communes(name,lat,lng) VALUES ('Ibanda',-2.5110,28.8650),('Kadutu',-2.5300,28.8480),('Bagira',-2.4950,28.8330) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS places(id serial PRIMARY KEY, commune_id int NOT NULL REFERENCES communes ON DELETE CASCADE,
 name text NOT NULL, kind text NOT NULL CHECK (kind IN ('quartier','avenue')), UNIQUE(commune_id,kind,name));
