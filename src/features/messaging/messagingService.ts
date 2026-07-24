// messagingService — the single swap point between the messaging UI and its
// backend, plus the (real) user-directory access layer.
//
//   • Transport: LocalMessagingTransport (default, client-side simulation) or
//     RealMessagingTransport (when VITE_MESSAGING_BACKEND=api). Hooks talk to
//     `getMessagingTransport()`, never to a concrete transport.
//   • Directory: the ONE place that touches the generated Orval client. The user
//     list is real (`GET /api/v1/users`); conversations/messages/presence come
//     from the transport.
//
// See docs/messaging/MESSAGING_BACKEND_REQUIREMENTS.md for the backend that
// makes RealMessagingTransport light up.

import { listUsers } from "@/api/generated/endpoints/users/users";
import type { UserRead } from "@/api/generated/model";
import { mapUserRead, type Attachment, type ChatUser } from "./messagingModel";
import type { MessagingTransport } from "./transport/types";
import { LocalMessagingTransport } from "./transport/localTransport";
import { RealMessagingTransport } from "./transport/realTransport";

/** True when the app is configured to talk to a real messaging backend. */
export const USE_REAL_BACKEND: boolean =
  (import.meta.env.VITE_MESSAGING_BACKEND as string | undefined) === "api";

let transport: MessagingTransport | null = null;

/** Singleton transport for the app lifetime (survives panel open/close). */
export function getMessagingTransport(): MessagingTransport {
  if (!transport) {
    transport = USE_REAL_BACKEND
      ? new RealMessagingTransport()
      : new LocalMessagingTransport();
  }
  return transport;
}

// ---------------------------------------------------------------------------
// User directory (real backend)
// ---------------------------------------------------------------------------

export interface DirectoryQuery {
  search?: string;
  page?: number;
  size?: number;
}

export interface DirectoryResult {
  users: ChatUser[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Search the org's users (people you can message). Wraps the generated
 * `listUsers`, passes snake_case params through unchanged, maps to ChatUser and
 * excludes the signed-in user. Fault-tolerant: returns an empty page on error.
 */
export async function fetchDirectory(
  selfId: string,
  query: DirectoryQuery = {},
): Promise<DirectoryResult> {
  try {
    const res = await listUsers({
      search: query.search?.trim() || undefined,
      is_active: true,
      page: query.page ?? 1,
      size: query.size ?? 50,
      sort: "first_name",
      order: "asc",
    });
    const items = (res?.items ?? []) as UserRead[];
    const users = items
      .map(mapUserRead)
      .filter((u) => u.id !== selfId);
    return {
      users,
      total: res?.meta?.total ?? users.length,
      page: res?.meta?.page ?? 1,
      pages: res?.meta?.pages ?? 1,
    };
  } catch {
    return { users: [], total: 0, page: 1, pages: 1 };
  }
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

/** Max inline attachment size for the simulation (real storage is a backend gap). */
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024; // 3 MB

export interface AttachmentResult {
  ok: boolean;
  attachment?: Attachment;
  error?: string;
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function imageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Turn a picked/dropped File into an Attachment. In simulation mode the bytes
 * are inlined as a data URL (size-capped); a real backend would upload and
 * return a URL instead (see MESSAGING_BACKEND_REQUIREMENTS §"File Upload").
 */
export async function fileToAttachment(file: File): Promise<AttachmentResult> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB. In demo mode, attachments are capped at ${(MAX_ATTACHMENT_BYTES / 1024 / 1024).toFixed(0)} MB (real object storage is a backend gap).`,
    };
  }
  try {
    const kind = isImage(file.type) ? "image" : "file";
    const dataUrl = await readAsDataUrl(file);
    const dims = kind === "image" ? await imageDimensions(dataUrl) : null;
    return {
      ok: true,
      attachment: {
        id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        kind,
        data_url: dataUrl,
        url: null,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
      },
    };
  } catch {
    return { ok: false, error: `Could not read "${file.name}".` };
  }
}

/** Resolve the best display source for an attachment (data URL or remote url). */
export function attachmentSrc(a: Attachment): string {
  return a.data_url || a.url || "";
}
