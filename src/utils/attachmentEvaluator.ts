/**
 * ==================================================================================
 * ATTACHMENT REQUIREMENT EVALUATOR
 * ==================================================================================
 * 
 * PURPOSE:
 * - Evaluates attachment requirements for procedures and claims
 * - Implements decision hierarchy: Code-level → Category-level
 * - Provides audit trail for attachment determinations
 * 
 * BUSINESS RULES:
 * 1. Code-level rules ALWAYS override category-level rules
 * 2. Category rules are fallback only
 * 3. Every procedure MUST have an attachment rule
 * 4. Evaluation is deterministic and auditable
 * 
 * ==================================================================================
 */

import {
  AttachmentRule,
  AttachmentRuleConfig,
  CODE_ATTACHMENT_RULES,
  CATEGORY_ATTACHMENT_RULES,
  ATTACHMENT_RULES_VERSION
} from '../data/attachmentRules';
import { procedureCodes, ProcedureCode } from '../data/procedureCodes';

/**
 * ==================================================================================
 * UI-DERIVED DOCUMENTATION EXPECTATION
 * ==================================================================================
 * 
 * PURPOSE:
 * - Provides UI-friendly language for attachment rules
 * - Derived from AttachmentRule (billing intelligence)
 * - Used ONLY for display (Docs column, tooltips, etc.)
 * - NOT used in claim validation logic
 * 
 * DISTINCTION:
 * - AttachmentRule = Billing intelligence (payer-driven)
 * - DocumentationExpectation = UI semantics (staff-facing)
 * 
 * IMPLEMENTATION:
 * - Computed at procedure save time
 * - Stored alongside attachmentRule
 * - Deterministic mapping (frozen and documented)
 * ==================================================================================
 */
export type DocumentationExpectation = 
  | 'MOSTLY_REQUIRED'
  | 'SOMETIMES_REQUIRED'
  | 'NOT_REQUIRED';

/**
 * Maps AttachmentRule (billing intelligence) to DocumentationExpectation (UI semantics)
 * 
 * THIS MAPPING IS FROZEN AND MUST NOT CHANGE WITHOUT DOCUMENTATION
 * 
 * @param rule - The attachment rule from billing intelligence
 * @returns UI-friendly documentation expectation
 */
export function mapRuleToExpectation(
  rule: AttachmentRule
): DocumentationExpectation {
  switch (rule) {
    case 'REQUIRED':
      return 'MOSTLY_REQUIRED';

    case 'CONDITIONAL':
      return 'SOMETIMES_REQUIRED';

    case 'NOT_REQUIRED':
    default:
      return 'NOT_REQUIRED';
  }
}

/**
 * Represents the result of an attachment evaluation
 * with full audit trail
 */
export interface AttachmentEvaluation {
  rule: AttachmentRule;
  reason: string;
  source: 'CODE_LEVEL' | 'CATEGORY_LEVEL' | 'DEFAULT';
  metadata: {
    procedureCode?: string;
    procedureCategory?: string;
    configSource?: 'INDUSTRY_STANDARD' | 'CLEARINGHOUSE' | 'PAYER_NORM' | 'ADMIN_OVERRIDE';
    evaluatedAt: string;
    rulesVersion: string;
  };
}

/**
 * Represents the result of claim-level attachment evaluation
 */
export interface ClaimAttachmentEvaluation {
  hasRequired: boolean;
  hasConditional: boolean;
  requiredProcedures: string[]; // List of procedure codes requiring attachments
  conditionalProcedures: string[]; // List of conditional procedure codes
  validationSeverity: 'error' | 'warning' | 'info' | null;
  validationMessages: string[];
  auditTrail: AttachmentEvaluation[];
}

/**
 * ==================================================================================
 * CORE EVALUATION FUNCTIONS
 * ==================================================================================
 */

/**
 * Evaluates attachment requirement for a single procedure
 * 
 * DECISION HIERARCHY:
 * 1. Check CODE_ATTACHMENT_RULES (highest priority)
 * 2. Check CATEGORY_ATTACHMENT_RULES (fallback)
 * 3. Default to NOT_REQUIRED (safest default)
 * 
 * @param procedureCode - The CDT code (e.g., "D3330")
 * @param procedureCategory - The category (e.g., "ENDODONTICS")
 * @returns AttachmentEvaluation with full audit trail
 */
