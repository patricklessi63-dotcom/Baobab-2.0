export function matchKey(a, b) {
  return [a, b].sort().join("__");
}

export function formatLastSeen(iso) {
  if (!iso) return "Statut inconnu";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vu à l'instant";
  if (mins < 60) return `Vu il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Vu il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Vu il y a ${days} j`;
}

export function formatMessageTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

export function formatDayLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Aujourd'hui";
  if (sameDay(d, yesterday)) return "Hier";
  return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long" });
}

export function formatEventWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const weekday = d.toLocaleDateString("fr-CA", { weekday: "long" });
  const label = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const time = d.toLocaleTimeString("fr-CA", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined });
  return `${label} ${time}`;
}
