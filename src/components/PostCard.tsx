import { CATEGORY_LABELS, SCOPE_LABELS, Post } from "@/lib/types";
import AudioButton from "./AudioButton";

export default function PostCard({
  post,
  childName,
}: {
  post: Post;
  childName?: string;
}) {
  const cat = CATEGORY_LABELS[post.category];

  return (
    <article
      className="rounded-xl border-2 border-border p-5 bg-surface"
      aria-label={`${cat.label} : ${post.title}`}
    >
      <div className="flex items-start gap-3 mb-1.5">
        <span
          className="text-2xl leading-none"
          role="img"
          aria-label={cat.label}
        >
          {cat.icon}
        </span>
        <div>
          <p className="text-xs font-bold text-brand-700 uppercase tracking-wide m-0">
            {cat.label} · {SCOPE_LABELS[post.scope]}
            {childName ? ` · Pour ${childName}` : ""}
          </p>
          <h3 className="text-lg font-bold font-serif mt-0.5 mb-0">{post.title}</h3>
        </div>
      </div>

      <p className="big-text mt-2 mb-3.5 whitespace-pre-wrap">{post.body}</p>

      <div className="flex flex-wrap items-center gap-3">
        <AudioButton
          text={`${cat.label}. ${post.title}. ${post.body}`}
          audioUrl={post.audio_url}
          context={post.title}
        />
        <time
          dateTime={post.created_at}
          className="text-xs text-muted tabular-nums"
        >
          {new Date(post.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </article>
  );
}