export function evaluateProcedureAttachment(
  procedureCode: string,
  procedureCategory?: string
): AttachmentEvaluation {
  const timestamp = new Date().toISOString();
  const rulesVersion = ATTACHMENT_RULES_VERSION.version;

  // STEP 1: Check code-level rules (HIGHEST PRIORITY)
  const codeRule = CODE_ATTACHMENT_RULES[procedureCode];
  if (codeRule) {
    return {
      rule: codeRule.rule,
      reason: codeRule.reason,
      source: 'CODE_LEVEL',
      metadata: {
        procedureCode,
        procedureCategory,
        configSource: codeRule.source,
        evaluatedAt: timestamp,
        rulesVersion
      }
    };
  }

  // STEP 2: Check category-level rules (FALLBACK)
  if (procedureCategory) {
    const categoryRule = CATEGORY_ATTACHMENT_RULES[procedureCategory];
    if (categoryRule) {
      return {
        rule: categoryRule.rule,
        reason: categoryRule.reason,
        source: 'CATEGORY_LEVEL',
        metadata: {
          procedureCode,
          procedureCategory,
          configSource: categoryRule.source,
          evaluatedAt: timestamp,
          rulesVersion
        }
      };
    }
  }

  // STEP 3: Default (should rarely happen if rules are complete)
  return {
    rule: 'NOT_REQUIRED',
    reason: 'No specific attachment rule defined for this procedure',
    source: 'DEFAULT',
    metadata: {
      procedureCode,
      procedureCategory,
      evaluatedAt: timestamp,
      rulesVersion
    }
  };
}

/**
 * Evaluates attachment requirement using procedure code data
 * Automatically looks up category from PROCEDURE_CODES
 * 
 * @param procedureCode - The CDT code (e.g., "D3330")
 * @returns AttachmentEvaluation with full audit trail
 */
export function evaluateProcedureAttachmentByCode(
  procedureCode: string
): AttachmentEvaluation {
  const procedureData = procedureCodes.find(p => p.code === procedureCode);
  const category = procedureData?.category;
  
  return evaluateProcedureAttachment(procedureCode, category);
}

/**
 * ==================================================================================
 * CLAIM-LEVEL EVALUATION
 * ==================================================================================
 */

/**
 * Interface for procedure data at claim level
 * Minimal data needed for attachment evaluation
 */
export interface ClaimProcedureData {
  code: string;
  category?: string;
  description?: string;
  tooth?: string;
  
  // 🔹 ADD THIS: Stored attachment expectation (set at procedure post time)
  attachmentRule?: AttachmentRule;
}

/**
 * Evaluates attachment requirements at claim level
 * Aggregates all procedures and determines validation severity
 * 
 * BEHAVIOR:
 * - If ANY procedure is REQUIRED → WARNING message
 * - If ANY procedure is CONDITIONAL (but none REQUIRED) → INFO message
 * - Otherwise → No message
 * 
 * CRITICAL: Warnings and Info do NOT block E-Claim submission
 * Only ERROR severity blocks submission (future scope)
 * 
 * @param procedures - Array of procedures in the claim
 * @returns ClaimAttachmentEvaluation with aggregated results
 */
