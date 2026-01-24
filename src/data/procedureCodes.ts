export interface ProcedureCode {
  code: string;
  userCode: string;
  description: string;
  category: string;
  requirements: {
    tooth?: boolean;
    surface?: boolean;
    quadrant?: boolean;
    materials?: boolean;
  };
  // ✅ NEW: Comprehensive anatomy rules (MANDATORY FOR CLAIMS)
  anatomyRules: {
    mode: "TOOTH" | "QUADRANT" | "ARCH" | "FULL_MOUTH" | "NONE";
    allowedToothSet: "PERMANENT_ONLY" | "PRIMARY_ONLY" | "BOTH" | "NONE";
    allowedQuadrants?: ("UR" | "UL" | "LR" | "LL" | "UA" | "LA" | "FM")[];
    allowMultipleTeeth: boolean;
  };
  // ✅ NEW: Surface-specific rules
  surfaceRules: {
    enabled: boolean;
    min?: number;
    max?: number;
    allowedSurfaces?: string[];
  };
  // ✅ NEW: Materials-specific rules
  materialsRules: {
    enabled: boolean;
    options?: string[];
    min?: number;
    max?: number;
  };
  defaultFee: number;
}

export const procedureCodes: ProcedureCode[] = [
  // ==================== DIAGNOSTIC ====================
  {
    code: 'D0120',
    userCode: '-',
    description: 'Periodic Oral Evaluation',
    category: 'DIAGNOSTIC',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 75.00
  },
  {
    code: 'D0150',
    userCode: '-',
    description: 'Comprehensive Oral Evaluation - New/Est Pat',
    category: 'DIAGNOSTIC',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 120.00
  },
  {
    code: 'D0274',
    userCode: '-',
    description: 'Bitewings - Four Radiographic Images',
    category: 'DIAGNOSTIC',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 85.00
  },
  {
    code: 'D0460',
    userCode: '-',
    description: 'Pulp Vitality Tests',
    category: 'DIAGNOSTIC',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: true },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 45.00
  },

  // ==================== PREVENTIVE ====================
  {
    code: 'D1110',
    userCode: 'ProphyAdult',
    description: 'Prophylaxis - Adult',
    category: 'PREVENTIVE',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PERMANENT_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 100.00
  },
  {
    code: 'D1120',
    userCode: 'ProphyChild',
    description: 'Prophylaxis - Child',
    category: 'PREVENTIVE',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PRIMARY_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 85.00
  },
  {
    code: 'D1206',
    userCode: 'fluoride',
    description: 'Topical Application Of Fluoride Varnish',
    category: 'PREVENTIVE',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "BOTH", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 45.00
  },
  {
    code: 'D1351',
    userCode: '-',
    description: 'Sealant - Per Tooth',
    category: 'PREVENTIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 55.00
  },
  {
    code: 'D1352',
    userCode: '-',
    description: 'Preventive Resin Restoration (Permanent Tooth)',
    category: 'PREVENTIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 1, max: 5, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 75.00
  },

  // ==================== RESTORATIVE ====================
  {
    code: 'D2140',
    userCode: 'amal1',
    description: 'Amalgam - One Surface',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 1, max: 1, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 150.00
  },
  {
    code: 'D2150',
    userCode: 'amal2',
    description: 'Amalgam - Two Surfaces',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 2, max: 2, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 180.00
  },
  {
    code: 'D2160',
    userCode: 'amal3',
    description: 'Amalgam - Three Surfaces',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 3, max: 3, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 210.00
  },
  {
    code: 'D2161',
    userCode: 'amal4',
    description: 'Amalgam - Four or More Surfaces',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 4, max: 5, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 240.00
  },
  {
    code: 'D2330',
    userCode: 'resin1',
    description: 'Resin Composite - One Surface, Anterior',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 1, max: 1, allowedSurfaces: ['M', 'D', 'I', 'F', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 160.00
  },
  {
    code: 'D2391',
    userCode: 'resin1',
    description: 'Resin Composite - One Surface, Posterior',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 1, max: 1, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 175.00
  },
  {
    code: 'D2392',
    userCode: 'resin2',
    description: 'Resin Composite - Two Surfaces, Posterior',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 2, max: 2, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 210.00
  },
  {
    code: 'D2393',
    userCode: 'resin3',
    description: 'Resin Composite - Three Surfaces, Posterior',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 3, max: 3, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 245.00
  },
  {
    code: 'D2740',
    userCode: '-',
    description: 'Crown - Porcelain/Ceramic Substrate',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Porcelain/Ceramic', 'Zirconia', 'E.max', 'Bruxir']
    },
    defaultFee: 1250.00
  },
  {
    code: 'D2750',
    userCode: '-',
    description: 'Crown - Porcelain Fused to High Noble Metal',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['High Noble Metal', 'Gold', 'Palladium']
    },
    defaultFee: 1350.00
  },
  {
    code: 'D2751',
    userCode: '-',
    description: 'Crown - Porcelain Fused to Base Metal',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Base Metal', 'Nickel-Chromium', 'Cobalt-Chromium']
    },
    defaultFee: 1150.00
  },
  {
    code: 'D2790',
    userCode: '-',
    description: 'Crown - Full Cast High Noble Metal',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['High Noble Metal', 'Gold', 'Palladium']
    },
    defaultFee: 1400.00
  },
  {
    code: 'D2794',
    userCode: '-',
    description: 'Crown - Titanium',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Titanium', 'Titanium Alloy']
    },
    defaultFee: 1350.00
  },
  {
    code: 'D2930',
    userCode: '-',
    description: 'Prefabricated Stainless Steel Crown - Primary Tooth',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PRIMARY_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 275.00
  },
  {
    code: 'D2931',
    userCode: '-',
    description: 'Prefabricated Stainless Steel Crown - Permanent Tooth',
    category: 'RESTORATIVE',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 285.00
  },

  // ==================== ENDODONTICS ====================
  {
    code: 'D3110',
    userCode: '-',
    description: 'Pulp Cap - Direct',
    category: 'ENDODONTICS',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 120.00
  },
  {
    code: 'D3220',
    userCode: '-',
    description: 'Therapeutic Pulpotomy',
    category: 'ENDODONTICS',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 250.00
  },
  {
    code: 'D3310',
    userCode: 'rct1',
    description: 'Endodontic Therapy - Anterior Tooth',
    category: 'ENDODONTICS',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 850.00
  },
  {
    code: 'D3320',
    userCode: 'rct2',
    description: 'Endodontic Therapy - Bicuspid Tooth',
    category: 'ENDODONTICS',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 950.00
  },
  {
    code: 'D3330',
    userCode: 'rct3',
    description: 'Endodontic Therapy - Molar Tooth',
    category: 'ENDODONTICS',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1250.00
  },

  // ==================== PERIODONTICS ====================
  {
    code: 'D4210',
    userCode: '-',
    description: 'Gingivectomy or Gingivoplasty - Four or More Contiguous Teeth',
    category: 'PERIODONTICS',
    requirements: { tooth: false, surface: false, quadrant: true, materials: false },
    anatomyRules: { mode: "QUADRANT", allowedToothSet: "NONE", allowedQuadrants: ["UR", "UL", "LR", "LL"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 450.00
  },
  {
    code: 'D4341',
    userCode: '-',
    description: 'Periodontal Scaling and Root Planing - Four or More Teeth Per Quadrant',
    category: 'PERIODONTICS',
    requirements: { tooth: false, surface: false, quadrant: true, materials: false },
    anatomyRules: { mode: "QUADRANT", allowedToothSet: "NONE", allowedQuadrants: ["UR", "UL", "LR", "LL"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 280.00
  },

  // ==================== PEDIATRIC (PRIMARY DENTITION) ====================
  {
    code: 'T7111',
    userCode: '-',
    description: 'Extraction of Erupted Tooth or Exposed Root - Coronal Remnants (Deciduous Tooth)',
    category: 'ORAL SURGERY',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PRIMARY_ONLY", allowMultipleTeeth: true },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 120.00
  },

  // ==================== ORAL SURGERY ====================
  {
    code: 'D7140',
    userCode: '-',
    description: 'Extraction - Erupted Tooth or Exposed Root',
    category: 'ORAL SURGERY',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 180.00
  },
  {
    code: 'D7210',
    userCode: '-',
    description: 'Extraction - Erupted Tooth Requiring Removal of Bone/Sectioning',
    category: 'ORAL SURGERY',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 295.00
  },
  {
    code: 'D7240',
    userCode: '-',
    description: 'Removal of Impacted Tooth - Completely Bony',
    category: 'ORAL SURGERY',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 450.00
  },

  // ==================== PROSTTH. REMOV (Removable Prosthodontics) ====================
  {
    code: 'D5110',
    userCode: '-',
    description: 'Complete Denture - Upper',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["UA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1800.00
  },
  {
    code: 'D5120',
    userCode: '-',
    description: 'Complete Denture - Lower',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["LA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1800.00
  },
  {
    code: 'D5211',
    userCode: '-',
    description: 'Upper Partial Denture - Resin Base',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["UA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1400.00
  },
  {
    code: 'D5212',
    userCode: '-',
    description: 'Lower Partial Denture - Resin Base',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["LA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1400.00
  },
  {
    code: 'D5213',
    userCode: '-',
    description: 'Upper Partial Denture - Cast Metal Framework',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["UA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1900.00
  },
  {
    code: 'D5214',
    userCode: '-',
    description: 'Lower Partial Denture - Cast Metal Framework',
    category: 'PROSTTH. REMOV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "ARCH", allowedToothSet: "NONE", allowedQuadrants: ["LA"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 1900.00
  },

  // ==================== MAXILLO BIOSTM (Maxillofacial / Biomaterials) ====================
  {
    code: 'D7111',
    userCode: '-',
    description: 'Extraction of Erupted Tooth or Exposed Root - Coronal Remnants',
    category: 'MAXILLO BIOSTM',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "BOTH", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 150.00
  },
  {
    code: 'D7510',
    userCode: '-',
    description: 'Incision and Drainage of Abscess - Intraoral Soft Tissue',
    category: 'MAXILLO BIOSTM',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 285.00
  },
  {
    code: 'D7953',
    userCode: '-',
    description: 'Bone Replacement Graft - Each Additional Site',
    category: 'MAXILLO BIOSTM',
    requirements: { tooth: false, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Autograft', 'Allograft', 'Xenograft', 'Synthetic']
    },
    defaultFee: 550.00
  },

  // ==================== IMPLANT SERV (Implant Services) ====================
  {
    code: 'D6010',
    userCode: '-',
    description: 'Surgical Placement of Implant Body - Endosteal Implant',
    category: 'IMPLANT SERV',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 2200.00
  },
  {
    code: 'D6056',
    userCode: '-',
    description: 'Prefabricated Abutment - Includes Placement',
    category: 'IMPLANT SERV',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 650.00
  },
  {
    code: 'D6057',
    userCode: '-',
    description: 'Custom Abutment - Includes Placement',
    category: 'IMPLANT SERV',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 850.00
  },
  {
    code: 'D6058',
    userCode: '-',
    description: 'Abutment Supported Porcelain/Ceramic Crown',
    category: 'IMPLANT SERV',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Porcelain/Ceramic', 'Zirconia', 'E.max', 'Bruxir']
    },
    defaultFee: 1600.00
  },
  {
    code: 'D6065',
    userCode: '-',
    description: 'Implant Supported Porcelain/Ceramic Crown',
    category: 'IMPLANT SERV',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Porcelain/Ceramic', 'Zirconia', 'E.max', 'Bruxir']
    },
    defaultFee: 1750.00
  },

  // ==================== PROSTTH. FIXED (Fixed Prosthodontics) ====================
  {
    code: 'D6205',
    userCode: '-',
    description: 'Pontic - Indirect Resin Based Composite',
    category: 'PROSTTH. FIXED',
    requirements: { tooth: true, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 850.00
  },
  {
    code: 'D6240',
    userCode: '-',
    description: 'Pontic - Porcelain Fused to High Noble Metal',
    category: 'PROSTTH. FIXED',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['High Noble Metal', 'Gold', 'Palladium']
    },
    defaultFee: 1250.00
  },
  {
    code: 'D6245',
    userCode: '-',
    description: 'Pontic - Porcelain/Ceramic',
    category: 'PROSTTH. FIXED',
    requirements: { tooth: true, surface: false, quadrant: false, materials: true },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: {
      enabled: true,
      min: 1,
      max: 1,
      options: ['Porcelain/Ceramic', 'Zirconia', 'E.max']
    },
    defaultFee: 1150.00
  },
  {
    code: 'D6600',
    userCode: '-',
    description: 'Retainer Inlay - Porcelain/Ceramic, Two Surfaces',
    category: 'PROSTTH. FIXED',
    requirements: { tooth: true, surface: true, quadrant: false, materials: false },
    anatomyRules: { mode: "TOOTH", allowedToothSet: "PERMANENT_ONLY", allowMultipleTeeth: false },
    surfaceRules: { enabled: true, min: 2, max: 2, allowedSurfaces: ['M', 'O', 'D', 'B', 'L'] },
    materialsRules: { enabled: false },
    defaultFee: 950.00
  },

  // ==================== ORTHODONTICS ====================
  {
    code: 'D8010',
    userCode: '-',
    description: 'Limited Orthodontic Treatment - Primary Dentition',
    category: 'ORTHODONTICS',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PRIMARY_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 2500.00
  },
  {
    code: 'D8020',
    userCode: '-',
    description: 'Limited Orthodontic Treatment - Transitional Dentition',
    category: 'ORTHODONTICS',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "BOTH", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 3500.00
  },
  {
    code: 'D8030',
    userCode: '-',
    description: 'Limited Orthodontic Treatment - Adolescent Dentition',
    category: 'ORTHODONTICS',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PERMANENT_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 4500.00
  },
  {
    code: 'D8080',
    userCode: '-',
    description: 'Comprehensive Orthodontic Treatment - Adolescent Dentition',
    category: 'ORTHODONTICS',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PERMANENT_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 6500.00
  },
  {
    code: 'D8090',
    userCode: '-',
    description: 'Comprehensive Orthodontic Treatment - Adult Dentition',
    category: 'ORTHODONTICS',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "FULL_MOUTH", allowedToothSet: "PERMANENT_ONLY", allowedQuadrants: ["FM"], allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 7500.00
  },

  // ==================== ADJUNCT SERV (Adjunctive General Services) ====================
  {
    code: 'D9110',
    userCode: '-',
    description: 'Palliative (Emergency) Treatment of Dental Pain',
    category: 'ADJUNCT SERV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 95.00
  },
  {
    code: 'D9210',
    userCode: '-',
    description: 'Local Anesthesia Not in Conjunction with Operative/Surgical Procedures',
    category: 'ADJUNCT SERV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 55.00
  },
  {
    code: 'D9220',
    userCode: '-',
    description: 'Deep Sedation/General Anesthesia - First 15 Minutes',
    category: 'ADJUNCT SERV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 350.00
  },
  {
    code: 'D9230',
    userCode: '-',
    description: 'Analgesia, Anxiolysis, Inhalation of Nitrous Oxide',
    category: 'ADJUNCT SERV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 85.00
  },
  {
    code: 'D9310',
    userCode: '-',
    description: 'Consultation - Diagnostic Service',
    category: 'ADJUNCT SERV',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 125.00
  },

  // ==================== OTHER ====================
  {
    code: 'D9995',
    userCode: '-',
    description: 'Teledentistry - Synchronous; Real-Time Encounter',
    category: 'OTHER',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 45.00
  },
  {
    code: 'D9996',
    userCode: '-',
    description: 'Teledentistry - Asynchronous; Information Stored and Forwarded',
    category: 'OTHER',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 35.00
  },
  {
    code: 'D9997',
    userCode: '-',
    description: 'Dental Case Management - Patients with Special Health Care Needs',
    category: 'OTHER',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 150.00
  },

  // ==================== ALL MEDICAL ====================
  {
    code: 'M0001',
    userCode: '-',
    description: 'Medical Consultation - Physician',
    category: 'ALL MEDICAL',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 200.00
  },
  {
    code: 'M0002',
    userCode: '-',
    description: 'Medical Emergency Treatment',
    category: 'ALL MEDICAL',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 350.00
  },
  {
    code: 'M0003',
    userCode: '-',
    description: 'Medical Laboratory Testing',
    category: 'ALL MEDICAL',
    requirements: { tooth: false, surface: false, quadrant: false, materials: false },
    anatomyRules: { mode: "NONE", allowedToothSet: "NONE", allowMultipleTeeth: false },
    surfaceRules: { enabled: false },
    materialsRules: { enabled: false },
    defaultFee: 125.00
  },
];