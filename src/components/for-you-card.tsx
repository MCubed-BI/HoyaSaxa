import Link from "next/link";
import { HoyaAvatar } from "@/components/hoya-avatar";
import { ProfileMessageCta } from "@/components/profile-message-cta";
import { Timestamp } from "@/components/timestamp";
import { Button } from "@/components/ui/button";
import type { ForYouCardPost } from "@/lib/for-you";
import { canMessageActorTarget, type MessageCtaActor } from "@/lib/messages-dm";

export function ForYouCard({
  post,
  messageActor = null,
}: {
  post: ForYouCardPost;
  messageActor?: MessageCtaActor | null;
}) {
  const parts = post.authorLabel.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? post.authorLabel;
  const lastName = parts.slice(1).join(" ") || post.authorLabel;
  const officialHref = post.officialHref ?? (post.section === "sgarlata" ? "/messages/sgarlata" : null);
  const showDm =
    !officialHref && Boolean(post.alumniId) && canMessageActorTarget(messageActor, post.alumniId ?? "");

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
        {officialHref ? (
          <div className="mt-2">
            <Button asChild size="sm" variant="outline">
              <Link href={officialHref} aria-label={`Message ${post.authorLabel}`}>
                Message
              </Link>
            </Button>
          </div>
        ) : showDm && post.alumniId ? (
          <ProfileMessageCta alumniId={post.alumniId} name={post.authorLabel} compact />
        ) : null}
      </div>
    </article>
  );
}
