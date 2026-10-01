// Persisted minimize state for the two patient-shell blocks (identity banner +
// icon tab strip). Each collapses independently so the user can reclaim vertical
// workspace on every patient tab; the choice persists per browser.
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dentc:patient_shell:collapsed';

export interface PatientShellCollapsed {
  header_collapsed: boolean;
  nav_collapsed: boolean;
}

const DEFAULTS: PatientShellCollapsed = { header_collapsed: false, nav_collapsed: false };

function readStored(): PatientShellCollapsed {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PatientShellCollapsed>;
    return {
      header_collapsed: parsed.header_collapsed === true,
      nav_collapsed: parsed.nav_collapsed === true,
    };
  } catch {
    return DEFAULTS;
  }
}

/** Persisted collapsed state for the two patient-shell blocks. */
export function usePatientShellCollapse() {
  const [state, setState] = useState<PatientShellCollapsed>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — keep in-memory state only */
    }
  }, [state]);

  const toggleHeader = useCallback(
    () => setState((s) => ({ ...s, header_collapsed: !s.header_collapsed })),
    [],
  );
  const toggleNav = useCallback(() => setState((s) => ({ ...s, nav_collapsed: !s.nav_collapsed })), []);

  return { ...state, toggleHeader, toggleNav };
}
