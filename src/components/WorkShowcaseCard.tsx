import type { Work } from '../types/platform';
import { Trash2 } from 'lucide-react';

export function WorkShowcaseCard({
  work,
  onDelete,
  deleting = false,
}: {
  work: Work;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <article className="group overflow-hidden rounded-[20px] border border-glass-border bg-white/[0.035] p-4">
      <div className="relative overflow-hidden rounded-2xl border border-glass-border bg-black/20">
        <img
          src={work.imageUrl}
          alt={work.title}
          className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#08080C] via-transparent to-transparent opacity-70" />
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-black/50 text-text-secondary backdrop-blur transition-colors hover:border-accent-orange/70 hover:text-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="删除作品"
            title="删除作品"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-accent-blue">Showcase Work</p>
        </div>
        <span className="shrink-0 rounded-full border border-glass-border bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-text-secondary">
          Portfolio
        </span>
      </div>
      {work.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{work.description}</p>
      ) : null}
    </article>
  );
}
