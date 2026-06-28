import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import type { Level, Layer } from "@jilson/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Only the fields actually rendered — shared by the full catalog card (which
// has moduleCount/lessonCount) and search results (which don't), so callers
// never need to fake fields just to satisfy the type.
export type CourseCardProps = {
  slug: string;
  title: string;
  subtitle: string | null;
  level: Level | null;
  thumbnailUrl: string | null;
  camadas?: Layer[];
  moduleCount?: number;
  lessonCount?: number;
};

export function CourseCard(course: CourseCardProps) {
  return (
    <Link to={`/curso/${course.slug}`} className="block">
      <Card className="h-full transition-colors hover:border-primary">
        <div className="flex h-32 items-center justify-center rounded-t-xl bg-muted">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full rounded-t-xl object-cover"
            />
          ) : (
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <CardHeader>
          <CardTitle className="text-base">{course.title}</CardTitle>
          {course.subtitle && <p className="text-sm text-muted-foreground">{course.subtitle}</p>}
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {course.level && <Badge variant="secondary">{course.level}</Badge>}
          {course.moduleCount !== undefined && course.lessonCount !== undefined && (
            <span className="text-xs text-muted-foreground">
              {course.moduleCount} módulos · {course.lessonCount} aulas
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
