import type { Highlight } from "@/lib/api";
import { resolveIcon } from "./icon-registry";
import { Card, CardContent } from "@/components/ui/card";

// "Diferenciais do curso" icon cards.
export function HighlightCard({ icon, title, text }: Highlight) {
  const Icon = resolveIcon(icon);
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <Icon className="h-5 w-5 text-primary" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
