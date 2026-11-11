# Lancement gratuit en 3 comptes : Neon + Google + Render
(30 à 40 minutes, une seule fois. Région conseillée : Europe / Frankfurt.)

1. NEON (base de données et fichiers) : neon.tech > connexion avec Google > créer un projet "gouvance" > copier la "Connection string" (commence par postgres://).
2. GOOGLE (envoi des codes) : script.google.com > Nouveau projet > coller backend/docs/mail-relay.gs (remplacer CLE par un mot secret)
   > Déployer > Nouveau déploiement > Application Web > Exécuter en tant que : moi, Accès : Tout le monde > Déployer > autoriser > copier l'URL qui finit par /exec.
3. RENDER : render.com > connexion avec GitHub > New > Web Service > dépôt Gouvance-
   Name : gouvance-api | Region : Frankfurt | Root Directory : backend | Build : npm install | Start : node src/index.js | Instance : Free
   Variables : DATABASE_URL (Neon) | DATABASE_SSL=1 | JWT_SECRET (40 caractères au hasard) | ADMIN_EMAILS=orpasuisse@gmail.com
               CENSUS_FEE_CDF=2000 | MAIL_WEBHOOK_URL (l'URL /exec) | MAIL_WEBHOOK_KEY (le mot secret)
   Test : https://gouvance-api.onrender.com/health doit afficher {"ok":true}
4. (Conseillé) cron-job.org : une tâche gratuite qui ouvre /health toutes les 10 minutes, pour que Render ne s'endorme pas.
5. APPLICATION : si Render vous donne un autre nom que gouvance-api :
   sed -i "s#https://gouvance-api.onrender.com#https://VOTRE-NOM.onrender.com#" mobile/src/api.js ; git add . ; git commit -m url ; git push

Les tables se créent toutes seules. Photos et vocaux sont gardés dans Neon (0,5 Go gratuits : largement assez pour les premiers recensements).
Limites : 100 inscriptions par jour (envoi Gmail), service lent au premier appel s'il dort. Quand l'État paie (janvier) : vrai serveur + domaine, sans refaire l'application.
Option plus tard : stocker les photos chez Cloudinary (variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
