/**
 * ==================================================================================
 * ATTACHMENT RULES CONFIGURATION
 * ==================================================================================
 * 
 * PURPOSE:
 * - Defines attachment requirements for dental procedures
 * - Supports claim validation and clearinghouse submission
 * - NOT based on ADA CDT (ADA does not mandate attachments)
 * - Based on industry billing standards and payer norms
 * 
 * BUSINESS RULES:
 * 1. Attachment rules are PAYER-DRIVEN, not ADA-driven
 * 2. Code-level rules ALWAYS override category-level rules
 * 3. Warnings do NOT block claim submission (only errors do)
 * 
 * DECISION HIERARCHY:
 * 1. Procedure Code (highest priority)
 * 2. Procedure Category (fallback only)
 * 
 * ATTACHMENT CLASSIFICATIONS:
 * - REQUIRED: Attachment almost always expected (e.g., RCT, Oral Surgery)
 * - CONDITIONAL: May be required depending on payer/context
 * - NOT_REQUIRED: Attachment not expected
 * 
 * VERSION: 1.0.0
 * LAST UPDATED: 2025-01-24
 * ==================================================================================
 */

export type AttachmentRule = 'REQUIRED' | 'CONDITIONAL' | 'NOT_REQUIRED';

export interface AttachmentRuleConfig {
  rule: AttachmentRule;
  reason: string;
  effectiveDate?: string;
  source: 'INDUSTRY_STANDARD' | 'CLEARINGHOUSE' | 'PAYER_NORM' | 'ADMIN_OVERRIDE';
  
  // 🔹 FUTURE-PROOF FIELDS (no behavior change)
  confidence?: 'BASELINE' | 'CONTEXT_DEPENDENT' | 'PAYER_SENSITIVE';
  expectedAttachments?: string[]; // e.g. ['XRAY', 'NARRATIVE', 'PHOTO']
}

/**
 * ==================================================================================
 * CODE-LEVEL ATTACHMENT RULES
 * ==================================================================================
 * These rules take HIGHEST PRIORITY and override category-level rules.
 * Only define exceptions here - most codes inherit from category rules.
 */
