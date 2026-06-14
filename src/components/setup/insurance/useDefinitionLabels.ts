import { useDefinitions } from "@/shared/hooks/useDefinitions";

// Build a code→label resolver for a /definitions group (INS-10). Returns the
// raw code if the group isn't seeded yet, so display degrades gracefully.
export function useDefinitionLabels(groupCode: string): (code: string | null | undefined) => string {
  const { definitions } = useDefinitions(groupCode);
  const map = new Map(definitions.map((d) => [d.key1 ?? String(d.id), d.description ?? ""]));
  return (code) => {
    if (code == null || code === "") return "—";
    return map.get(code) || code;
  };
}
