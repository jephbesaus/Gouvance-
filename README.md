# Gouvance — from NEXTI GIB

## Contenu actuel (étape 1 : serveur / API)
- backend/db/schema.sql : base PostgreSQL (utilisateurs, rôles, wallets, familles G+9 chiffres, transactions)
- backend/src : API Node.js (inscription + code Gmail, approbation admin, connexion ID+PIN par espace,
  nomination bourgmestre / chef d'avenue / chef de quartier / recenseur, wallet, transfert, recensement familial,
  paiement 2000 FC, statistiques limitées par périmètre)
- assets : logos Gouvance et NEXTI GIB

## Étape 2 (ajoutée)
- Vérification d'identité manuelle : recto, verso et selfie envoyés, validés par l'administrateur. (Reconnaissance faciale retirée.)
- Salongo : sessions du samedi, confirmation par famille avec jeton, clôture = amendes + messages automatiques, paiement via wallet.
- Notifications et choix de langue (fr / sw / en).
- Wallet 100 % virtuel interne : aucun retrait d'argent réel.
- Base : exécuter dans l'ordre schema.sql, schema_v2.sql, schema_v3.sql, schema_v4.sql, schema_v5.sql et schema_v6.sql.

## Lancer
1. Créer la base : `createdb gouvance && psql gouvance -f backend/db/schema.sql`
2. `cd backend && cp .env.example .env` (remplir) puis `npm install && npm start`
3. Mettre derrière HTTPS (Nginx) ; pour des millions d'utilisateurs : plusieurs instances + PgBouncer + Redis.

## À faire (étapes suivantes)
Application mobile (Expo/React Native), fil d'actualité, marketplace, messagerie/appels, QR/PDF des cartes,
carte GPS, carte citoyen (profil).

## Étape 14
Fonctions ajoutées : abonnés, déclaration de décès, recherche des contacts du téléphone, profil de l'auteur dans le fil, historique du portefeuille,
traductions fr/sw/en (mobile/src/translate.js), construction APK via GitHub Actions (BUILD_APK.md), serveur de test Termux (backend/termux-setup.sh).
Pas inclus : notifications push quand l'application est fermée (demande un projet Firebase), appels vocaux (retirés à votre demande).