export const CODE_ATTACHMENT_RULES: Record<string, AttachmentRuleConfig> = {
  // ===== ENDODONTICS - REQUIRED =====
  'D3220': {
    rule: 'REQUIRED',
    reason: 'Pulp cap procedures typically require pre-op/post-op radiographs for documentation',
    source: 'INDUSTRY_STANDARD'
  },
  'D3230': {
    rule: 'REQUIRED',
    reason: 'Pulpal therapy requires radiographic evidence of treatment necessity',
    source: 'INDUSTRY_STANDARD'
  },
  'D3310': {
    rule: 'REQUIRED',
    reason: 'Anterior RCT requires pre-op radiograph showing pathology and post-op confirming fill',
    source: 'CLEARINGHOUSE'
  },
  'D3320': {
    rule: 'REQUIRED',
    reason: 'Bicuspid RCT requires pre-op radiograph showing pathology and post-op confirming fill',
    source: 'CLEARINGHOUSE'
  },
  'D3330': {
    rule: 'REQUIRED',
    reason: 'Molar RCT requires pre-op radiograph showing pathology and post-op confirming fill',
    source: 'CLEARINGHOUSE'
  },
  'D3346': {
    rule: 'REQUIRED',
    reason: 'Retreatment requires documentation of previous treatment and current pathology',
    source: 'INDUSTRY_STANDARD'
  },
  'D3347': {
    rule: 'REQUIRED',
    reason: 'Retreatment requires documentation of previous treatment and current pathology',
    source: 'INDUSTRY_STANDARD'
  },
  'D3348': {
    rule: 'REQUIRED',
    reason: 'Retreatment requires documentation of previous treatment and current pathology',
    source: 'INDUSTRY_STANDARD'
  },
  'D3410': {
    rule: 'REQUIRED',
    reason: 'Apicoectomy requires radiographic evidence of periapical pathology',
    source: 'INDUSTRY_STANDARD'
  },
  'D3421': {
    rule: 'REQUIRED',
    reason: 'Apicoectomy requires radiographic evidence of periapical pathology',
    source: 'INDUSTRY_STANDARD'
  },
  'D3425': {
    rule: 'REQUIRED',
    reason: 'Apicoectomy requires radiographic evidence of periapical pathology',
    source: 'INDUSTRY_STANDARD'
  },

  // ===== ORAL SURGERY - REQUIRED =====
  'D7210': {
    rule: 'REQUIRED',
    reason: 'Surgical extraction requires radiographic documentation of impaction/complexity',
    source: 'CLEARINGHOUSE'
  },
  'D7220': {
    rule: 'REQUIRED',
    reason: 'Removal of impacted tooth requires radiograph showing impaction level',
    source: 'CLEARINGHOUSE'
  },
  'D7230': {
    rule: 'REQUIRED',
    reason: 'Partially bony impaction requires radiographic evidence',
    source: 'CLEARINGHOUSE'
  },
  'D7240': {
    rule: 'REQUIRED',
    reason: 'Completely bony impaction requires radiographic evidence',
    source: 'CLEARINGHOUSE'
  },
  'D7241': {
    rule: 'REQUIRED',
    reason: 'Completely bony impaction with unusual complications requires detailed radiographs',
    source: 'CLEARINGHOUSE'
  },
  'D7250': {
    rule: 'REQUIRED',
    reason: 'Surgical removal of residual roots requires radiographic documentation',
    source: 'INDUSTRY_STANDARD'
  },
  'D7286': {
    rule: 'REQUIRED',
    reason: 'Incisional biopsy requires pathology report',
    source: 'INDUSTRY_STANDARD'
  },
  'D7287': {
    rule: 'REQUIRED',
    reason: 'Excisional biopsy requires pathology report',
    source: 'INDUSTRY_STANDARD'
  },

  // ===== PERIODONTICS - CONDITIONAL =====
  'D4210': {
    rule: 'CONDITIONAL',
    reason: 'Gingivectomy may require pre-op photos or perio charting depending on payer',
    source: 'PAYER_NORM'
  },
  'D4211': {
    rule: 'CONDITIONAL',
    reason: 'Gingivectomy may require pre-op photos or perio charting depending on payer',
    source: 'PAYER_NORM'
  },
  'D4240': {
    rule: 'CONDITIONAL',
    reason: 'Gingival flap procedure may require perio charting showing bone loss',
    source: 'PAYER_NORM'
  },
  'D4241': {
    rule: 'CONDITIONAL',
    reason: 'Gingival flap procedure may require perio charting showing bone loss',
    source: 'PAYER_NORM'
  },
  'D4260': {
    rule: 'CONDITIONAL',
    reason: 'Osseous surgery may require full perio charting and radiographs',
    source: 'PAYER_NORM'
  },
  'D4261': {
    rule: 'CONDITIONAL',
    reason: 'Osseous surgery may require full perio charting and radiographs',
    source: 'PAYER_NORM'
  },

  // ===== IMPLANT SERVICES - REQUIRED =====
  'D6010': {
    rule: 'REQUIRED',
    reason: 'Surgical implant placement requires radiographic planning and post-op confirmation',
    source: 'CLEARINGHOUSE'
  },
  'D6040': {
    rule: 'REQUIRED',
    reason: 'Implant supported crown requires radiographic verification of osseointegration',
    source: 'INDUSTRY_STANDARD'
  },
  'D6050': {
    rule: 'REQUIRED',
    reason: 'Implant abutment requires radiographic verification',
    source: 'INDUSTRY_STANDARD'
  },
  'D6055': {
    rule: 'REQUIRED',
    reason: 'Custom abutment requires lab documentation',
    source: 'INDUSTRY_STANDARD'
  },

  // ===== PROSTHODONTICS FIXED - CONDITIONAL =====
  'D6210': {
    rule: 'CONDITIONAL',
    reason: 'Bridge pontic may require radiographs depending on span length and payer',
    source: 'PAYER_NORM'
  },
  'D6211': {
    rule: 'CONDITIONAL',
    reason: 'Bridge pontic may require radiographs depending on span length and payer',
    source: 'PAYER_NORM'
  },
  'D6212': {
    rule: 'CONDITIONAL',
    reason: 'Bridge pontic may require radiographs depending on span length and payer',
    source: 'PAYER_NORM'
  },
  'D6240': {
    rule: 'CONDITIONAL',
    reason: 'Bridge retainer may require pre-op radiographs for extensive spans',
    source: 'PAYER_NORM'
  },
  'D6241': {
    rule: 'CONDITIONAL',
    reason: 'Bridge retainer may require pre-op radiographs for extensive spans',
    source: 'PAYER_NORM'
  },
  'D6242': {
    rule: 'CONDITIONAL',
    reason: 'Bridge retainer may require pre-op radiographs for extensive spans',
    source: 'PAYER_NORM'
  },

  // ===== ORTHODONTICS - CONDITIONAL =====
  'D8080': {
    rule: 'CONDITIONAL',
    reason: 'Comprehensive ortho may require cephalometric radiographs and study models',
    source: 'PAYER_NORM'
  },
  'D8090': {
    rule: 'CONDITIONAL',
    reason: 'Comprehensive ortho may require cephalometric radiographs and study models',
    source: 'PAYER_NORM'
  },

  // ===== MAXILLOFACIAL PROSTHETICS - REQUIRED =====
  'D5911': {
    rule: 'REQUIRED',
    reason: 'Facial moulage requires documentation of medical necessity',
    source: 'INDUSTRY_STANDARD'
  },
  'D5912': {
    rule: 'REQUIRED',
    reason: 'Facial prosthesis requires medical documentation',
    source: 'INDUSTRY_STANDARD'
  },
  'D5913': {
    rule: 'REQUIRED',
    reason: 'Nasal prosthesis requires medical documentation',
    source: 'INDUSTRY_STANDARD'
  },
  'D5914': {
    rule: 'REQUIRED',
    reason: 'Auricular prosthesis requires medical documentation',
    source: 'INDUSTRY_STANDARD'
  },

  // ===== ADJUNCTIVE SERVICES - CONDITIONAL =====
  'D9110': {
    rule: 'CONDITIONAL',
    reason: 'Palliative treatment may require documentation if billed frequently',
    source: 'PAYER_NORM'
  },
  'D9210': {
    rule: 'CONDITIONAL',
    reason: 'Local anesthesia beyond standard procedures may require narrative',
    source: 'PAYER_NORM'
  },
  'D9215': {
    rule: 'CONDITIONAL',
    reason: 'Local anesthesia beyond standard procedures may require narrative',
    source: 'PAYER_NORM'
  },
  'D9220': {
    rule: 'CONDITIONAL',
    reason: 'Deep sedation requires medical justification for some payers',
    source: 'PAYER_NORM'
  },
  'D9221': {
    rule: 'CONDITIONAL',
    reason: 'Deep sedation requires medical justification for some payers',
    source: 'PAYER_NORM'
  },
  'D9222': {
    rule: 'CONDITIONAL',
    reason: 'Deep sedation requires medical justification for some payers',
    source: 'PAYER_NORM'
  },
  'D9230': {
    rule: 'CONDITIONAL',
    reason: 'Inhalation sedation may require medical justification',
    source: 'PAYER_NORM'
  },
  'D9240': {
    rule: 'CONDITIONAL',
    reason: 'IV sedation requires medical justification and monitoring documentation',
    source: 'PAYER_NORM'
  },
};

