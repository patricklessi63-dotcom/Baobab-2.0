# Baobab — Guide de mise en ligne

## 1. Configurer Supabase (base de données)

1. Va sur [supabase.com](https://supabase.com), crée un compte et un nouveau projet.
2. Une fois le projet créé, va dans **SQL Editor** (menu de gauche) → **New query**.
3. Colle tout le contenu du fichier `supabase-schema.sql` et clique sur **Run**.
   Cela crée les 4 tables nécessaires (profiles, likes, passes, messages).
4. Va dans **Project Settings → API**. Note :
   - **Project URL**
   - **anon public key**

## 2. Configurer le projet en local

```bash
# Dans le dossier du projet
npm install
cp .env.example .env
```

Ouvre le fichier `.env` créé et remplace les valeurs par celles de ton projet Supabase :

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ta-clé-ici
```

## 3. Tester en local

```bash
npm run dev
```

Ouvre l'adresse affichée (en général `http://localhost:5173`) dans ton navigateur.

## 4. Mettre le code sur GitHub

1. Crée un nouveau dépôt sur [github.com](https://github.com) (privé ou public).
2. Depuis le dossier du projet :

```bash
git init
git add .
git commit -m "Premier commit — Baobab"
git branch -M main
git remote add origin https://github.com/TON-COMPTE/baobab-app.git
git push -u origin main
```

(Le fichier `.env` ne sera PAS envoyé sur GitHub — c'est volontaire, il est dans `.gitignore` car il contient tes clés.)

## 5. Déployer sur Vercel (gratuit)

1. Va sur [vercel.com](https://vercel.com), connecte-toi avec ton compte GitHub.
2. Clique **Add New → Project**, sélectionne ton dépôt `baobab-app`.
3. Dans la section **Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL` → ton URL Supabase
   - `VITE_SUPABASE_ANON_KEY` → ta clé anon
4. Clique **Deploy**.
5. Après quelques secondes, Vercel te donne une adresse publique du type
   `https://baobab-app.vercel.app` — ton site est en ligne !

*(Alternative équivalente : Netlify, la procédure est très similaire.)*

## 6. Mettre à jour le site plus tard

À chaque fois que le code change :

```bash
git add .
git commit -m "description du changement"
git push
```

Vercel redéploie automatiquement le site à chaque `push`.

---

## ⚠️ Limites importantes à connaître (prototype, pas encore prêt pour un vrai lancement public)

- **Pas d'authentification réelle** : "continuer en tant que" se fait juste en choisissant un profil dans une liste — n'importe qui peut se faire passer pour n'importe qui. À corriger avant un vrai lancement (Supabase propose une authentification par email/téléphone facile à ajouter).
- **Règles de sécurité (RLS) permissives** : actuellement tout le monde peut lire/écrire toutes les données. Fonctionne pour tester en petit groupe fermé, mais à resserrer avant un usage public.
- **Pas de modération de contenu** ni de signalement/blocage — nécessaire avant un vrai lancement, surtout pour une app de rencontre.
- **Photos non gérées** (l'avatar utilise juste l'initiale du prénom) — Supabase propose un système de stockage de fichiers si tu veux ajouter de vraies photos plus tard.

Ces points sont normaux pour un prototype de validation — l'objectif ici est de tester le concept avec un petit groupe de confiance, pas de lancer publiquement.