export function evaluateClaimAttachments(
  procedures: ClaimProcedureData[]
): ClaimAttachmentEvaluation {
  const auditTrail: AttachmentEvaluation[] = [];
  const requiredProcedures: string[] = [];
  const conditionalProcedures: string[] = [];

  // Evaluate each procedure
  for (const proc of procedures) {
    let evaluation: AttachmentEvaluation;

    if (proc.attachmentRule) {
      // ✅ TRUST PROCEDURE METADATA (set at procedure post time)
      // This prevents drift between ledger Docs column and claim popup
      evaluation = {
        rule: proc.attachmentRule,
        reason: 'Stored procedure attachment expectation',
        source: 'CODE_LEVEL',
        metadata: {
          procedureCode: proc.code,
          procedureCategory: proc.category,
          evaluatedAt: new Date().toISOString(),
          rulesVersion: ATTACHMENT_RULES_VERSION.version
        }
      };
    } else {
      // ✅ FALLBACK for legacy data (no stored metadata)
      evaluation = evaluateProcedureAttachment(proc.code, proc.category);
    }

    auditTrail.push(evaluation);

    if (evaluation.rule === 'REQUIRED') {
      requiredProcedures.push(proc.code);
    } else if (evaluation.rule === 'CONDITIONAL') {
      conditionalProcedures.push(proc.code);
    }
  }

  // Determine validation severity and messages
  // 
  // NOTE: CRITICAL SEVERITY SEMANTICS
  // - REQUIRED attachments generate WARNING severity, not ERROR
  // - Warnings do NOT block E-Claim submission
  // - Only ERROR blocks submission (reserved for future use: missing patient data, etc.)
  let validationSeverity: 'error' | 'warning' | 'info' | null = null;
  const validationMessages: string[] = [];

  if (requiredProcedures.length > 0) {
    validationSeverity = 'warning';
    
    // Create detailed message (EXPECTATION-BASED, not enforcement)
    const procedureList = requiredProcedures.join(', ');
    validationMessages.push(
      `One or more procedures typically require supporting documentation (e.g., X-rays, narratives).`
    );
    validationMessages.push(
      `Procedures typically requiring documentation: ${procedureList}`
    );
    validationMessages.push(
      `Tip: Upload documentation before submitting to clearinghouse to avoid delays.`
    );
  } else if (conditionalProcedures.length > 0) {
    validationSeverity = 'info';
    
    const procedureList = conditionalProcedures.join(', ');
    validationMessages.push(
      `Some procedures may require documentation depending on payer requirements.`
    );
    validationMessages.push(
      `Conditional procedures: ${procedureList}`
    );
    validationMessages.push(
      `Tip: Review payer guidelines or contact payer if unsure.`
    );
  }

  return {
    hasRequired: requiredProcedures.length > 0,
    hasConditional: conditionalProcedures.length > 0,
    requiredProcedures,
    conditionalProcedures,
    validationSeverity,
    validationMessages,
    auditTrail
  };
}

/**
 * ==================================================================================
 * HELPER FUNCTIONS
 * ==================================================================================
 */

/**
 * Gets a human-readable summary of attachment requirement
 * Useful for UI display (e.g., in procedure lists, ledger)
 * 
 * @param rule - The attachment rule
 * @returns User-friendly summary
 */
export function getAttachmentRuleSummary(rule: AttachmentRule): string {
  switch (rule) {
    case 'REQUIRED':
      return 'Attachment Required';
    case 'CONDITIONAL':
      return 'Attachment May Be Required';
    case 'NOT_REQUIRED':
      return 'No Attachment Needed';
    default:
      return 'Unknown';
  }
}

/**
 * Gets an icon/indicator for attachment requirement
 * Useful for UI display in tables
 * 
 * @param rule - The attachment rule
 * @returns Icon indicator
 */
export function getAttachmentRuleIndicator(rule: AttachmentRule): string {
  switch (rule) {
    case 'REQUIRED':
      return '📎'; // Required
    case 'CONDITIONAL':
      return '⚠️'; // May be required
    case 'NOT_REQUIRED':
      return '—'; // Not needed
    default:
      return '?';
  }
}

/**
 * ==================================================================================
 * UI-DERIVED DOCUMENTATION EXPECTATION HELPERS
 * ==================================================================================
 * These functions provide UI-friendly display for the Docs column
 * ==================================================================================
 */

/**
 * Renders icon for Docs column based on documentation expectation
 * 
 * PURPOSE: Visual indicator in ledger/procedure list
 * NOT USED: In claim validation logic
 * 
 * @param expectation - UI-derived documentation expectation
 * @returns Icon with color semantics
 */
export function renderDocsIcon(expectation: DocumentationExpectation): string | null {
  switch (expectation) {
    case 'MOSTLY_REQUIRED':
      return '📎'; // Red indicator (most payers expect this)

    case 'SOMETIMES_REQUIRED':
      return '📎?'; // Orange indicator (some payers may require)

    case 'NOT_REQUIRED':
    default:
      return null; // No icon (not expected)
  }
}

