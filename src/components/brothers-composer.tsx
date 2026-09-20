import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BrothersComposer() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brothers</CardTitle>
      </CardHeader>
      <CardContent>
        <form action="/api/locker/feed" method="post" className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="brothers-title">Headline (optional)</Label>
            <Input id="brothers-title" name="title" placeholder="Who’s around this weekend?" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brothers-body">Post to For You</Label>
            <Textarea id="brothers-body" name="body" required rows={4} placeholder="Share a note with the brothers." />
          </div>
          <Button type="submit">Post to For You</Button>
        </form>
      </CardContent>
    </Card>
  );
}
