import type { ReactNode } from "react";
import { AppIcon } from "@/components/icons";
import { StatusCard } from "@/components/ui/status-card";

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
