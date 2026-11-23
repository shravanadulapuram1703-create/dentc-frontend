import { Component, type ErrorInfo, type ReactNode } from "react";

// First error boundary of the app (07 §2.3, §9.4). Two cases:
//  - a stale deploy: a hashed chunk of the previous build is gone (404, or the index.html fallback
//    served as JavaScript) -> "A new version is available" with Reload;
//  - any other render error -> a message instead of a blank application.

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|Unable to preload CSS|is not a valid JavaScript MIME type/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_ERROR.test(message);
}

/** Set by the `vite:preloadError` listener in ReportsEntry (preload failures of lazy chunks). */
let preloadFailed = false;
export function markPreloadFailed(): void {
  preloadFailed = true;
}

interface Props {
  children: ReactNode;
}
interface State {
  error: unknown;
}

export class ReportsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error("Reports module error", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = preloadFailed || isChunkLoadError(error);
    return (
      <div role="alert" className="mx-auto mt-16 max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">
          {stale ? "A new version is available" : "Reports could not be displayed"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {stale
            ? "The application was updated while this page was open. Reload to continue."
            : "Something went wrong while showing this page. Reload to try again."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-[#1F3A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#162b47]"
        >
          Reload
        </button>
      </div>
    );
  }
}