/**
 * ==================================================================================
 * CATEGORY-LEVEL ATTACHMENT RULES (FALLBACK ONLY)
 * ==================================================================================
 * These rules apply when no code-level rule exists.
 * Category rules are ALWAYS overridden by code-level rules.
 */
export const CATEGORY_ATTACHMENT_RULES: Record<string, AttachmentRuleConfig> = {
  'DIAGNOSTIC': {
    rule: 'NOT_REQUIRED',
    reason: 'Diagnostic procedures (exams, X-rays) typically do not require additional attachments',
    source: 'INDUSTRY_STANDARD'
  },
  'PREVENTIVE': {
    rule: 'NOT_REQUIRED',
    reason: 'Preventive procedures (cleanings, fluoride, sealants) typically do not require attachments',
    source: 'INDUSTRY_STANDARD'
  },
  'RESTORATIVE': {
    rule: 'NOT_REQUIRED',
    reason: 'Most restorative procedures do not require attachments unless extensive',
    source: 'INDUSTRY_STANDARD'
  },
  'ENDODONTICS': {
    rule: 'REQUIRED',
    reason: 'Endodontic procedures typically require pre-op and post-op radiographs',
    source: 'CLEARINGHOUSE'
  },
  'PERIODONTICS': {
    rule: 'CONDITIONAL',
    reason: 'Periodontal procedures may require perio charting or radiographs depending on complexity',
    source: 'PAYER_NORM'
  },
  'PROSTTH. REMOV': {
    rule: 'CONDITIONAL',
    reason: 'Removable prosthetics may require pre-op radiographs or photos for complex cases',
    source: 'PAYER_NORM'
  },
  'MAXILLO BIOSTM': {
    rule: 'REQUIRED',
    reason: 'Maxillofacial prosthetics typically require medical documentation',
    source: 'INDUSTRY_STANDARD'
  },
  'IMPLANT SERV': {
    rule: 'REQUIRED',
    reason: 'Implant services require radiographic planning and verification',
    source: 'CLEARINGHOUSE'
  },
  'PROSTTH. FIXED': {
    rule: 'CONDITIONAL',
    reason: 'Fixed prosthetics may require radiographs for extensive bridges',
    source: 'PAYER_NORM'
  },
  'ORAL SURGERY': {
    rule: 'REQUIRED',
    reason: 'Oral surgery procedures typically require radiographic documentation',
    source: 'CLEARINGHOUSE'
  },
  'ORTHODONTICS': {
    rule: 'CONDITIONAL',
    reason: 'Orthodontic treatment may require cephalometric X-rays and study models',
    source: 'PAYER_NORM'
  },
  'ADJUNCT SERV': {
    rule: 'CONDITIONAL',
    reason: 'Adjunctive services may require documentation depending on frequency and medical necessity',
    source: 'PAYER_NORM'
  },
  'OTHER': {
    rule: 'NOT_REQUIRED',
    reason: 'Miscellaneous procedures typically do not require attachments',
    source: 'INDUSTRY_STANDARD'
  },
  'ALL MEDICAL': {
    rule: 'CONDITIONAL',
    reason: 'Medical procedures may require medical documentation',
    source: 'PAYER_NORM'
  }
};

/**
 * ==================================================================================
 * VERSION HISTORY & AUDIT TRAIL
 * ==================================================================================
 */
export const ATTACHMENT_RULES_VERSION = {
  version: '1.0.0',
  effectiveDate: '2025-01-24',
  changes: [
    {
      version: '1.0.0',
      date: '2025-01-24',
      author: 'SYSTEM',
      changes: 'Initial implementation based on industry standards and clearinghouse norms'
    }
  ]
};

/**
 * ==================================================================================
 * NOTES FOR FUTURE UPDATES
 * ==================================================================================
 * 
 * WHEN TO UPDATE:
 * - Annual CDT code updates (October 1st)
 * - Payer-specific rule changes
 * - Clearinghouse validation updates
 * - Admin override requests
 * 
 * HOW TO UPDATE:
 * 1. Add new codes to CODE_ATTACHMENT_RULES
 * 2. Update version number
 * 3. Document change in ATTACHMENT_RULES_VERSION.changes
 * 4. Test against existing claims
 * 
 * AUDIT REQUIREMENTS:
 * - All changes must be documented
 * - Source must be identified
 * - Effective date must be specified
 * ==================================================================================
 */