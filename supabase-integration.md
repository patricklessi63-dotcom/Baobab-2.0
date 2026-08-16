# Baobab — schéma & intégration Supabase

Statut en ligne, "vu"/"lu" et "en train d'écrire" ne se stockent pas de la même façon :
- **statut en ligne** et **frappe** → éphémères, via **Supabase Realtime Presence/Broadcast** (pas de table, rien n'est écrit en base)
- **accusé de lecture** → doit persister → colonne en base

## 1. Tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  cover_url text,
  last_seen timestamptz default now()
);

create table messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null,
  sender_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz  -- null tant que le destinataire n'a pas lu
);

alter table profiles enable row level security;
alter table messages enable row level security;

create policy "profils visibles par tous les utilisateurs connectés"
  on profiles for select using (auth.role() = 'authenticated');

create policy "un utilisateur modifie seulement son profil"
  on profiles for update using (auth.uid() = id);

create policy "participants lisent leurs messages"
  on messages for select using (
    auth.uid() = sender_id
    or exists (select 1 from conversation_participants
               where conversation_id = messages.conversation_id and user_id = auth.uid())
  );
```

*(`conversation_participants` à adapter selon que tu fais des conversations 1-à-1 ou de groupe.)*

## 2. Statut en ligne (Presence)

```js
const channel = supabase.channel('presence:online', {
  config: { presence: { key: userId } },
});

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    setOnlineUserIds(Object.keys(state)); // liste des ids actuellement connectés
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ online_at: new Date().toISOString() });
    }
  });

// à la déconnexion / fermeture d'onglet
window.addEventListener('beforeunload', () => channel.untrack());
```

## 3. "En train d'écrire…"

```js
const typingChannel = supabase.channel(`typing:${conversationId}`);

typingChannel.subscribe();

// quand l'utilisateur tape
function onInputChange() {
  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { user_id: userId },
  });
}

// côté destinataire
typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
  showTypingIndicator(payload.user_id);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => hideTypingIndicator(payload.user_id), 3000);
});
```

## 4. Accusé de lecture

```js
// quand le destinataire ouvre la conversation
await supabase
  .from('messages')
  .update({ read_at: new Date().toISOString() })
  .eq('conversation_id', conversationId)
  .is('read_at', null)
  .neq('sender_id', userId);

// l'expéditeur écoute les mises à jour en temps réel
supabase
  .channel(`messages:${conversationId}`)
  .on('postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    (payload) => updateTicksToRead(payload.new)
  )
  .subscribe();
```

## Notes

- Le prototype visuel (`baobab_app.html`) simule ces trois comportements avec des `setTimeout` — à remplacer par les appels ci-dessus une fois branché sur ton projet Supabase.
- Pour la **photo de couverture**, stocke-la comme `avatar_url`/`cover_url` dans `profiles`, uploadée via `supabase.storage.from('covers').upload(...)`.
- Pense à désactiver les indicateurs de présence/lecture pour un utilisateur qui le demande (mentionné dans la politique de confidentialité du prototype) — un simple booléen `show_online_status` / `show_read_receipts` dans `profiles` suffit, à vérifier côté client avant d'appeler `track()` ou l'update de `read_at`.
