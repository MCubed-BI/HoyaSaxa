import { HoyaAvatar } from "@/components/hoya-avatar";
import { Timestamp } from "@/components/timestamp";
import type { ForYouCardPost } from "@/lib/for-you";

export function ForYouCard({ post }: { post: ForYouCardPost }) {
  const parts = post.authorLabel.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? post.authorLabel;
  const lastName = parts.slice(1).join(" ") || post.authorLabel;

  return (
    <article className="for-you-card">
      <HoyaAvatar
        person={{
          preferredName: null,
          firstName,
          lastName,
          fullName: post.authorLabel,
          photoUrl: null,
        }}
        size="sm"
      />
      <div className="for-you-card__main">
        <header className="for-you-card__meta">
          <p className="for-you-card__name">{post.authorLabel}</p>
          <Timestamp value={post.createdAt} className="for-you-card__time text-xs text-muted-foreground" />
        </header>
        {post.title ? <h4 className="for-you-card__title">{post.title}</h4> : null}
        <p className="for-you-card__body">{post.body}</p>
        {post.mediaUrl ? (
          // Optional media slot for WD / later uploads. Demo posts leave this empty.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.mediaUrl} alt="" className="for-you-card__media" />
        ) : null}
      </div>
    </article>
  );
}
