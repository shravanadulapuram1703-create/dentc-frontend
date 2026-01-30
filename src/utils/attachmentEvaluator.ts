import {
  CODE_ATTACHMENT_RULES,
  CATEGORY_ATTACHMENT_RULES,
  type AttachmentRule,
  type AttachmentRuleConfig,
} from "../data/attachmentRules";

export interface ClaimProcedureData {
  code: string;
  category?: string;
  description?: string;
  tooth?: string;
}

export interface AttachmentEvaluationItem {
  code: string;
  category?: string;
  rule: AttachmentRule;
  reason: string;
  source: AttachmentRuleConfig["source"];
  expectedAttachments?: string[];
}

export type AttachmentValidationSeverity = "warning" | "error" | null;

export interface AttachmentEvaluationResult {
  validationSeverity: AttachmentValidationSeverity;
  validationMessages: string[];
  items: AttachmentEvaluationItem[];
}

function normalizeCategory(category?: string): string | undefined {
  if (!category) return undefined;
  return category.trim().toUpperCase();
}

function getRuleForProcedure(proc: ClaimProcedureData): AttachmentEvaluationItem {
  const code = proc.code?.trim();
  const category = normalizeCategory(proc.category);

  // Safety fallback: if code is missing, treat as error-worthy.
  if (!code) {
    return {
      code: "",
      category,
      rule: "REQUIRED",
      reason: "Missing procedure code.",
      source: "ADMIN_OVERRIDE",
    };
  }

  // 1) Code-level overrides (highest priority)
  const codeRule = CODE_ATTACHMENT_RULES[code];
  if (codeRule) {
    return {
      code,
      category,
      rule: codeRule.rule,
      reason: codeRule.reason,
      source: codeRule.source,
      expectedAttachments: codeRule.expectedAttachments,
    };
  }

  // 2) Category-level fallback
  if (category && CATEGORY_ATTACHMENT_RULES[category]) {
    const catRule = CATEGORY_ATTACHMENT_RULES[category];
    return {
      code,
      category,
      rule: catRule.rule,
      reason: catRule.reason,
      source: catRule.source,
      expectedAttachments: catRule.expectedAttachments,
    };
  }

  // 3) Default if we have no mapping
  return {
    code,
    category,
    rule: "CONDITIONAL",
    reason:
      "No attachment rule mapping found for this code/category; documentation may be required depending on payer.",
    source: "PAYER_NORM",
  };
}

/**
 * Evaluate attachment expectations for a set of claim procedures.
 *
 * Important: this function does NOT know whether attachments were uploaded.
 * It only flags when documentation is typically expected, so UI can guide users.
 *
 * - REQUIRED / CONDITIONAL => warning (informational)
 * - NOT_REQUIRED => no message
 * - Missing/invalid data => error
 */
export function evaluateClaimAttachments(
  procedures: ClaimProcedureData[],
): AttachmentEvaluationResult {
  const items = (procedures || []).map(getRuleForProcedure);

  const validationMessages: string[] = [];
  let severity: AttachmentValidationSeverity = null;

  // Hard errors only for invalid input (missing codes etc.)
  if (items.some((i) => !i.code)) {
    severity = "error";
    validationMessages.push(
      "One or more procedures are missing a procedure code; cannot validate attachment requirements.",
    );
    return { validationSeverity: severity, validationMessages, items };
  }

  // Informational warnings if any procedure typically requires documentation.
  const noteworthy = items.filter(
    (i) => i.rule === "REQUIRED" || i.rule === "CONDITIONAL",
  );

  if (noteworthy.length > 0) {
    severity = "warning";
    noteworthy.slice(0, 6).forEach((i) => {
      const cat = i.category ? ` (${i.category})` : "";
      const label =
        i.rule === "REQUIRED"
          ? "Documentation required"
          : "Documentation may be required";
      validationMessages.push(`${i.code}${cat}: ${label} — ${i.reason}`);
    });
    if (noteworthy.length > 6) {
      validationMessages.push(
        `+${noteworthy.length - 6} more procedures with documentation expectations`,
      );
    }
  }

  return { validationSeverity: severity, validationMessages, items };
}

