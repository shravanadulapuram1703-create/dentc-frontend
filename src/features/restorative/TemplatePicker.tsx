import { RESTORATION_TEMPLATES, type RestorationTemplate, type TemplateType } from './restorationTemplates';

interface TemplatePickerProps {
  onApply: (template: RestorationTemplate) => void;
  onClose: () => void;
}

const TYPE_LABEL: Record<TemplateType, string> = {
  span: 'Bridges (Span)',
  'arch-bridge': 'Full-Arch Bridges',
  'partial-removable': 'Partial Dentures',
  'full-removable': 'Full Dentures',
  'bar-denture': 'Bar Dentures',
};

const ORDER: TemplateType[] = ['span', 'arch-bridge', 'partial-removable', 'full-removable', 'bar-denture'];

/** Pick a bridge/denture preset; applying expands to grouped chart_conditions rows. */
export default function TemplatePicker({ onApply, onClose }: TemplatePickerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-[480px] rounded-lg border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-b from-[#2566a8] to-[#16406e] px-4 py-2 text-white">
          <span className="text-sm font-semibold">Restoration Templates</span>
          <button onClick={onClose} aria-label="Close" className="rounded px-1.5 hover:bg-white/15">✕</button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-3">
          {ORDER.map((type) => {
            const items = RESTORATION_TEMPLATES.filter((t) => t.template_type === type);
            if (!items.length) return null;
            return (
              <div key={type} className="mb-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{TYPE_LABEL[type]}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onApply(t)}
                      title={`Pillars ${t.pillars.join(',') || '—'} · Pontics ${t.pontics.join(',') || '—'}`}
                      className="rounded border border-slate-200 px-3 py-2 text-left text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
