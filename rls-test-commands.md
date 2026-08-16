# Test RLS — accès anonyme (sans compte, sans connexion)

Ces commandes utilisent uniquement la clé "anon" publique (déjà présente dans
le bundle client, donc pas un secret) — **aucun jeton utilisateur**. Elles
simulent ce que n'importe qui sur Internet peut faire sans se connecter.

À lancer dans un terminal (PowerShell ou Git Bash) :

```bash
curl "https://vozehymbihnckzklxesw.supabase.co/rest/v1/messages?select=*" \
  -H "apikey: sb_publishable_iruVElEyigL1moQz9iY5tw_C13Oop-o"

curl "https://vozehymbihnckzklxesw.supabase.co/rest/v1/likes?select=*" \
  -H "apikey: sb_publishable_iruVElEyigL1moQz9iY5tw_C13Oop-o"

curl "https://vozehymbihnckzklxesw.supabase.co/rest/v1/passes?select=*" \
  -H "apikey: sb_publishable_iruVElEyigL1moQz9iY5tw_C13Oop-o"
```

## Résultat attendu APRÈS avoir exécuté supabase-protect-rls.sql
Les trois doivent renvoyer `[]` (tableau vide) — aucune ligne, même s'il
existe des messages/likes/passes en base, puisque aucun utilisateur n'est
authentifié.

Si l'une des trois renvoie des lignes, le correctif SQL n'a pas été appliqué
ou une policy problématique existe encore ailleurs — collez-moi le résultat.

## Test complémentaire (optionnel, si vous voulez un test encore plus poussé)
Avec un deuxième compte de test, on pourrait aussi prouver qu'un utilisateur
connecté A ne peut lire QUE ses propres conversations (pas celles d'un match
entre deux autres comptes B et C). Dites-moi si vous voulez qu'on fasse ce
test-là aussi une fois un deuxième compte disponible.
