import { Hash } from "lucide-react";
import DefinitionCodeSetup from "./DefinitionCodeSetup";

// Modifier Codes — `definitions` group MODIFIER. Codes are stored bare ("50") per
// the canonical CPT form; the legacy screen shows a leading dash, so format it in
// the UI and strip it on save (the backend never sees the dash).
export default function ModifierCodeSetup() {
  return (
    <DefinitionCodeSetup
      groupCode="MODIFIER"
      title="Modifier Codes Setup"
      subtitle="CPT/HCPCS modifiers appended to procedure codes on claims"
      icon={<Hash className="w-6 h-6 text-white" />}
      codeLabel="Code"
      codePlaceholder="e.g., 50"
      codeHint="Stored without the leading dash (canonical CPT form)."
      formatCode={(c) => (c.startsWith("-") ? c : `-${c}`)}
      normalizeCode={(c) => c.trim().replace(/^-+/, "")}
    />
  );
}
