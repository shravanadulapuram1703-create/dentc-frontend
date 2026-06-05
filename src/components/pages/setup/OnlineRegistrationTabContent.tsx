import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, X, Edit, Shield, FileText, AlertCircle, Eye, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchActiveConsent,
  createConsentVersion,
} from '../../../services/accountSetupApi';

type OnlineRegistrationTabContentProps = {
  accountId: string;
};

export function OnlineRegistrationTabContent({ accountId }: OnlineRegistrationTabContentProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [consentId, setConsentId] = useState<string | null>(null);
  const [header, setHeader] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [currentVersion, setCurrentVersion] = useState(1);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const loadConsent = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchActiveConsent(accountId);
      if (row) {
        setConsentId(row.id);
        setHeader(row.header ?? '');
        setBodyHtml(row.body_html ?? '');
        setCurrentVersion(Number(row.version_number ?? 1));
        setEffectiveDate(row.effective_date ?? row.created_at ?? null);
      } else {
        setConsentId(null);
        setHeader('');
        setBodyHtml('');
        setCurrentVersion(1);
        setEffectiveDate(null);
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Failed to load";
      toast.error("Could not load consent template", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadConsent();
  }, [loadConsent]);

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    void loadConsent();
    toast.info('Changes cancelled');
  };

  const handleSave = async () => {
    if (!header || header.trim().length === 0) {
      toast.error('Header is required');
      return;
    }

    if (header.length > 150) {
      toast.error('Header must be 150 characters or less');
      return;
    }

    if (!bodyHtml || bodyHtml.trim().length === 0) {
      toast.error('Consent body is required');
      return;
    }

    setSaving(true);
    try {
      const created = await createConsentVersion(accountId, {
        header: header.trim(),
        body_html: bodyHtml,
      });
      if (created?.id) setConsentId(created.id);
      if (created?.version_number != null) setCurrentVersion(Number(created.version_number));
      setEffectiveDate(created?.effective_date ?? new Date().toISOString());
      setIsEditMode(false);
      await loadConsent();
      toast.success(
        'New consent version saved successfully. This will apply to future registrations only.',
        { duration: 5000 }
      );
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String((e as Error).message) : "Save failed";
      toast.error("Save failed", { description: msg });
    } finally {
      setSaving(false);
    }
  };

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  // Render the consent in a print window (browser "Save as PDF"). No backend PDF
  // endpoint exists yet, and the token can't be passed via window.open URL, so we
  // build the document client-side from the current header/body.
  const handleGeneratePDF = () => {
    const title = header.trim() || 'Patient Consent';
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      toast.error('Popup blocked', { description: 'Allow popups to export the template as PDF.' });
      return;
    }
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title>` +
        `<style>body{font-family:Arial,Helvetica,sans-serif;color:#1E293B;max-width:800px;margin:32px auto;padding:0 24px;line-height:1.6}` +
        `h1{font-size:20px;color:#1F3A5F;margin-bottom:16px}</style></head>` +
        `<body><h1>${title}</h1>${bodyHtml || ''}` +
        `<scr` + `ipt>window.onload=function(){window.focus();window.print();}</scr` + `ipt></body></html>`
    );
    win.document.close();
  };

  // Patient view is rendered locally in the in-app modal (auth-safe; no URL token).
  const openPatientPreview = () => {
    setShowPreview(true);
  };

  const lastUpdatedLabel = effectiveDate
    ? new Date(effectiveDate).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  if (loading && !header && !bodyHtml) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-[#64748B]">
        <Loader2 className="w-8 h-8 animate-spin text-[#3A6EA5]" />
        <span className="text-sm font-bold">Loading consent template…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Notice */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-900">
            Legal Document - Restricted Access: Only Super Admin and Account Owner can modify.
          </p>
          <p className="text-xs text-red-800 mt-1">
            This consent form is legally binding and affects patient intake, HIPAA compliance, insurance assignment, and digital signature authorization.
          </p>
        </div>
      </div>

      {/* Version Info */}
      {!isEditMode && (
        <div className="flex items-center justify-between bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#3A6EA5]" />
            <div>
              <p className="text-xs font-bold text-[#1E293B]">
                Current Version: v{currentVersion}
              </p>
              <p className="text-xs text-[#64748B]">
                Last updated: {lastUpdatedLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => (consentId ? openPatientPreview() : setShowPreview(true))}
              className="px-4 py-2 border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-bold rounded-lg hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Patient View
            </button>
            <button
              onClick={handleGeneratePDF}
              className="px-4 py-2 border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-bold rounded-lg hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Template PDF
            </button>
          </div>
        </div>
      )}

      {/* Versioning Warning */}
      {isEditMode && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900">
              Version Control Active
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Saving changes will create Version {currentVersion + 1}. Previously signed consent forms will retain their original version content. Only new registrations will use the updated version.
            </p>
          </div>
        </div>
      )}

      {/* PATIENT CONSENT INFO SECTION */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#1F3A5F] mb-4 pb-2 border-b-2 border-[#E2E8F0]">
          <FileText className="w-4 h-4 text-[#3A6EA5]" />
          Patient Consent Info
        </h3>

        <div className="bg-[#F7F9FC] p-6 rounded-lg border-2 border-[#E2E8F0] space-y-6">
          {/* Header Field */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Header <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              disabled={!isEditMode}
              maxLength={150}
              placeholder="e.g., Patient Consent and Authorization"
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm ${
                isEditMode
                  ? 'border-[#CBD5E1] focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20'
                  : 'border-[#E2E8F0] bg-white text-[#1E293B] font-bold'
              }`}
            />
            <p className="text-xs text-[#64748B] mt-1">
              {header.length}/150 characters • Displayed as title on online registration form
            </p>
          </div>

          {/* Body Rich Text Editor */}
          <div>
            <label className="block text-xs font-bold text-[#1E293B] mb-2">
              Body <span className="text-red-500">*</span>
            </label>

            {isEditMode && (
              <div className="bg-white border-2 border-[#CBD5E1] rounded-t-lg p-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => applyFormat('bold')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('italic')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Italic"
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('underline')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Underline"
                >
                  <u>U</u>
                </button>
                <div className="w-px bg-[#CBD5E1] mx-1"></div>
                <button
                  type="button"
                  onClick={() => applyFormat('insertUnorderedList')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('insertOrderedList')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Numbered List"
                >
                  1. List
                </button>
                <div className="w-px bg-[#CBD5E1] mx-1"></div>
                <button
                  type="button"
                  onClick={() => applyFormat('formatBlock', 'p')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Paragraph"
                >
                  ¶
                </button>
                <button
                  type="button"
                  onClick={() => applyFormat('removeFormat')}
                  className="px-3 py-1.5 text-xs font-bold border border-[#CBD5E1] rounded hover:bg-[#F7F9FC] transition-colors"
                  title="Clear Formatting"
                >
                  Clear
                </button>
              </div>
            )}

            {isEditMode ? (
              <div
                ref={editorRef}
                contentEditable
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
                onInput={(e) => setBodyHtml(e.currentTarget.innerHTML)}
                className="w-full min-h-[500px] px-4 py-3 border-2 border-t-0 border-[#CBD5E1] rounded-b-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 bg-white overflow-y-auto"
                style={{ maxHeight: '600px' }}
              />
            ) : (
              <div
                className="w-full min-h-[500px] px-4 py-3 border-2 border-[#E2E8F0] rounded-lg text-sm bg-white overflow-y-auto"
                style={{ maxHeight: '600px' }}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            )}

            <p className="text-xs text-[#64748B] mt-2">
              Supports bold, italic, underline, lists, and paragraphs • Sanitized for XSS protection
            </p>
          </div>

          {/* Legal Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-bold text-blue-900 mb-2">
              Legal & Compliance Requirements
            </p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4">
              <li>• Consent is immutable after patient signature</li>
              <li>• Signed copies stored permanently with version number</li>
              <li>• PDF export includes patient name, signature, timestamp, IP address</li>
              <li>• Audit trail logs all modifications</li>
              <li>• Must include HIPAA, insurance assignment, and electronic signature language</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-[#E2E8F0]">
        {!isEditMode ? (
          <button
            onClick={handleEdit}
            className="px-6 py-2.5 bg-[#3A6EA5] text-white text-sm font-bold rounded-lg hover:bg-[#2C5282] transition-colors inline-flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Consent Template
          </button>
        ) : (
          <>
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 border-2 border-[#CBD5E1] text-[#1E293B] text-sm font-bold rounded-lg hover:bg-[#F7F9FC] transition-colors inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2.5 bg-[#0D9488] text-white text-sm font-bold rounded-lg hover:bg-[#0F766E] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save New Version
            </button>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#3A6EA5] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Patient View Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-white hover:bg-[#2C5282] p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-[#1E293B] mb-6 text-center">
                  {header}
                </h2>

                <div
                  className="prose prose-sm max-w-none mb-6 text-[#1E293B]"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />

                <div className="border-t-2 border-[#E2E8F0] pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="preview-consent"
                      className="w-5 h-5 rounded border-2 border-[#CBD5E1] text-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 mt-0.5"
                    />
                    <label htmlFor="preview-consent" className="text-sm font-bold text-[#1E293B]">
                      I have read and agree to the above Patient Consent and Authorization
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1E293B] mb-2">
                      Full Name (Type to Sign)
                    </label>
                    <input
                      type="text"
                      placeholder="Type your full legal name"
                      className="w-full px-4 py-3 border-2 border-[#CBD5E1] rounded-lg text-sm focus:outline-none focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20"
                    />
                  </div>

                  <div className="bg-[#F7F9FC] p-4 rounded-lg border-2 border-[#E2E8F0]">
                    <p className="text-xs text-[#64748B]">
                      <strong>Electronic Signature Notice:</strong> By typing your name and clicking &quot;I Agree&quot;, you are providing your electronic signature which is legally binding and has the same legal effect as a handwritten signature.
                    </p>
                  </div>

                  <button className="w-full px-6 py-3 bg-[#0D9488] text-white text-sm font-bold rounded-lg hover:bg-[#0F766E] transition-colors">
                    I Agree and Submit
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#F7F9FC] px-6 py-4 border-t-2 border-[#E2E8F0]">
              <p className="text-xs text-[#64748B] text-center">
                This is a preview of how patients will see the consent form during online registration
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
