# Fabriquer l'APK avec GitHub et tester sur votre téléphone

## A. Mettre le projet sur GitHub (depuis Termux)
1. Créez un compte GitHub, puis un dépôt PRIVÉ vide nommé `gouvance`.
2. Créez un jeton : GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic), cochez `repo` et `workflow`.
3. Dans Termux : `pkg install git unzip`
4. Décompressez le zip du projet : `unzip gouvance-etape14.zip && cd gouvance`
5. Avant d'envoyer : ouvrez `mobile/src/api.js` et mettez l'adresse du serveur (voir B).
6. Commandes :
   git init && git add . && git commit -m "Gouvance" && git branch -M main
   git remote add origin https://VOTRE_NOM@github.com/VOTRE_NOM/gouvance.git
   git push -u origin main      (mot de passe = le jeton)
7. Sur GitHub, onglet Actions > "Build APK Gouvance" > Run workflow (le build démarre aussi à chaque push). Durée : environ 15 à 25 minutes.
8. Quand c'est vert : ouvrez l'exécution, section Artifacts, téléchargez `gouvance-apk`, décompressez, installez `app-release.apk` (autorisez l'installation depuis cette source).
   Si le build devient rouge : copiez les dernières lignes de l'erreur et envoyez-les moi.

## B. Le serveur pour tester
Option 1 (sur le même téléphone, via Termux) :
   cd gouvance/backend && bash termux-setup.sh   puis éditez .env, puis `node src/index.js`
   Dans mobile/src/api.js : API = 'http://127.0.0.1:3000'
   Gardez Termux ouvert en arrière-plan pendant le test.
Option 2 (VPS) : suivez DEPLOY.md, puis API = 'https://votre-domaine'.
Gmail : créez un "mot de passe d'application" (compte Google > Sécurité > Validation en 2 étapes) pour SMTP_PASS.

## C. Premier test (dans cet ordre)
1. S'inscrire avec l'email mis dans ADMIN_EMAILS : le code arrive par email, puis l'ID + PIN admin s'affichent (notez-les).
2. Se connecter, ouvrir Administration, créer un 2e compte (autre email), l'approuver, le nommer recenseur.
3. Recenser une famille, entrer avec l'ID famille, recharger un wallet (admin > envoyer du stock), payer, télécharger la carte PDF.
4. Salongo : créer une session, confirmer côté famille, clôturer, voir l'amende.
5. Fil d'actualité, marketplace, messages, carte, statistiques, profil.
Notez chaque problème (capture d'écran + ce que vous attendiez) et envoyez tout en une fois.
