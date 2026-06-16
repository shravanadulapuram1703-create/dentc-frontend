import { useState } from 'react';
import { X, Loader2, Tag } from 'lucide-react';
import type { GalleryImage } from '../types';
import { useToothAssociation } from '../hooks/useToothAssociation';
import { parseTeeth, UPPER_ARCH, LOWER_ARCH } from '../utils/toothCodes';

interface ToothAssociationPanelProps {
  image: GalleryImage;
  officeId?: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

/** Modal to associate teeth (Universal Numbering 1–32) + notes with an image. */
export default function ToothAssociationPanel({
  image,
  officeId,
  onClose,
  onSaved,
}: ToothAssociationPanelProps) {
  const { save, isSaving } = useToothAssociation();
  const [selected, setSelected] = useState<string[]>(parseTeeth(image.detail?.teeth));
  const [notes, setNotes] = useState<string>(image.detail?.notes ?? '');

  const toggle = (tooth: string) =>
    setSelected((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth],
    );

  const handleSave = async () => {
    const ok = await save({
      document: image.document,
      detail: image.detail,
      teeth: selected,
      notes: notes || null,
      office_id: officeId,
    });
    if (ok) {
      onSaved?.();
      onClose();
    }
  };

  const toothBtn = (tooth: string) => {
    const active = selected.includes(tooth);
    return (
      <button
        key={tooth}
        type="button"
        onClick={() => toggle(tooth)}
        className={`w-9 h-9 rounded-md text-xs font-bold border-2 transition-colors ${
          active
            ? 'bg-[#2FB9A7] text-white border-[#2FB9A7]'
            : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#2FB9A7]'
        }`}
      >
        {tooth}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border-2 border-[#E2E8F0] max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] text-white px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-bold inline-flex items-center gap-2">
            <Tag className="w-4 h-4" /> Tooth Association
          </h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/15 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-[#64748B] truncate">{image.document.file_name}</p>

          <div>
            <div className="text-xs font-bold text-[#475569] mb-2">
              Upper arch <span className="font-normal text-[#94A3B8]">(1–16)</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">{UPPER_ARCH.map(toothBtn)}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-[#475569] mb-2">
              Lower arch <span className="font-normal text-[#94A3B8]">(17–32)</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">{LOWER_ARCH.map(toothBtn)}</div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#475569] mb-1">
              Notes <span className="font-normal text-[#94A3B8]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border-2 border-[#E2E8F0] rounded-lg text-sm focus:border-[#3A6EA5] outline-none resize-none"
              placeholder="Clinical note for this image"
            />
          </div>

          {selected.length > 0 && (
            <p className="text-xs text-[#475569]">
              Selected: {selected.sort((a, b) => Number(a) - Number(b)).map((t) => `#${t}`).join(', ')}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#E2E8F0] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-[#475569] hover:bg-[#F1F5F9] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
