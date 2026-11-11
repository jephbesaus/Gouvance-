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

## D. Serveur sur un VPS (Ubuntu 24.04)
1. Depuis Termux : `cd ~/gouvance && tar --exclude=node_modules -czf /data/data/com.termux/files/home/backend.tgz backend`
2. `scp -6 ~/backend.tgz root@[ADRESSE_IPV6]:/root/`
3. `ssh -6 root@ADRESSE_IPV6` puis : `tar xzf backend.tgz && cd backend && bash vps-setup.sh`
4. Le script affiche l'adresse à mettre dans mobile/src/api.js (format http://[adresse], port 80), puis git push pour refaire l'APK.
Note : GitHub n'a pas d'IPv6, donc un VPS IPv6 seul ne peut pas faire `git clone` : on envoie les fichiers avec scp.

## E. Lancement gratuit (sans domaine, sans IPv4)
1. Sur le VPS, après vps-setup.sh : `bash tunnel-setup.sh` (donne une adresse https://xxxx.trycloudflare.com).
2. Sur GitHub, créez un dépôt PUBLIC `gouvance-config` avec un fichier `server.json` : {"api":"https://xxxx.trycloudflare.com"}
3. L'application lit ce fichier au démarrage : si l'adresse change, modifiez seulement server.json (pas besoin de refaire l'APK).
Limites : Cloudflare réserve ce tunnel aux tests (aucune garantie), le VPS a 512 Mo : adapté à un lancement pilote, pas à des millions d'utilisateurs.

## F. Lancement avec le VPS Cloudzy + WebGate (domaine gratuit togetherwecan.fr-host.fr)
1. Dans Termux : cd ~ && unzip -o ~/storage/downloads/gouvance-etape19.zip && cd gouvance && git add . && git commit -m serveur && git push
2. Console Cloudzy (navigateur) : donner accès à GitHub via NAT64 puis installer :
   resolvectl dns $(ip -6 route | awk '/^default/{print $5;exit}') 2a00:1098:2c::1 2a01:4f8:c2c:123f::1
   apt-get update -y && apt-get install -y git
   git clone https://jephbesaus:JETON@github.com/jephbesaus/Gouvance-.git && cd Gouvance-/backend && bash vps-setup.sh
3. WebGate : le domaine togetherwecan.fr-host.fr pointe vers 2602:fa59:2:a403::1 port 80.
4. Test : http(s)://togetherwecan.fr-host.fr/health -> {"ok":true}. Si seul http fonctionne : sed -i "s#https://togetherwecan#http://togetherwecan#" mobile/src/api.js puis git push.
