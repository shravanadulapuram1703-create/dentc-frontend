// The only module that talks to Jira. Three transports (see jiraConfig):
//
//   demo   → store the ticket locally, mint a synthetic key. Zero-config default.
//   proxy  → POST the whole payload to YOUR backend, which holds the Jira secret
//            and forwards to Jira. The production-safe path.
//   direct → call Jira Cloud REST v3 from the browser with a Basic-auth token.
//            Dev/testing only (token exposure + CORS).
//
// Everything returns a structured `TicketSubmitResult` (never throws to the UI),
// and every attempt is written to the local audit log by the caller/provider.
import { jiraConfig, isDemoMode, issueUrl } from "../config/jiraConfig";
import { nextDemoKey, recordAttempt } from "../lib/ticketLog";
import type {
  TicketPayload,
  TicketRecord,
  TicketSubmitResult,
} from "../types";

/** ADF (Atlassian Document Format) node — minimal shape we generate. */
type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
};

function para(text: string): AdfNode {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}
function heading(text: string): AdfNode {
  return {
    type: "heading",
    attrs: { level: 3 },
    content: [{ type: "text", text }],
  };
}

/**
 * Build the Jira issue description as ADF: the user's narrative followed by an
 * auto-captured environment block. Human-readable in Jira, machine-consistent
 * for us.
 */
export function buildAdfDescription(payload: TicketPayload): AdfNode {
  const c = payload.context;
  const nodes: AdfNode[] = [heading("Description"), para(payload.description)];

  if (payload.steps_to_reproduce.trim()) {
    nodes.push(heading("Steps to reproduce"), para(payload.steps_to_reproduce));
  }
  if (payload.expected_behavior.trim()) {
    nodes.push(heading("Expected behavior"), para(payload.expected_behavior));
  }
  if (payload.actual_behavior.trim()) {
    nodes.push(heading("Actual behavior"), para(payload.actual_behavior));
  }

  nodes.push(heading("Environment"));
  const env: Array<[string, string]> = [
    ["Reported by", `${c.user_name} (${c.user_role})`],
    ["User ID", c.user_id],
    ["Email", c.user_email || "—"],
    ["Office / Location", c.office],
    ["Module / Screen", payload.module || c.module],
    ["App version", c.app_version],
    ["Browser", c.browser],
    ["Operating system", c.operating_system],
    ["URL", c.url],
    ["Timestamp", c.timestamp],
  ];
  nodes.push({
    type: "bulletList",
    content: env.map(([k, v]) => ({
      type: "listItem",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: `${k}: `, marks: [{ type: "strong" }] },
            { type: "text", text: v },
          ],
        },
      ],
    })),
  });

  return { type: "doc", attrs: { version: 1 }, content: nodes };
}

/** Compact JSON body understood by a backend proxy (and easy to log). */
export function buildProxyBody(payload: TicketPayload) {
  return {
    project_key: jiraConfig.projectKey,
    summary: payload.title,
    issue_type: payload.issue_type,
    priority: payload.priority,
    description_adf: buildAdfDescription(payload),
    fields: {
      title: payload.title,
      description: payload.description,
      steps_to_reproduce: payload.steps_to_reproduce,
      expected_behavior: payload.expected_behavior,
      actual_behavior: payload.actual_behavior,
      module: payload.module,
    },
    context: payload.context,
    attachments: payload.attachments.map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      data_base64: a.data_base64,
    })),
  };
}

// --- Transports -------------------------------------------------------------

async function submitDemo(): Promise<TicketSubmitResult> {
  // Simulate a little latency so the UI's pending state is real.
  await new Promise((r) => setTimeout(r, 500));
  const key = nextDemoKey(jiraConfig.projectKey);
  return { ok: true, mode: "demo", issue_key: key, issue_url: issueUrl(key) ?? undefined };
}

