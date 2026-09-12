// Server-rendered patient reports (backend PRINT-1).
//
// `GET /patients/{id}/reports/{overview|ledger|transactions|insurance}` return
// the same reports the client-side jsPDF builders produce, rendered from the
// canonical data with the office letterhead and a PRINT audit row. The Print
// buttons try the server first and fall back to the local builder when the
// route is unreachable (older backend, network error), so printing never
// silently does nothing.
//
// The tab is opened *before* the fetch: a `window.open` issued after an await
// is treated as un-gestured and blocked by popup blockers.

import { toast } from 'sonner';

export interface ServerReportOptions {
  /** Fetches the PDF from the generated client (`responseType: 'blob'`). */
  fetch_pdf: () => Promise<Blob>;
  /** Client-side builder used when the server route fails. */
  fallback: () => void;
  /** Report name for the toast shown when falling back. */
  label: string;
}

/** Placeholder shown in the pre-opened tab while the server renders (the
 *  Overview report can take tens of seconds on a large account). */
function showPreparing(tab: Window | null, label: string): void {
  if (!tab) return;
  try {
    tab.document.title = `Preparing ${label}…`;
    tab.document.body.innerHTML =
      '<div style="font:14px system-ui,sans-serif;color:#334155;padding:48px;text-align:center">' +
      `<div style="font-weight:600;margin-bottom:8px">Preparing ${label}…</div>` +
      '<div style="color:#64748B">The report opens here as soon as it is ready. You can close this tab to cancel.</div></div>';
  } catch {
    /* about:blank document not writable in this browser — the tab still opens the PDF */
  }
}

export async function openServerReport(opts: ServerReportOptions): Promise<void> {
  const tab = window.open('', '_blank');
  showPreparing(tab, opts.label);
  try {
    const blob = await opts.fetch_pdf();
    if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Empty report');
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
      // The browser's PDF viewer handles window.print(); give it a moment to
      // load before asking for the print dialog (the viewer keeps its own
      // print button either way).
      window.setTimeout(() => {
        try {
          tab.focus();
          tab.print();
        } catch {
          /* viewer not ready or cross-window print blocked — the tab is open */
        }
      }, 1200);
    } else {
      window.open(url, '_blank');
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  } catch (err) {
    tab?.close();
    const status = (err as { response?: { status?: number } })?.response?.status;
    toast.message(`Server report unavailable${status ? ` (${status})` : ''} — printing from screen data`, {
      description: opts.label,
    });
    opts.fallback();
  }
}
