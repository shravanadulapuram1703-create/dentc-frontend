// One utility tile for the dashboard. Shows the icon, title, description, backend
// status, a destructive/running indicator, and a favourite star. Clicking the
// body deep-links into the generic runner.
import { useNavigate } from "react-router-dom";
import { Star, ChevronRight, ShieldAlert } from "lucide-react";
import { BackendBadge, RunningBadge } from "./StatusBadge";
import type { UtilityDefinition } from "../types";

interface Props {
  def: UtilityDefinition;
  favorite: boolean;
  running?: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function UtilityCard({ def, favorite, running, onToggleFavorite }: Props) {
  const navigate = useNavigate();
  const Icon = def.icon;

  return (
    <div className="group relative flex items-start gap-3 p-4 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#3A6EA5] hover:shadow-sm transition-all">
      <button
        type="button"
        onClick={() => navigate(`/utilities/run/${def.id}`)}
        className="flex items-start gap-3 text-left flex-1 min-w-0"
        aria-label={`Open ${def.title}`}
      >
        <span className="shrink-0 mt-0.5 p-2 rounded-lg bg-[#F1F5F9] group-hover:bg-[#EFF6FF]">
          <Icon className="w-5 h-5 text-[#3A6EA5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-[#1F3A5F]">{def.title}</span>
            {def.destructive && (
              <ShieldAlert className="w-3.5 h-3.5 text-[#D97706]" aria-label="Modifies data — confirmation required" />
            )}
          </div>
          <div className="text-xs text-[#64748B] leading-snug mt-0.5">{def.description}</div>
          <div className="mt-2 flex items-center gap-1.5">
            {running ? <RunningBadge /> : <BackendBadge status={def.backend} />}
          </div>
        </div>
      </button>

      <div className="flex flex-col items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onToggleFavorite(def.id)}
          className="p-1 rounded hover:bg-[#F1F5F9]"
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={favorite}
        >
          <Star
            className={`w-4 h-4 ${favorite ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#CBD5E1] group-hover:text-[#94A3B8]"}`}
          />
        </button>
        <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#3A6EA5]" />
      </div>
    </div>
  );
}
