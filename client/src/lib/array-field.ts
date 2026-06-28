// Admin forms edit `string[]` fields (learnTags, requirements, personas,
// skillsCovered, lesson.tags) as one item per line in a plain <textarea> —
// simpler than a dynamic add/remove-row UI for a free-text list. Convert at
// the form boundary only (toLines on load, fromLines on submit) so the RHF
// field itself stays a plain string and needs no Controller/array wiring.
export function toLines(items: string[]): string {
  return items.join("\n");
}

export function fromLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