async function submitProxy(payload: TicketPayload): Promise<TicketSubmitResult> {
  const res = await fetch(jiraConfig.proxyUrl as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
    },
    body: JSON.stringify(buildProxyBody(payload)),
  });
  if (!res.ok) {
    throw new Error(`Support service returned ${res.status} ${res.statusText}`);
  }
  const data = (await res.json().catch(() => ({}))) as {
    issue_key?: string;
    key?: string;
    issue_url?: string;
  };
  const key = data.issue_key ?? data.key ?? null;
  return {
    ok: true,
    mode: "proxy",
    issue_key: key ?? undefined,
    issue_url: data.issue_url ?? (key ? issueUrl(key) ?? undefined : undefined),
  };
}

async function submitDirect(payload: TicketPayload): Promise<TicketSubmitResult> {
  const auth = btoa(`${jiraConfig.email}:${jiraConfig.apiToken}`);
  const base = jiraConfig.baseUrl as string;

  const createRes = await fetch(`${base}/rest/api/3/issue`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      fields: {
        project: { key: jiraConfig.projectKey },
        summary: payload.title,
        issuetype: { name: payload.issue_type },
        priority: { name: payload.priority },
        description: buildAdfDescription(payload),
      },
    }),
  });

  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => "");
    throw new Error(
      `Jira create failed (${createRes.status}). ${detail.slice(0, 300)}`,
    );
  }

  const created = (await createRes.json()) as { key: string };

  // Attachments are a second call; failures here shouldn't lose the ticket.
  if (payload.attachments.length > 0) {
    try {
      const form = new FormData();
      for (const a of payload.attachments) {
        form.append("file", base64ToBlob(a.data_base64, a.type), a.name);
      }
      await fetch(`${base}/rest/api/3/issue/${created.key}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "X-Atlassian-Token": "no-check",
        },
        body: form,
      });
    } catch (err) {
      console.error("[help] attachment upload failed (issue still created)", err);
    }
  }

  return {
    ok: true,
    mode: "direct",
    issue_key: created.key,
    issue_url: issueUrl(created.key) ?? undefined,
  };
}

/**
 * File a support ticket via the active transport. Always resolves — a failure
 * comes back as `{ ok: false, error }` and is recorded (with retry preserved).
 */
export async function submitTicket(
  payload: TicketPayload,
): Promise<TicketSubmitResult> {
  try {
    let result: TicketSubmitResult;
    switch (jiraConfig.mode) {
      case "proxy":
        result = await submitProxy(payload);
        break;
      case "direct":
        result = await submitDirect(payload);
        break;
      default:
        result = await submitDemo();
    }
    recordAttempt(payload, {
      issue_key: result.issue_key ?? null,
      issue_url: result.issue_url ?? null,
      mode: result.mode,
      status: isDemoMode ? "Submitted" : "Open",
    });
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected error filing the ticket.";
    recordAttempt(payload, {
      issue_key: null,
      issue_url: null,
      mode: jiraConfig.mode,
      status: "Failed",
      error: message,
    });
    return { ok: false, mode: jiraConfig.mode, error: message };
  }
}

/**
 * Fetch the reporter's tickets for the "My Tickets" panel. Demo mode reads the
 * local log; other modes are best-effort remote reads that fall back to the
 * local cache (the direct/proxy backend may not expose a list, or CORS blocks).
 */
export async function fetchMyTickets(
  reporterId: string,
  localFallback: TicketRecord[],
): Promise<{ tickets: TicketRecord[]; source: "remote" | "local" }> {
  if (jiraConfig.mode === "proxy" && jiraConfig.proxyUrl) {
    try {
      const res = await fetch(
        `${jiraConfig.proxyUrl}?reporter=${encodeURIComponent(reporterId)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}`,
          },
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { tickets?: TicketRecord[] };
        if (Array.isArray(data.tickets)) {
          return { tickets: data.tickets, source: "remote" };
        }
      }
    } catch {
      /* fall through to local cache */
    }
  }
  return { tickets: localFallback, source: "local" };
}

// --- helpers ----------------------------------------------------------------

function base64ToBlob(b64: string, type: string): Blob {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: type || "application/octet-stream" });
}
