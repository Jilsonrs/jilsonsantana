import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

// Debounced text input. Only calls onSearch once the trimmed value reaches the
// server's minimum (2 chars) — mirrors the QueryTooShort rule in
// server/src/routes/search.ts so we never fire a request we know will 400.
// An empty/too-short value calls onSearch("") so the caller can fall back to
// the default catalog view.
export function SearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const trimmed = value.trim();
    const id = setTimeout(() => {
      onSearch(trimmed.length >= MIN_CHARS ? trimmed : "");
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [value, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar trilhas, cursos e aulas…"
        className="pl-9"
        aria-label="Buscar"
      />
    </div>
  );
}
