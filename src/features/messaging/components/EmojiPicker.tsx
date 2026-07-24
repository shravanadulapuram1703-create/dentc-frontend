import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";
import { ALL_EMOJIS, DEFAULT_CATEGORY_ID, EMOJI_CATEGORIES } from "../lib/emojiData";

/**
 * Lightweight, dependency-free emoji picker. Category tabs + free-text search
 * over a curated set. `trigger` is the button that opens the popover.
 */
export default function EmojiPicker({
  onPick,
  trigger,
  align = "end",
}: {
  onPick: (emoji: string) => void;
  trigger: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(DEFAULT_CATEGORY_ID);
  const [query, setQuery] = useState("");

  const emojis = useMemo(() => {
    if (query.trim()) return ALL_EMOJIS;
    return EMOJI_CATEGORIES.find((c) => c.id === tab)?.emojis ?? [];
  }, [tab, query]);

  const handlePick = (e: string) => {
    onPick(e);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-72 p-0 overflow-hidden">
        <div className="p-2 border-b border-[#E2E8F0]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emoji"
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#3A6EA5]"
            />
          </div>
        </div>

        {!query.trim() && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#E2E8F0]">
            {EMOJI_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setTab(c.id)}
                title={c.label}
                className={cn(
                  "w-8 h-8 rounded-md text-lg leading-none flex items-center justify-center transition-colors",
                  tab === c.id ? "bg-[#EAF1F8]" : "hover:bg-[#F1F5F9]",
                )}
              >
                {c.icon}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-56 overflow-y-auto p-2 grid grid-cols-8 gap-0.5">
          {emojis.map((e, i) => (
            <button
              key={`${e}-${i}`}
              onClick={() => handlePick(e)}
              className="w-8 h-8 rounded-md text-xl leading-none flex items-center justify-center hover:bg-[#F1F5F9] transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
