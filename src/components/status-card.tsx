import { Card, CardContent } from "@/components/ui/card";

export function StatusCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="font-heading text-xl text-navy">{title}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
