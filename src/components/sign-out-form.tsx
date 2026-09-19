"use client";

import { Button } from "@/components/ui/button";

export function SignOutForm({
  from,
  className,
}: {
  from?: string;
  className?: string;
}) {
  return (
    <form action="/api/logout" method="post">
      {from ? <input type="hidden" name="from" value={from} /> : null}
      <Button
        type="submit"
        variant="ghost"
        className={className ?? "h-8 px-3 text-white/80 hover:bg-white/10 hover:text-white"}
      >
        Sign out
      </Button>
    </form>
  );
}
