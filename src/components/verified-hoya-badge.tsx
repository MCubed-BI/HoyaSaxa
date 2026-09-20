import { Badge } from "@/components/ui/badge";

export function VerifiedHoyaBadge({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={className} data-badge-type="verified_hoya">
      Verified Hoya
    </Badge>
  );
}
