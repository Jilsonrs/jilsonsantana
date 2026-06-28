import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Only the fields actually rendered — shared by the full catalog card (which
// has skillsCovered) and search results (which don't carry it).
export type TrilhaCardProps = {
  slug: string | null;
  name: string;
  description: string | null;
  skillsCovered?: string[];
};

export function TrilhaCard(trilha: TrilhaCardProps) {
  const body = (
    <Card className="h-full transition-colors hover:border-primary">
      <CardHeader>
        <CardTitle className="text-base">{trilha.name}</CardTitle>
        {trilha.description && (
          <p className="text-sm text-muted-foreground">{trilha.description}</p>
        )}
      </CardHeader>
      {trilha.skillsCovered && trilha.skillsCovered.length > 0 && (
        <CardContent className="flex flex-wrap gap-2">
          {trilha.skillsCovered.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </CardContent>
      )}
    </Card>
  );

  // Catalog templates always carry a slug (Prisma comment: curated templates
  // get a slug; only member clones may not) — but the type is nullable, so
  // guard rather than render a broken link.
  if (!trilha.slug) return <div>{body}</div>;
  return (
    <Link to={`/trilha/${trilha.slug}`} className="block">
      {body}
    </Link>
  );
}
