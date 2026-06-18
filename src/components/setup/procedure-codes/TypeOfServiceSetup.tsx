import { ListChecks } from "lucide-react";
import DefinitionCodeSetup from "./DefinitionCodeSetup";

// Type of Service Codes — `definitions` group TYPEOFSERVICE. Flat code → label
// reference set (CMS TOS codes "01"…"99").
export default function TypeOfServiceSetup() {
  return (
    <DefinitionCodeSetup
      groupCode="TYPEOFSERVICE"
      title="Type of Service Codes Setup"
      subtitle="CMS type-of-service codes used on medical/insurance claims"
      icon={<ListChecks className="w-6 h-6 text-white" />}
      codeLabel="Code"
      codePlaceholder="e.g., 01"
    />
  );
}
