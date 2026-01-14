interface FooterActionsProps {
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function FooterActions({
  onSave,
  onDelete,
  onClose,
}: FooterActionsProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t-2 border-[#E2E8F0] p-4 flex justify-between">
      <button
        onClick={onDelete}
        className="bg-[#EF4444] text-white px-6 py-2 rounded-lg hover:bg-[#DC2626] transition-colors font-medium shadow-md"
        aria-label="Delete patient"
      >
        DELETE PATIENT
      </button>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="bg-white text-[#1F3A5F] border-2 border-[#1F3A5F] px-6 py-2 rounded-lg hover:bg-[#F7F9FC] transition-colors font-medium"
          aria-label="Cancel and close"
        >
          CANCEL
        </button>
        <button
          onClick={onSave}
          className="bg-[#3A6EA5] text-white px-8 py-2 rounded-lg hover:bg-[#1F3A5F] transition-colors font-medium shadow-md"
          aria-label="Save patient information"
        >
          SAVE
        </button>
      </div>
    </div>
  );
}