/**
 * Gets tooltip text for Docs column
 * 
 * @param expectation - UI-derived documentation expectation
 * @returns User-friendly tooltip text
 */
export function getDocsTooltip(expectation: DocumentationExpectation): string {
  switch (expectation) {
    case 'MOSTLY_REQUIRED':
      return 'Documentation typically required by most payers';

    case 'SOMETIMES_REQUIRED':
      return 'Documentation may be required depending on payer';

    case 'NOT_REQUIRED':
    default:
      return 'Documentation not typically required';
  }
}

/**
 * Gets CSS color class for Docs icon
 * 
 * @param expectation - UI-derived documentation expectation
 * @returns Tailwind color class
 */
export function getDocsIconColor(expectation: DocumentationExpectation): string {
  switch (expectation) {
    case 'MOSTLY_REQUIRED':
      return 'text-red-600'; // Red (high expectation)

    case 'SOMETIMES_REQUIRED':
      return 'text-orange-500'; // Orange (medium expectation)

    case 'NOT_REQUIRED':
    default:
      return 'text-slate-400'; // Gray (no expectation)
  }
}

/**
 * Determines if a claim should show attachment warning modal
 * 
 * @param evaluation - Claim attachment evaluation result
 * @returns True if modal should be shown
 */
export function shouldShowAttachmentModal(
  evaluation: ClaimAttachmentEvaluation
): boolean {
  return evaluation.validationSeverity !== null;
}

/**
 * ==================================================================================
 * AUDIT & DEBUGGING UTILITIES
 * ==================================================================================
 */

/**
 * Generates a full audit report for a claim's attachment evaluation
 * Useful for debugging and compliance
 * 
 * @param evaluation - Claim attachment evaluation result
 * @returns Formatted audit report
 */
export function generateAttachmentAuditReport(
  evaluation: ClaimAttachmentEvaluation
): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('ATTACHMENT REQUIREMENT AUDIT REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Rules Version: ${ATTACHMENT_RULES_VERSION.version}`);
  lines.push('');
  lines.push('SUMMARY:');
  lines.push(`- Has Required Attachments: ${evaluation.hasRequired ? 'YES' : 'NO'}`);
  lines.push(`- Has Conditional Attachments: ${evaluation.hasConditional ? 'YES' : 'NO'}`);
  lines.push(`- Validation Severity: ${evaluation.validationSeverity || 'NONE'}`);
  lines.push('');
  
  if (evaluation.validationMessages.length > 0) {
    lines.push('VALIDATION MESSAGES:');
    evaluation.validationMessages.forEach((msg, idx) => {
      lines.push(`${idx + 1}. ${msg}`);
    });
    lines.push('');
  }
  
  lines.push('PROCEDURE EVALUATIONS:');
  evaluation.auditTrail.forEach((audit, idx) => {
    lines.push(`\nProcedure ${idx + 1}:`);
    lines.push(`  Code: ${audit.metadata.procedureCode || 'N/A'}`);
    lines.push(`  Category: ${audit.metadata.procedureCategory || 'N/A'}`);
    lines.push(`  Rule: ${audit.rule}`);
    lines.push(`  Source: ${audit.source}`);
    lines.push(`  Reason: ${audit.reason}`);
    if (audit.metadata.configSource) {
      lines.push(`  Config Source: ${audit.metadata.configSource}`);
    }
  });
  
  lines.push('');
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * Exports attachment evaluation to JSON for API/storage
 * 
 * @param evaluation - Claim attachment evaluation result
 * @returns JSON-serializable object
 */
export function exportAttachmentEvaluation(
  evaluation: ClaimAttachmentEvaluation
): Record<string, unknown> {
  return {
    hasRequired: evaluation.hasRequired,
    hasConditional: evaluation.hasConditional,
    requiredProcedures: evaluation.requiredProcedures,
    conditionalProcedures: evaluation.conditionalProcedures,
    validationSeverity: evaluation.validationSeverity,
    validationMessages: evaluation.validationMessages,
    auditTrail: evaluation.auditTrail,
    rulesVersion: ATTACHMENT_RULES_VERSION.version,
    evaluatedAt: new Date().toISOString()
  };
}