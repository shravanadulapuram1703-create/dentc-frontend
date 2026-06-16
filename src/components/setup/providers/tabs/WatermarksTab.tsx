import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Save, Upload, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import {
  getProviderWatermarks,
  setProviderWatermarks,
  uploadProviderWatermarkImage,
  deleteProviderWatermarkImage,
} from "@/api/generated/endpoints/provider-setup/provider-setup";
import type { ProviderWatermarkRead } from "@/api/generated/model";

interface WatermarksTabProps {
  providerId: string;
}

const inputCls =
  "w-full px-3 py-2 border-2 border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 text-sm";

type Kind = "watermark" | "signature";

/** Provider document watermark + signature config and images. */
export default function WatermarksTab({ providerId }: WatermarksTabProps) {
  const [wm, setWm] = useState<ProviderWatermarkRead | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [opacity, setOpacity] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKind, setUploadingKind] = useState<Kind | null>(null);
  const wmFileRef = useRef<HTMLInputElement>(null);
  const sigFileRef = useRef<HTMLInputElement>(null);

  const apply = (w: ProviderWatermarkRead | null) => {
    setWm(w);
    setIsEnabled(w?.is_enabled ?? false);
    setOpacity(w?.opacity != null ? String(w.opacity) : "");
    setPosition(w?.position ?? "");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const w = await getProviderWatermarks(providerId);
      apply(w);
    } catch {
      // No watermark row yet — start from defaults; Save (PUT) will create it.
      apply(null);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await setProviderWatermarks(providerId, {
        is_enabled: isEnabled,
        opacity: opacity === "" ? null : Number(opacity),
        position: position.trim() || null,
      });
      apply(updated);
      toast.success("Watermark settings saved");
    } catch (e: unknown) {
      toast.error("Save failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (kind: Kind, file: File | undefined) => {
    if (!file) return;
    setUploadingKind(kind);
    try {
      const updated = await uploadProviderWatermarkImage(providerId, { file }, { kind });
      apply(updated);
      toast.success(`${kind === "watermark" ? "Watermark" : "Signature"} image uploaded`);
    } catch (e: unknown) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploadingKind(null);
    }
  };

  const handleDeleteImage = async (kind: Kind) => {
    if (!confirm(`Remove the ${kind} image?`)) return;
    setUploadingKind(kind);
    try {
      const updated = await deleteProviderWatermarkImage(providerId, { kind });
      apply(updated);
      toast.success("Image removed");
    } catch (e: unknown) {
      toast.error("Remove failed", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setUploadingKind(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading watermark settings…</span>
      </div>
    );
  }

  const ImageCard = ({ kind, url }: { kind: Kind; url?: string | null }) => (
    <div className="border-2 border-[#E2E8F0] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-[#1F3A5F] uppercase tracking-wide">
          {kind === "watermark" ? "Watermark Image" : "Signature Image"}
        </h4>
        {url && (
          <button
            onClick={() => void handleDeleteImage(kind)}
            disabled={uploadingKind === kind}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#DC2626] hover:underline disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
      <div className="flex items-center justify-center h-32 bg-[#F7F9FC] border border-[#E2E8F0] rounded mb-3 overflow-hidden">
        {url ? (
          <img src={url} alt={`${kind}`} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center text-[#94A3B8]">
            <ImageOff className="w-7 h-7 mb-1" />
            <span className="text-xs font-bold">No image</span>
          </div>
        )}
      </div>
      <input
        ref={kind === "watermark" ? wmFileRef : sigFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleUpload(kind, e.target.files?.[0])}
      />
      <button
        onClick={() => (kind === "watermark" ? wmFileRef : sigFileRef).current?.click()}
        disabled={uploadingKind === kind}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border-2 border-[#3A6EA5] text-[#3A6EA5] rounded-lg text-sm font-bold hover:bg-[#3A6EA5] hover:text-white transition-colors disabled:opacity-50"
      >
        {uploadingKind === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload {kind === "watermark" ? "Watermark" : "Signature"}
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-[#1F3A5F] uppercase tracking-wide">Watermarks &amp; Signature</h3>
        <p className="text-xs text-[#64748B]">Document watermark settings and image assets for this provider.</p>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <label className="flex items-center gap-2 text-sm font-semibold text-[#1E293B]">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="w-4 h-4" />
          Enable watermark
        </label>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Opacity (0–1)</label>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(e.target.value)}
            placeholder="e.g., 0.3"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-[#64748B] uppercase mb-1">Position</label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g., center, tile, bottom-right"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3A6EA5] text-white rounded-lg text-sm font-bold hover:bg-[#1F3A5F] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ImageCard kind="watermark" url={wm?.watermark_image_url} />
        <ImageCard kind="signature" url={wm?.signature_image_url} />
      </div>
    </div>
  );
}
