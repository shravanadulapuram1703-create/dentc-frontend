import { useEffect, useRef } from "react";

/**
 * Registry of dirty forms consulted by `switchOffice()`. A form registers its
 * dirty state; the switch shows ONE confirm listing every dirty form and aborts
 * on cancel. Behaviour is a confirm dialog, never a disabled switcher.
 */
interface Entry {
  label: string;
  isDirty: () => boolean;
}

const registry = new Map<number, Entry>();
let seq = 0;

/** Non-React registration (returns an unregister function). */
export function registerUnsavedGuard(label: string, isDirty: () => boolean): () => void {
  const id = ++seq;
  registry.set(id, { label, isDirty });
  return () => {
    registry.delete(id);
  };
}

/** Labels of every registered form that is currently dirty. */
export function collectDirtyLabels(): string[] {
  const labels: string[] = [];
  for (const entry of registry.values()) {
    try {
      if (entry.isDirty()) labels.push(entry.label);
    } catch {
      /* a throwing predicate is treated as clean */
    }
  }
  return labels;
}

/**
 * True when it is safe to proceed: no dirty forms, or the user confirmed.
 * `action` reads like "Switch office".
 */
export function confirmDiscardUnsaved(action: string): boolean {
  const labels = collectDirtyLabels();
  if (labels.length === 0) return true;
  return window.confirm(`Unsaved changes in ${labels.join(", ")}. ${action} anyway?`);
}

/** Register this component's dirty state for the lifetime of the mount. */
export function useUnsavedGuard(isDirty: boolean, label: string): void {
  const dirtyRef = useRef(isDirty);
  dirtyRef.current = isDirty;
  useEffect(() => registerUnsavedGuard(label, () => dirtyRef.current), [label]);
}
