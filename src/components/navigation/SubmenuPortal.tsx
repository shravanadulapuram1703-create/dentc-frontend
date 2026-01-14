import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect, forwardRef } from "react";

interface MenuItem {
  label: string;
  path?: string;
  icon?: any;
  submenu?: MenuItem[];
  type?: string;
}

interface SubmenuPortalProps {
  items: MenuItem[];
  position: { top: number; left: number };
  onItemClick: (item: MenuItem, index: number) => void;
  activeSubmenuIndex: number | null;
}

export const SubmenuPortal = forwardRef<HTMLDivElement, SubmenuPortalProps>(
  ({ items, position, onItemClick, activeSubmenuIndex }, ref) => {
    const submenuRef = useRef<HTMLDivElement>(null);

    // Expose ref to parent
    useEffect(() => {
      if (typeof ref === 'function') {
        ref(submenuRef.current);
      } else if (ref) {
        ref.current = submenuRef.current;
      }
    }, [ref]);

    // Adjust position if submenu goes off-screen
    useEffect(() => {
      if (submenuRef.current) {
        const rect = submenuRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        // If submenu goes below viewport, adjust position
        if (rect.bottom > viewportHeight) {
          const overflow = rect.bottom - viewportHeight;
          submenuRef.current.style.top = `${position.top - overflow - 20}px`;
        }
      }
    }, [position]);

    return createPortal(
      <div
        ref={submenuRef}
        style={{
          position: "fixed",
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999,
        }}
        className="min-w-[280px] bg-white border-2 border-slate-200 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling
      >
        <div className="max-h-[80vh] overflow-y-auto py-1">
          {items.map((item, index) => {
            if (item.type === "divider") {
              return <div key={index} className="h-px bg-slate-200 my-1" />;
            }

            const isActive = activeSubmenuIndex === index;

            return (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick(item, index);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.submenu && (
                  <ChevronDown className="w-4 h-4 -rotate-90 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>,
      document.body
    );
  }
);