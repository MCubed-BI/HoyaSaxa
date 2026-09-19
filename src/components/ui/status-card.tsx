import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

export function StatusCard({
  title,
  body,
  icon,
  tone = "empty",
  action,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  tone?: "empty" | "error" | "muted";
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-6 py-14 text-center">
        <span
          className={cn(
            "mb-4 flex size-11 items-center justify-center rounded-full",
            tone === "error" ? "bg-destructive/10 text-destructive" : "bg-muted text-navy",
          )}
        >
          {icon ?? <Inbox className="size-5" aria-hidden />}
        </span>
        <p className={cn("font-heading text-xl", tone === "error" ? "text-destructive" : "text-navy")}>{title}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{body}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
