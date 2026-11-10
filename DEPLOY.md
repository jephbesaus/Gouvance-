# Gouvance - mise en ligne (from NEXTI GIB)

## 1. Serveur (VPS Linux, Ubuntu)
1. Installer : Node.js 20, PostgreSQL 15+, Nginx, PM2.
2. Base : `createdb gouvance` puis, dans l'ordre :
   `psql gouvance -f backend/db/schema.sql` puis schema_v2.sql, schema_v3.sql, schema_v4.sql, schema_v5.sql, schema_v6.sql
3. `cd backend && cp .env.example .env` et remplir : DATABASE_URL, JWT_SECRET (24+ caractères aléatoires),
   ADMIN_EMAILS (votre Gmail), SMTP_USER / SMTP_PASS (mot de passe d'application Gmail), CENSUS_FEE_CDF.
4. `npm install && pm2 start src/index.js --name gouvance && pm2 save`
5. Nginx en proxy vers le port 3000, avec HTTPS (certbot / Let's Encrypt) et support WebSocket (Upgrade).
6. Sauvegardes : `pg_dump` chaque nuit + copie du dossier backend/uploads.

## 2. Premier démarrage
- Inscrivez-vous dans l'application avec l'email admin du .env : le compte admin est activé directement
  (ID + PIN affichés une seule fois : notez-les).
- Depuis le panneau admin : nommez bourgmestres, chefs d'avenue/quartier, recenseurs ; envoyez du stock aux wallets.
- Corrigez les coordonnées des communes (POST /geo/communes).

## 3. Application mobile (Android + iPhone)
1. Dans mobile/src/api.js : mettre l'adresse HTTPS du serveur (API) et le lien de téléchargement (APP_URL).
2. `cd mobile && npm install && npx expo start` pour tester avec Expo Go.
3. Publier : `npm i -g eas-cli && eas login && eas build -p android` (fichier .aab pour Play Store)
   et `eas build -p ios` (compte développeur Apple requis).

## 4. Avant l'ouverture au public (checklist)
- Tester chaque flux avec de faux comptes : inscription, approbation, connexion, wallet, recensement, paiement, Salongo.
- Charge : prévoir PgBouncer, plusieurs instances Node derrière Nginx, Redis pour le temps réel multi-serveurs,
  stockage objet (S3/MinIO) pour les photos, serveur de cartes dédié.
- Juridique : faire relire par l'État la politique de confidentialité et le traitement des données personnelles.
- Traductions swahili et anglais des écrans récents (Recensement, Admin, Statistiques, Carte, Messages, Profil).
