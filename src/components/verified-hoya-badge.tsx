import { Badge } from "@/components/ui/badge";

export function VerifiedHoyaBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className}>
      Verified Hoya
    </Badge>
  );
}
