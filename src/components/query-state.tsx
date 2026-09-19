import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "@/components/icons";
import { StatusCard } from "@/components/status-card";

export function EmptyState({
  title,
  body,
  icon = "empty",
  action,
}: {
  title: string;
  body: string;
  icon?: AppIconName;
  action?: ReactNode;
}) {
  return <StatusCard title={title} body={body} icon={<AppIcon name={icon} className="size-5" />} action={action} />;
}

export function ErrorState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <StatusCard
      tone="error"
      title={title}
      body={body}
      icon={<AppIcon name="error" className="size-5" />}
      action={action}
    />
  );
}
