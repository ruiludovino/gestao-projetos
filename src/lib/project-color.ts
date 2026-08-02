const DOT_COLORS = [
  "bg-indigo-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-violet-500",
] as const;

const TAG_COLORS = [
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
] as const;

function hashOf(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function projectDotColor(id: string): string {
  return DOT_COLORS[hashOf(id) % DOT_COLORS.length];
}

export function projectTagColor(id: string): string {
  return TAG_COLORS[hashOf(id) % TAG_COLORS.length];
}
