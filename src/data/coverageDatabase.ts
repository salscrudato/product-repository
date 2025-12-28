/**
 * Comprehensive P&C Insurance Coverage Database
 * 
 * Used for intelligent fuzzy matching and suggestions.
 * Each coverage includes:
 * - name: The standard coverage name
 * - abbreviations: Common abbreviations (e.g., "BPP", "GL")
 * - aliases: Alternative names or synonyms
 * - keywords: Related terms for semantic matching
 * - lineOfBusiness: Which LOB this coverage belongs to
 * - category: Grouping for organization
 * - commonlyPairedWith: Coverages often used together
 */

export interface CoverageEntry {
  name: string;
  abbreviations?: string[];
  aliases?: string[];
  keywords?: string[];
  lineOfBusiness: string[];
  category: string;
  commonlyPairedWith?: string[];
  description?: string;
}

export const COVERAGE_DATABASE: CoverageEntry[] = [
  // ============================================================================
  // PROPERTY COVERAGES
  // ============================================================================
  {
    name: 'Building Coverage',
    abbreviations: ['BLDG', 'BLD'],
    aliases: ['Building & Structures', 'Structure Coverage', 'Real Property Coverage'],
    keywords: ['building', 'structure', 'real property', 'premises', 'construction'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Real',
    commonlyPairedWith: ['Business Personal Property', 'Business Income', 'Extra Expense'],
    description: 'Covers physical damage to buildings and permanently installed fixtures'
  },
  {
    name: 'Business Personal Property',
    abbreviations: ['BPP', 'CONTENTS'],
    aliases: ['Contents Coverage', 'Personal Property', 'Business Contents'],
    keywords: ['contents', 'equipment', 'inventory', 'furniture', 'fixtures', 'stock'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Personal',
    commonlyPairedWith: ['Building Coverage', 'Business Income', 'Equipment Breakdown'],
    description: 'Covers movable property owned by the business'
  },
  {
    name: 'Business Income',
    abbreviations: ['BI', 'BII'],
    aliases: ['Business Interruption', 'Loss of Income', 'Income Coverage'],
    keywords: ['income', 'revenue', 'interruption', 'lost profits', 'earnings'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Time Element',
    commonlyPairedWith: ['Extra Expense', 'Building Coverage', 'Civil Authority'],
    description: 'Covers lost income during business interruption from covered perils'
  },
  {
    name: 'Extra Expense',
    abbreviations: ['EE', 'XEXP'],
    aliases: ['Additional Expense', 'Expediting Expense'],
    keywords: ['extra', 'additional', 'expense', 'expedite', 'temporary'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Time Element',
    commonlyPairedWith: ['Business Income', 'Building Coverage'],
    description: 'Covers additional costs to continue operations during restoration'
  },
  {
    name: 'Equipment Breakdown',
    abbreviations: ['EB', 'EQBD', 'BM'],
    aliases: ['Boiler & Machinery', 'Mechanical Breakdown', 'Equipment Failure'],
    keywords: ['equipment', 'machinery', 'boiler', 'mechanical', 'electrical', 'breakdown'],
    lineOfBusiness: ['property', 'commercial property', 'inland marine'],
    category: 'Property - Equipment',
    commonlyPairedWith: ['Building Coverage', 'Business Personal Property', 'Business Income'],
    description: 'Covers sudden mechanical or electrical breakdown of equipment'
  },
  {
    name: 'Ordinance or Law',
    abbreviations: ['O&L', 'OL'],
    aliases: ['Building Ordinance', 'Code Upgrade', 'Law & Ordinance'],
    keywords: ['ordinance', 'law', 'code', 'upgrade', 'demolition', 'increased cost'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Building Coverage'],
    description: 'Covers increased costs due to building code requirements'
  },
  {
    name: 'Valuable Papers & Records',
    abbreviations: ['VP', 'VPR'],
    aliases: ['Valuable Documents', 'Records Coverage'],
    keywords: ['papers', 'records', 'documents', 'valuable', 'manuscripts'],
    lineOfBusiness: ['property', 'commercial property', 'inland marine'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Business Personal Property', 'Electronic Data'],
    description: 'Covers cost to research and restore valuable papers and records'
  },
  {
    name: 'Accounts Receivable',
    abbreviations: ['AR', 'ACCREC'],
    aliases: ['Receivables Coverage'],
    keywords: ['accounts', 'receivable', 'billing', 'customer', 'records'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Valuable Papers & Records', 'Business Personal Property'],
    description: 'Covers inability to collect from customers due to records loss'
  },
  {
    name: 'Electronic Data',
    abbreviations: ['ED', 'DATA'],
    aliases: ['Data Coverage', 'Computer Data', 'Digital Assets'],
    keywords: ['electronic', 'data', 'computer', 'digital', 'software', 'media'],
    lineOfBusiness: ['property', 'commercial property', 'cyber'],
    category: 'Property - Technology',
    commonlyPairedWith: ['Computer Equipment', 'Business Income', 'Cyber Liability'],
    description: 'Covers cost to restore electronic data and software'
  },
  {
    name: 'Debris Removal',
    abbreviations: ['DR', 'DEBRIS'],
    aliases: ['Debris Cleanup', 'Removal Expense'],
    keywords: ['debris', 'removal', 'cleanup', 'disposal', 'demolition'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Building Coverage', 'Business Personal Property'],
    description: 'Covers cost to remove debris after a covered loss'
  },
  {
    name: 'Fire Damage',
    abbreviations: ['FIRE'],
    aliases: ['Fire Coverage', 'Fire & Lightning'],
    keywords: ['fire', 'lightning', 'smoke', 'burn', 'flame'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Smoke Damage', 'Building Coverage'],
    description: 'Covers damage caused by fire and lightning'
  },
  {
    name: 'Smoke Damage',
    abbreviations: ['SMOKE'],
    aliases: ['Smoke Coverage'],
    keywords: ['smoke', 'soot', 'residue'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Fire Damage', 'Building Coverage'],
    description: 'Covers damage caused by smoke'
  },
  {
    name: 'Wind & Hail',
    abbreviations: ['W&H', 'WH', 'WIND'],
    aliases: ['Windstorm Coverage', 'Hail Damage', 'Storm Coverage'],
    keywords: ['wind', 'hail', 'storm', 'hurricane', 'tornado', 'windstorm'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Roof Coverage'],
    description: 'Covers damage from wind and hail events'
  },
  {
    name: 'Flood Coverage',
    abbreviations: ['FLD', 'FLOOD'],
    aliases: ['Flood Insurance', 'Water Damage - Flood'],
    keywords: ['flood', 'water', 'rising water', 'storm surge', 'overflow'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners', 'flood'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Business Personal Property'],
    description: 'Covers damage from flooding and rising water'
  },
  {
    name: 'Earthquake Coverage',
    abbreviations: ['EQ', 'QUAKE'],
    aliases: ['Seismic Coverage', 'Earth Movement'],
    keywords: ['earthquake', 'seismic', 'tremor', 'earth movement'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Business Personal Property'],
    description: 'Covers damage from earthquake and earth movement'
  },
  {
    name: 'Spoilage Coverage',
    abbreviations: ['SPOIL', 'SPL'],
    aliases: ['Perishable Goods', 'Refrigeration Breakdown'],
    keywords: ['spoilage', 'perishable', 'refrigeration', 'temperature', 'food'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Equipment Breakdown', 'Business Personal Property'],
    description: 'Covers spoilage of perishable goods'
  },
  {
    name: 'Glass Coverage',
    abbreviations: ['GLASS'],
    aliases: ['Plate Glass', 'Window Coverage'],
    keywords: ['glass', 'window', 'plate glass', 'storefront'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Building Coverage', 'Signs Coverage'],
    description: 'Covers breakage of glass windows and fixtures'
  },
  {
    name: 'Signs Coverage',
    abbreviations: ['SIGN'],
    aliases: ['Outdoor Signs', 'Signage Coverage'],
    keywords: ['signs', 'signage', 'outdoor', 'neon', 'billboard'],
    lineOfBusiness: ['property', 'commercial property', 'inland marine'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Building Coverage', 'Glass Coverage'],
    description: 'Covers damage to outdoor signs'
  },
  {
    name: 'Tenant Improvements',
    abbreviations: ['TI', 'TIB', 'LHI'],
    aliases: ['Leasehold Improvements', 'Betterments', 'Tenant Betterments'],
    keywords: ['tenant', 'leasehold', 'improvements', 'betterments', 'build-out'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Real',
    commonlyPairedWith: ['Business Personal Property', 'Building Coverage'],
    description: 'Covers improvements made by tenant to leased space'
  },
  {
    name: 'Civil Authority',
    abbreviations: ['CA', 'CIVAUTH'],
    aliases: ['Civil Authority Coverage', 'Government Action'],
    keywords: ['civil', 'authority', 'government', 'access', 'ingress', 'egress'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Time Element',
    commonlyPairedWith: ['Business Income', 'Extra Expense'],
    description: 'Covers loss when civil authority prohibits access to premises'
  },

  // ============================================================================
  // LIABILITY COVERAGES
  // ============================================================================
  {
    name: 'General Liability',
    abbreviations: ['GL', 'CGL'],
    aliases: ['Commercial General Liability', 'Public Liability', 'Third Party Liability'],
    keywords: ['liability', 'bodily injury', 'property damage', 'negligence', 'lawsuit'],
    lineOfBusiness: ['liability', 'general liability', 'commercial'],
    category: 'Liability - General',
    commonlyPairedWith: ['Products Liability', 'Personal & Advertising Injury'],
    description: 'Covers third-party bodily injury and property damage claims'
  },
  {
    name: 'Products Liability',
    abbreviations: ['PL', 'PROD'],
    aliases: ['Products-Completed Operations', 'Product Liability'],
    keywords: ['products', 'completed operations', 'manufacturing', 'defect'],
    lineOfBusiness: ['liability', 'general liability', 'commercial'],
    category: 'Liability - Products',
    commonlyPairedWith: ['General Liability', 'Product Recall'],
    description: 'Covers liability from products sold or work completed'
  },
  {
    name: 'Personal & Advertising Injury',
    abbreviations: ['P&A', 'PAI'],
    aliases: ['Personal Injury', 'Advertising Injury', 'Offense Coverage'],
    keywords: ['personal', 'advertising', 'libel', 'slander', 'defamation', 'copyright'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers libel, slander, and advertising offenses'
  },
  {
    name: 'Professional Liability',
    abbreviations: ['PRL', 'E&O'],
    aliases: ['Errors & Omissions', 'E&O Coverage', 'Malpractice'],
    keywords: ['professional', 'errors', 'omissions', 'malpractice', 'negligence'],
    lineOfBusiness: ['liability', 'professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability', 'Cyber Liability'],
    description: 'Covers professional negligence and errors'
  },
  {
    name: 'Directors & Officers Liability',
    abbreviations: ['D&O', 'DO'],
    aliases: ['D&O Coverage', 'Management Liability'],
    keywords: ['directors', 'officers', 'management', 'fiduciary', 'governance'],
    lineOfBusiness: ['liability', 'management liability'],
    category: 'Liability - Management',
    commonlyPairedWith: ['Employment Practices Liability', 'Fiduciary Liability'],
    description: 'Covers liability of company directors and officers'
  },
  {
    name: 'Employment Practices Liability',
    abbreviations: ['EPL', 'EPLI'],
    aliases: ['EPLI Coverage', 'Employment Liability'],
    keywords: ['employment', 'discrimination', 'harassment', 'wrongful termination', 'HR'],
    lineOfBusiness: ['liability', 'management liability'],
    category: 'Liability - Employment',
    commonlyPairedWith: ['Directors & Officers Liability', 'General Liability'],
    description: 'Covers employment-related claims like discrimination'
  },
  {
    name: 'Cyber Liability',
    abbreviations: ['CYBER', 'CYB'],
    aliases: ['Cyber Insurance', 'Data Breach Coverage', 'Network Security'],
    keywords: ['cyber', 'data breach', 'hacking', 'ransomware', 'privacy', 'network'],
    lineOfBusiness: ['liability', 'cyber', 'technology'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Professional Liability', 'Electronic Data'],
    description: 'Covers cyber attacks and data breach liability'
  },
  {
    name: 'Umbrella Liability',
    abbreviations: ['UMB', 'UMBR'],
    aliases: ['Umbrella Coverage', 'Excess Liability'],
    keywords: ['umbrella', 'excess', 'catastrophic', 'high limits'],
    lineOfBusiness: ['liability', 'umbrella'],
    category: 'Liability - Excess',
    commonlyPairedWith: ['General Liability', 'Auto Liability'],
    description: 'Provides excess liability limits over primary policies'
  },
  {
    name: 'Liquor Liability',
    abbreviations: ['LIQ', 'DRAM'],
    aliases: ['Dram Shop', 'Alcohol Liability', 'Host Liquor'],
    keywords: ['liquor', 'alcohol', 'dram shop', 'bar', 'restaurant', 'serving'],
    lineOfBusiness: ['liability', 'general liability', 'hospitality'],
    category: 'Liability - Specialty',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers liability from serving alcohol'
  },
  {
    name: 'Pollution Liability',
    abbreviations: ['POLL', 'EIL'],
    aliases: ['Environmental Liability', 'Contamination Coverage'],
    keywords: ['pollution', 'environmental', 'contamination', 'hazmat', 'cleanup'],
    lineOfBusiness: ['liability', 'environmental'],
    category: 'Liability - Environmental',
    commonlyPairedWith: ['General Liability', 'Professional Liability'],
    description: 'Covers pollution and environmental damage claims'
  },
  {
    name: 'Medical Payments',
    abbreviations: ['MEDPAY', 'MP'],
    aliases: ['Med Pay', 'Medical Expense'],
    keywords: ['medical', 'payments', 'injury', 'expense', 'first aid'],
    lineOfBusiness: ['liability', 'general liability', 'auto'],
    category: 'Liability - Medical',
    commonlyPairedWith: ['General Liability', 'Bodily Injury Liability'],
    description: 'Pays medical expenses regardless of fault'
  },

  // ============================================================================
  // AUTO COVERAGES
  // ============================================================================
  {
    name: 'Auto Liability',
    abbreviations: ['AL', 'AUTOL'],
    aliases: ['Automobile Liability', 'Vehicle Liability'],
    keywords: ['auto', 'liability', 'vehicle', 'accident', 'third party'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Liability',
    commonlyPairedWith: ['Physical Damage', 'Uninsured Motorist'],
    description: 'Covers third-party liability from auto accidents'
  },
  {
    name: 'Bodily Injury Liability',
    abbreviations: ['BI', 'BIL'],
    aliases: ['BI Liability', 'Injury Liability'],
    keywords: ['bodily', 'injury', 'liability', 'person', 'accident'],
    lineOfBusiness: ['auto', 'commercial auto', 'liability'],
    category: 'Auto - Liability',
    commonlyPairedWith: ['Property Damage Liability', 'Medical Payments'],
    description: 'Covers bodily injury to others in auto accidents'
  },
  {
    name: 'Property Damage Liability',
    abbreviations: ['PD', 'PDL'],
    aliases: ['PD Liability'],
    keywords: ['property', 'damage', 'liability', 'vehicle', 'collision'],
    lineOfBusiness: ['auto', 'commercial auto', 'liability'],
    category: 'Auto - Liability',
    commonlyPairedWith: ['Bodily Injury Liability'],
    description: 'Covers damage to others property in auto accidents'
  },
  {
    name: 'Collision Coverage',
    abbreviations: ['COLL', 'COL'],
    aliases: ['Collision Insurance'],
    keywords: ['collision', 'crash', 'accident', 'impact', 'rollover'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Physical Damage',
    commonlyPairedWith: ['Comprehensive Coverage'],
    description: 'Covers damage to your vehicle from collisions'
  },
  {
    name: 'Comprehensive Coverage',
    abbreviations: ['COMP', 'OTC'],
    aliases: ['Other Than Collision', 'Full Coverage'],
    keywords: ['comprehensive', 'theft', 'vandalism', 'weather', 'animal', 'glass'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Physical Damage',
    commonlyPairedWith: ['Collision Coverage'],
    description: 'Covers non-collision damage like theft and weather'
  },
  {
    name: 'Uninsured Motorist',
    abbreviations: ['UM', 'UNIM'],
    aliases: ['UM Coverage', 'Uninsured Driver'],
    keywords: ['uninsured', 'motorist', 'hit and run', 'no insurance'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Uninsured',
    commonlyPairedWith: ['Underinsured Motorist', 'Auto Liability'],
    description: 'Covers you when hit by uninsured driver'
  },
  {
    name: 'Underinsured Motorist',
    abbreviations: ['UIM', 'UNDINS'],
    aliases: ['UIM Coverage'],
    keywords: ['underinsured', 'motorist', 'insufficient', 'limits'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Uninsured',
    commonlyPairedWith: ['Uninsured Motorist'],
    description: 'Covers you when hit by underinsured driver'
  },
  {
    name: 'Hired Auto',
    abbreviations: ['HA', 'HIRED'],
    aliases: ['Hired Auto Liability', 'Rental Car Coverage'],
    keywords: ['hired', 'rental', 'leased', 'temporary', 'non-owned'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Non-Owned',
    commonlyPairedWith: ['Non-Owned Auto', 'Auto Liability'],
    description: 'Covers liability for rented or hired vehicles'
  },
  {
    name: 'Non-Owned Auto',
    abbreviations: ['NOA', 'NONOWN'],
    aliases: ['Non-Owned Auto Liability', 'Employee Vehicle'],
    keywords: ['non-owned', 'employee', 'personal', 'vehicle', 'business use'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Non-Owned',
    commonlyPairedWith: ['Hired Auto', 'Auto Liability'],
    description: 'Covers liability when employees use personal vehicles'
  },

  // ============================================================================
  // WORKERS COMPENSATION
  // ============================================================================
  {
    name: 'Workers Compensation',
    abbreviations: ['WC', 'WORKCOMP'],
    aliases: ['Workers Comp', 'Work Comp', 'Employee Injury'],
    keywords: ['workers', 'compensation', 'employee', 'injury', 'workplace', 'occupational'],
    lineOfBusiness: ['workers compensation'],
    category: 'Workers Comp',
    commonlyPairedWith: ['Employers Liability'],
    description: 'Covers employee injuries and occupational illness'
  },
  {
    name: 'Employers Liability',
    abbreviations: ['EL', 'EMPL'],
    aliases: ['Employer Liability', 'Part B Coverage'],
    keywords: ['employers', 'liability', 'lawsuit', 'negligence', 'workplace'],
    lineOfBusiness: ['workers compensation'],
    category: 'Workers Comp',
    commonlyPairedWith: ['Workers Compensation'],
    description: 'Covers employer liability beyond workers comp'
  },

  // ============================================================================
  // INLAND MARINE
  // ============================================================================
  {
    name: 'Contractors Equipment',
    abbreviations: ['CE', 'CONTEQ'],
    aliases: ['Contractors Tools', 'Mobile Equipment'],
    keywords: ['contractors', 'equipment', 'tools', 'mobile', 'construction'],
    lineOfBusiness: ['inland marine', 'contractors'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Installation Floater', 'Builders Risk'],
    description: 'Covers contractors tools and mobile equipment'
  },
  {
    name: 'Builders Risk',
    abbreviations: ['BR', 'COC'],
    aliases: ['Course of Construction', 'Construction Coverage'],
    keywords: ['builders', 'construction', 'project', 'development', 'renovation'],
    lineOfBusiness: ['inland marine', 'property', 'construction'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Contractors Equipment', 'Installation Floater'],
    description: 'Covers buildings under construction'
  },
  {
    name: 'Installation Floater',
    abbreviations: ['IF', 'INST'],
    aliases: ['Installation Coverage'],
    keywords: ['installation', 'floater', 'equipment', 'transit', 'job site'],
    lineOfBusiness: ['inland marine', 'contractors'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Contractors Equipment', 'Transit Coverage'],
    description: 'Covers equipment during installation'
  },
  {
    name: 'Transit Coverage',
    abbreviations: ['TR', 'TRANS'],
    aliases: ['Cargo Coverage', 'Goods in Transit'],
    keywords: ['transit', 'cargo', 'shipping', 'transportation', 'delivery'],
    lineOfBusiness: ['inland marine', 'cargo'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Motor Truck Cargo', 'Installation Floater'],
    description: 'Covers goods while in transit'
  },
  {
    name: 'Motor Truck Cargo',
    abbreviations: ['MTC', 'CARGO'],
    aliases: ['Trucking Cargo', 'Freight Coverage'],
    keywords: ['motor', 'truck', 'cargo', 'freight', 'hauling', 'trucking'],
    lineOfBusiness: ['inland marine', 'trucking'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Transit Coverage', 'Auto Liability'],
    description: 'Covers cargo being transported by truck'
  },
  {
    name: 'Fine Arts Coverage',
    abbreviations: ['FA', 'ART'],
    aliases: ['Art Insurance', 'Collectibles Coverage'],
    keywords: ['fine arts', 'art', 'collectibles', 'antiques', 'paintings', 'sculpture'],
    lineOfBusiness: ['inland marine', 'personal lines'],
    category: 'Inland Marine',
    commonlyPairedWith: ['Valuable Papers & Records'],
    description: 'Covers fine art and collectibles'
  },

  // ============================================================================
  // SPECIALTY COVERAGES
  // ============================================================================
  {
    name: 'Crime Coverage',
    abbreviations: ['CR', 'CRIME'],
    aliases: ['Commercial Crime', 'Fidelity Coverage'],
    keywords: ['crime', 'theft', 'employee dishonesty', 'forgery', 'fraud'],
    lineOfBusiness: ['crime', 'commercial'],
    category: 'Specialty',
    commonlyPairedWith: ['Cyber Liability', 'Fidelity Bond'],
    description: 'Covers losses from criminal acts'
  },
  {
    name: 'Employee Dishonesty',
    abbreviations: ['ED', 'DISHON'],
    aliases: ['Fidelity Bond', 'Employee Theft'],
    keywords: ['employee', 'dishonesty', 'theft', 'embezzlement', 'fraud'],
    lineOfBusiness: ['crime', 'fidelity'],
    category: 'Specialty',
    commonlyPairedWith: ['Crime Coverage', 'ERISA Bond'],
    description: 'Covers theft by employees'
  },
  {
    name: 'Forgery & Alteration',
    abbreviations: ['F&A', 'FORG'],
    aliases: ['Forgery Coverage'],
    keywords: ['forgery', 'alteration', 'checks', 'documents', 'fraud'],
    lineOfBusiness: ['crime'],
    category: 'Specialty',
    commonlyPairedWith: ['Crime Coverage', 'Employee Dishonesty'],
    description: 'Covers losses from forged documents'
  },
  {
    name: 'Product Recall',
    abbreviations: ['PR', 'RECALL'],
    aliases: ['Recall Coverage', 'Product Withdrawal'],
    keywords: ['product', 'recall', 'withdrawal', 'contamination', 'defect'],
    lineOfBusiness: ['liability', 'product liability'],
    category: 'Specialty',
    commonlyPairedWith: ['Products Liability', 'General Liability'],
    description: 'Covers costs of product recalls'
  },
  {
    name: 'Fiduciary Liability',
    abbreviations: ['FID', 'FIDL'],
    aliases: ['ERISA Liability', 'Benefit Plan Liability'],
    keywords: ['fiduciary', 'ERISA', 'pension', 'benefits', '401k', 'retirement'],
    lineOfBusiness: ['liability', 'management liability'],
    category: 'Specialty',
    commonlyPairedWith: ['Directors & Officers Liability', 'Employment Practices Liability'],
    description: 'Covers liability for employee benefit plan administration'
  },
  {
    name: 'Media Liability',
    abbreviations: ['MEDIA', 'MED'],
    aliases: ['Broadcasters Liability', 'Publishers Liability'],
    keywords: ['media', 'broadcasting', 'publishing', 'content', 'defamation'],
    lineOfBusiness: ['liability', 'media'],
    category: 'Specialty',
    commonlyPairedWith: ['Professional Liability', 'Cyber Liability'],
    description: 'Covers liability from media content'
  },
  {
    name: 'Technology E&O',
    abbreviations: ['TECH', 'TEO'],
    aliases: ['Tech E&O', 'IT Professional Liability'],
    keywords: ['technology', 'IT', 'software', 'services', 'consulting'],
    lineOfBusiness: ['liability', 'technology', 'professional liability'],
    category: 'Specialty',
    commonlyPairedWith: ['Cyber Liability', 'Professional Liability'],
    description: 'Covers technology services errors and omissions'
  },

  // ============================================================================
  // HOMEOWNERS COVERAGES
  // ============================================================================
  {
    name: 'Dwelling Coverage',
    abbreviations: ['DWL', 'DWLG', 'COV A'],
    aliases: ['Coverage A', 'Home Structure', 'House Coverage'],
    keywords: ['dwelling', 'home', 'house', 'structure', 'residence'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Other Structures', 'Personal Property', 'Loss of Use'],
    description: 'Covers the main dwelling structure'
  },
  {
    name: 'Other Structures',
    abbreviations: ['OS', 'COV B'],
    aliases: ['Coverage B', 'Detached Structures', 'Appurtenant Structures'],
    keywords: ['other', 'structures', 'garage', 'shed', 'fence', 'detached'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Dwelling Coverage'],
    description: 'Covers detached structures like garages and sheds'
  },
  {
    name: 'Personal Property',
    abbreviations: ['PP', 'COV C'],
    aliases: ['Coverage C', 'Contents', 'Personal Belongings'],
    keywords: ['personal', 'property', 'contents', 'belongings', 'furniture'],
    lineOfBusiness: ['homeowners', 'personal lines', 'renters'],
    category: 'Homeowners',
    commonlyPairedWith: ['Dwelling Coverage', 'Scheduled Personal Property'],
    description: 'Covers personal belongings and contents'
  },
  {
    name: 'Loss of Use',
    abbreviations: ['LOU', 'COV D', 'ALE'],
    aliases: ['Coverage D', 'Additional Living Expense', 'Fair Rental Value'],
    keywords: ['loss', 'use', 'living', 'expense', 'rental', 'displacement'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Dwelling Coverage'],
    description: 'Covers additional living expenses when home is uninhabitable'
  },
  {
    name: 'Personal Liability',
    abbreviations: ['PL', 'COV E'],
    aliases: ['Coverage E', 'Homeowner Liability'],
    keywords: ['personal', 'liability', 'lawsuit', 'negligence', 'injury'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Medical Payments to Others'],
    description: 'Covers personal liability claims against the homeowner'
  },
  {
    name: 'Medical Payments to Others',
    abbreviations: ['MEDPM', 'COV F'],
    aliases: ['Coverage F', 'Guest Medical'],
    keywords: ['medical', 'payments', 'others', 'guests', 'injury'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Personal Liability'],
    description: 'Pays medical expenses for guests injured on property'
  },
  {
    name: 'Scheduled Personal Property',
    abbreviations: ['SPP', 'SCHED'],
    aliases: ['Floater', 'Scheduled Items', 'Valuable Items'],
    keywords: ['scheduled', 'jewelry', 'watches', 'furs', 'cameras', 'valuables'],
    lineOfBusiness: ['homeowners', 'personal lines', 'inland marine'],
    category: 'Homeowners',
    commonlyPairedWith: ['Personal Property'],
    description: 'Covers high-value items specifically listed on policy'
  },
  {
    name: 'Water Backup',
    abbreviations: ['WB', 'SUMP'],
    aliases: ['Sewer Backup', 'Sump Pump Failure', 'Drain Backup'],
    keywords: ['water', 'backup', 'sewer', 'sump', 'drain', 'overflow'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Dwelling Coverage'],
    description: 'Covers damage from water backup and sump pump failure'
  },
  {
    name: 'Identity Theft',
    abbreviations: ['ID', 'IDTH'],
    aliases: ['Identity Fraud', 'Identity Recovery'],
    keywords: ['identity', 'theft', 'fraud', 'credit', 'recovery'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Personal Property'],
    description: 'Covers expenses related to identity theft recovery'
  },
  {
    name: 'Service Line Coverage',
    abbreviations: ['SL', 'SVCLN'],
    aliases: ['Utility Line', 'Underground Service'],
    keywords: ['service', 'line', 'utility', 'underground', 'pipes', 'wires'],
    lineOfBusiness: ['homeowners', 'personal lines'],
    category: 'Homeowners',
    commonlyPairedWith: ['Dwelling Coverage'],
    description: 'Covers repair of underground utility lines'
  },

  // ============================================================================
  // ADDITIONAL SPECIALTY COVERAGES
  // ============================================================================
  {
    name: 'Contingent Business Income',
    abbreviations: ['CBI', 'CONTBI'],
    aliases: ['Dependent Business Income', 'Supply Chain Coverage'],
    keywords: ['contingent', 'dependent', 'supplier', 'customer', 'supply chain'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Time Element',
    commonlyPairedWith: ['Business Income', 'Extra Expense'],
    description: 'Covers income loss from supplier or customer disruptions'
  },
  {
    name: 'Hired & Non-Owned Auto',
    abbreviations: ['HNOA', 'HNA'],
    aliases: ['HNOA Coverage'],
    keywords: ['hired', 'non-owned', 'rental', 'employee', 'vehicle'],
    lineOfBusiness: ['auto', 'commercial auto', 'liability'],
    category: 'Auto - Non-Owned',
    commonlyPairedWith: ['General Liability', 'Commercial Auto'],
    description: 'Covers hired and non-owned auto liability'
  },
  {
    name: 'Garage Liability',
    abbreviations: ['GL', 'GARAGE'],
    aliases: ['Garage Coverage', 'Auto Dealer Liability'],
    keywords: ['garage', 'dealer', 'repair', 'service', 'automotive'],
    lineOfBusiness: ['auto', 'garage', 'commercial'],
    category: 'Auto - Specialty',
    commonlyPairedWith: ['Garagekeepers Coverage'],
    description: 'Covers liability for auto dealers and repair shops'
  },
  {
    name: 'Garagekeepers Coverage',
    abbreviations: ['GK', 'GKPR'],
    aliases: ['Garagekeepers Legal Liability'],
    keywords: ['garagekeepers', 'customer', 'vehicle', 'custody', 'care'],
    lineOfBusiness: ['auto', 'garage', 'commercial'],
    category: 'Auto - Specialty',
    commonlyPairedWith: ['Garage Liability'],
    description: 'Covers damage to customer vehicles in your care'
  },
  {
    name: 'Ocean Marine',
    abbreviations: ['OM', 'OCEAN'],
    aliases: ['Marine Cargo', 'Hull Coverage'],
    keywords: ['ocean', 'marine', 'cargo', 'hull', 'vessel', 'ship'],
    lineOfBusiness: ['marine', 'ocean marine'],
    category: 'Marine',
    commonlyPairedWith: ['Protection & Indemnity'],
    description: 'Covers ocean-going vessels and cargo'
  },
  {
    name: 'Protection & Indemnity',
    abbreviations: ['P&I', 'PI'],
    aliases: ['P&I Coverage', 'Marine Liability'],
    keywords: ['protection', 'indemnity', 'marine', 'liability', 'crew'],
    lineOfBusiness: ['marine', 'ocean marine'],
    category: 'Marine',
    commonlyPairedWith: ['Ocean Marine', 'Hull Coverage'],
    description: 'Covers marine liability including crew injuries'
  },
  {
    name: 'Difference in Conditions',
    abbreviations: ['DIC'],
    aliases: ['DIC Coverage', 'Catastrophe Coverage'],
    keywords: ['difference', 'conditions', 'earthquake', 'flood', 'catastrophe'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Property Coverage', 'Flood Coverage', 'Earthquake Coverage'],
    description: 'Fills gaps in property coverage for catastrophic perils'
  },
  {
    name: 'ERISA Bond',
    abbreviations: ['ERISA', 'FID'],
    aliases: ['Fidelity Bond', 'Employee Benefit Bond'],
    keywords: ['ERISA', 'fidelity', 'bond', 'pension', 'benefits', '401k'],
    lineOfBusiness: ['fidelity', 'employee benefits'],
    category: 'Specialty',
    commonlyPairedWith: ['Fiduciary Liability'],
    description: 'Required bond for employee benefit plan administrators'
  },
  {
    name: 'Stop Loss',
    abbreviations: ['SL', 'STOPLOSS', 'ASL'],
    aliases: ['Aggregate Stop Loss', 'Specific Stop Loss', 'Excess Loss'],
    keywords: ['stop', 'loss', 'self-insured', 'aggregate', 'specific', 'excess'],
    lineOfBusiness: ['employee benefits', 'health'],
    category: 'Specialty',
    commonlyPairedWith: ['Health Insurance'],
    description: 'Limits employer liability for self-insured health plans'
  },
  {
    name: 'Kidnap & Ransom',
    abbreviations: ['K&R', 'KR'],
    aliases: ['K&R Coverage', 'Extortion Coverage'],
    keywords: ['kidnap', 'ransom', 'extortion', 'hostage', 'abduction'],
    lineOfBusiness: ['specialty', 'international'],
    category: 'Specialty',
    commonlyPairedWith: ['Directors & Officers Liability'],
    description: 'Covers kidnapping, ransom, and extortion events'
  },
  {
    name: 'Trade Credit',
    abbreviations: ['TC', 'CREDIT'],
    aliases: ['Credit Insurance', 'Accounts Receivable Insurance'],
    keywords: ['trade', 'credit', 'receivable', 'customer', 'default', 'bankruptcy'],
    lineOfBusiness: ['specialty', 'commercial'],
    category: 'Specialty',
    commonlyPairedWith: ['Accounts Receivable'],
    description: 'Covers non-payment by customers'
  },
  {
    name: 'Surety Bond',
    abbreviations: ['SURETY', 'BOND'],
    aliases: ['Contract Bond', 'Performance Bond', 'Bid Bond'],
    keywords: ['surety', 'bond', 'contract', 'performance', 'bid', 'payment'],
    lineOfBusiness: ['surety', 'construction'],
    category: 'Surety',
    commonlyPairedWith: ['Builders Risk', 'Contractors Equipment'],
    description: 'Guarantees contract performance'
  },

  // ============================================================================
  // ADDITIONAL PROPERTY COVERAGES
  // ============================================================================
  {
    name: 'Water Damage',
    abbreviations: ['WD', 'WATER'],
    aliases: ['Water Damage Coverage', 'Water Leak Coverage'],
    keywords: ['water', 'damage', 'leak', 'pipe', 'burst', 'plumbing'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Flood Coverage'],
    description: 'Covers damage from accidental water discharge'
  },
  {
    name: 'Theft Coverage',
    abbreviations: ['THEFT', 'THF'],
    aliases: ['Burglary Coverage', 'Robbery Coverage'],
    keywords: ['theft', 'burglary', 'robbery', 'stealing', 'break-in'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Business Personal Property', 'Crime Coverage'],
    description: 'Covers loss from theft and burglary'
  },
  {
    name: 'Vandalism & Malicious Mischief',
    abbreviations: ['VMM', 'VAND'],
    aliases: ['Vandalism Coverage', 'Malicious Mischief'],
    keywords: ['vandalism', 'malicious', 'mischief', 'graffiti', 'damage'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Glass Coverage'],
    description: 'Covers intentional damage by others'
  },
  {
    name: 'Falling Objects',
    abbreviations: ['FO', 'FALL'],
    aliases: ['Falling Objects Coverage'],
    keywords: ['falling', 'objects', 'tree', 'aircraft', 'debris'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage'],
    description: 'Covers damage from falling objects'
  },
  {
    name: 'Weight of Ice, Snow or Sleet',
    abbreviations: ['ICE', 'SNOW'],
    aliases: ['Ice Damage', 'Snow Load'],
    keywords: ['ice', 'snow', 'sleet', 'weight', 'collapse', 'winter'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Named Perils',
    commonlyPairedWith: ['Building Coverage', 'Roof Coverage'],
    description: 'Covers damage from weight of snow and ice'
  },
  {
    name: 'Collapse Coverage',
    abbreviations: ['COLL', 'CLPS'],
    aliases: ['Building Collapse', 'Structural Collapse'],
    keywords: ['collapse', 'structural', 'failure', 'building'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Building Coverage', 'Weight of Ice, Snow or Sleet'],
    description: 'Covers structural collapse from specified causes'
  },
  {
    name: 'Fungus, Wet Rot, Dry Rot',
    abbreviations: ['MOLD', 'FUNGUS'],
    aliases: ['Mold Coverage', 'Rot Coverage'],
    keywords: ['fungus', 'mold', 'rot', 'mildew', 'moisture'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Building Coverage', 'Water Damage'],
    description: 'Limited coverage for mold and fungus damage'
  },
  {
    name: 'Utility Services',
    abbreviations: ['UTIL', 'US'],
    aliases: ['Off-Premises Power Failure', 'Utility Interruption'],
    keywords: ['utility', 'power', 'failure', 'outage', 'electric', 'gas'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Time Element',
    commonlyPairedWith: ['Business Income', 'Equipment Breakdown'],
    description: 'Covers loss from off-premises utility failure'
  },
  {
    name: 'Newly Acquired Property',
    abbreviations: ['NAP', 'NEWPROP'],
    aliases: ['Automatic Coverage', 'New Locations'],
    keywords: ['newly', 'acquired', 'property', 'automatic', 'locations'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Building Coverage', 'Business Personal Property'],
    description: 'Automatic coverage for newly acquired locations'
  },
  {
    name: 'Personal Effects',
    abbreviations: ['PE', 'PERSEFF'],
    aliases: ['Employee Personal Property'],
    keywords: ['personal', 'effects', 'employee', 'belongings'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Business Personal Property'],
    description: 'Covers employee personal property at work'
  },
  {
    name: 'Property in Transit',
    abbreviations: ['PIT', 'TRANSIT'],
    aliases: ['Goods in Transit', 'Shipment Coverage'],
    keywords: ['transit', 'shipping', 'transportation', 'delivery'],
    lineOfBusiness: ['property', 'inland marine'],
    category: 'Property - Specialty',
    commonlyPairedWith: ['Business Personal Property', 'Motor Truck Cargo'],
    description: 'Covers property while being transported'
  },
  {
    name: 'Property Off Premises',
    abbreviations: ['POP', 'OFFPREM'],
    aliases: ['Off-Premises Coverage'],
    keywords: ['off-premises', 'temporary', 'location', 'away'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Business Personal Property'],
    description: 'Covers property temporarily at other locations'
  },
  {
    name: 'Preservation of Property',
    abbreviations: ['PRES', 'PRESP'],
    aliases: ['Removal Coverage'],
    keywords: ['preservation', 'removal', 'protect', 'safeguard'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Building Coverage'],
    description: 'Covers property moved to protect from loss'
  },
  {
    name: 'Fire Department Service Charge',
    abbreviations: ['FDSC', 'FIRE'],
    aliases: ['Fire Service Charges'],
    keywords: ['fire', 'department', 'service', 'charge', 'municipal'],
    lineOfBusiness: ['property', 'commercial property', 'homeowners'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Fire Damage'],
    description: 'Covers fire department charges'
  },
  {
    name: 'Pollutant Cleanup and Removal',
    abbreviations: ['PCR', 'CLEANUP'],
    aliases: ['Pollution Cleanup'],
    keywords: ['pollutant', 'cleanup', 'removal', 'contamination'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Building Coverage'],
    description: 'Limited coverage for pollutant cleanup'
  },
  {
    name: 'Increased Cost of Construction',
    abbreviations: ['ICC', 'INCRCST'],
    aliases: ['Building Code Upgrade'],
    keywords: ['increased', 'cost', 'construction', 'upgrade', 'code'],
    lineOfBusiness: ['property', 'commercial property'],
    category: 'Property - Supplemental',
    commonlyPairedWith: ['Ordinance or Law', 'Building Coverage'],
    description: 'Covers increased costs due to building codes'
  },
  {
    name: 'Electronic Data Processing',
    abbreviations: ['EDP', 'COMP'],
    aliases: ['Computer Coverage', 'Technology Equipment'],
    keywords: ['electronic', 'data', 'processing', 'computer', 'server'],
    lineOfBusiness: ['property', 'inland marine', 'technology'],
    category: 'Property - Technology',
    commonlyPairedWith: ['Electronic Data', 'Equipment Breakdown'],
    description: 'Covers computer and technology equipment'
  },

  // ============================================================================
  // ADDITIONAL LIABILITY COVERAGES
  // ============================================================================
  {
    name: 'Premises Liability',
    abbreviations: ['PREML', 'PREM'],
    aliases: ['Premises Operations', 'Slip and Fall'],
    keywords: ['premises', 'operations', 'slip', 'fall', 'injury', 'visitor'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers injuries occurring on premises'
  },
  {
    name: 'Completed Operations',
    abbreviations: ['COMPOP', 'COMP'],
    aliases: ['Products-Completed Operations'],
    keywords: ['completed', 'operations', 'work', 'finished', 'project'],
    lineOfBusiness: ['liability', 'general liability', 'construction'],
    category: 'Liability - Products',
    commonlyPairedWith: ['Products Liability', 'Contractors Liability'],
    description: 'Covers liability after work is completed'
  },
  {
    name: 'Contractual Liability',
    abbreviations: ['CONTL', 'CONTR'],
    aliases: ['Hold Harmless', 'Indemnification'],
    keywords: ['contractual', 'liability', 'contract', 'hold harmless', 'indemnify'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers liability assumed under contract'
  },
  {
    name: 'Fire Legal Liability',
    abbreviations: ['FLL', 'FIRELEG'],
    aliases: ['Fire Damage Liability', 'Tenants Fire Liability'],
    keywords: ['fire', 'legal', 'liability', 'tenant', 'rented', 'premises'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability', 'Tenants Liability'],
    description: 'Covers fire damage to rented premises'
  },
  {
    name: 'Tenants Liability',
    abbreviations: ['TENL', 'TENANT'],
    aliases: ['Damage to Rented Premises'],
    keywords: ['tenant', 'rented', 'premises', 'damage', 'lease'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability', 'Fire Legal Liability'],
    description: 'Covers damage to rented premises'
  },
  {
    name: 'Independent Contractors',
    abbreviations: ['IC', 'INDCON'],
    aliases: ['Subcontractor Coverage'],
    keywords: ['independent', 'contractors', 'subcontractors', 'vendors'],
    lineOfBusiness: ['liability', 'general liability'],
    category: 'Liability - General',
    commonlyPairedWith: ['General Liability', 'Completed Operations'],
    description: 'Covers liability for work by independent contractors'
  },
  {
    name: 'Abuse and Molestation',
    abbreviations: ['A&M', 'ABUSE'],
    aliases: ['Sexual Abuse Liability', 'Molestation Coverage'],
    keywords: ['abuse', 'molestation', 'sexual', 'misconduct'],
    lineOfBusiness: ['liability', 'specialty'],
    category: 'Liability - Specialty',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers abuse and molestation claims'
  },
  {
    name: 'Athletic Participants',
    abbreviations: ['ATH', 'SPORTS'],
    aliases: ['Sports Participants', 'Athletic Injury'],
    keywords: ['athletic', 'sports', 'participants', 'injury', 'recreation'],
    lineOfBusiness: ['liability', 'specialty'],
    category: 'Liability - Specialty',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers liability for athletic activities'
  },
  {
    name: 'Cyber Extortion',
    abbreviations: ['CYBERX', 'EXTORT'],
    aliases: ['Ransomware Coverage', 'Cyber Ransom'],
    keywords: ['cyber', 'extortion', 'ransomware', 'ransom', 'hacking'],
    lineOfBusiness: ['cyber', 'liability'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Cyber Liability', 'Data Breach Response'],
    description: 'Covers cyber extortion and ransomware payments'
  },
  {
    name: 'Data Breach Response',
    abbreviations: ['DBR', 'BREACH'],
    aliases: ['Breach Response', 'Notification Costs'],
    keywords: ['data', 'breach', 'response', 'notification', 'forensics'],
    lineOfBusiness: ['cyber', 'liability'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Cyber Liability', 'Cyber Extortion'],
    description: 'Covers costs to respond to data breaches'
  },
  {
    name: 'Network Security Liability',
    abbreviations: ['NSL', 'NETSEC'],
    aliases: ['Network Security', 'IT Security Liability'],
    keywords: ['network', 'security', 'liability', 'IT', 'breach'],
    lineOfBusiness: ['cyber', 'liability'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Cyber Liability', 'Professional Liability'],
    description: 'Covers liability for network security failures'
  },
  {
    name: 'Privacy Liability',
    abbreviations: ['PRIV', 'PRIVACY'],
    aliases: ['Privacy Coverage', 'GDPR Coverage'],
    keywords: ['privacy', 'liability', 'GDPR', 'CCPA', 'personal', 'data'],
    lineOfBusiness: ['cyber', 'liability'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Cyber Liability', 'Data Breach Response'],
    description: 'Covers privacy law violations'
  },
  {
    name: 'Social Engineering Fraud',
    abbreviations: ['SEF', 'SOCENG'],
    aliases: ['Business Email Compromise', 'Phishing Coverage'],
    keywords: ['social', 'engineering', 'fraud', 'phishing', 'email', 'scam'],
    lineOfBusiness: ['cyber', 'crime'],
    category: 'Liability - Cyber',
    commonlyPairedWith: ['Cyber Liability', 'Crime Coverage'],
    description: 'Covers losses from social engineering attacks'
  },
  {
    name: 'Business Fraud',
    abbreviations: ['BF', 'FRAUD'],
    aliases: ['Commercial Fraud', 'Financial Fraud'],
    keywords: ['business', 'fraud', 'financial', 'deception', 'scam'],
    lineOfBusiness: ['crime', 'commercial'],
    category: 'Specialty',
    commonlyPairedWith: ['Crime Coverage', 'Employee Dishonesty'],
    description: 'Covers various forms of business fraud'
  },

  // ============================================================================
  // ADDITIONAL AUTO COVERAGES
  // ============================================================================
  {
    name: 'Rental Reimbursement',
    abbreviations: ['RR', 'RENTAL'],
    aliases: ['Rental Car Coverage', 'Transportation Expense'],
    keywords: ['rental', 'reimbursement', 'car', 'transportation', 'expense'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Supplemental',
    commonlyPairedWith: ['Collision Coverage', 'Comprehensive Coverage'],
    description: 'Covers rental car costs while vehicle is repaired'
  },
  {
    name: 'Towing & Labor',
    abbreviations: ['T&L', 'TOW'],
    aliases: ['Roadside Assistance', 'Towing Coverage'],
    keywords: ['towing', 'labor', 'roadside', 'assistance', 'breakdown'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Supplemental',
    commonlyPairedWith: ['Collision Coverage'],
    description: 'Covers towing and labor costs'
  },
  {
    name: 'Gap Coverage',
    abbreviations: ['GAP'],
    aliases: ['Loan/Lease Gap', 'Total Loss Gap'],
    keywords: ['gap', 'loan', 'lease', 'total', 'loss', 'payoff'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Supplemental',
    commonlyPairedWith: ['Collision Coverage', 'Comprehensive Coverage'],
    description: 'Covers gap between vehicle value and loan balance'
  },
  {
    name: 'Personal Injury Protection',
    abbreviations: ['PIP'],
    aliases: ['No-Fault Coverage', 'Personal Injury'],
    keywords: ['personal', 'injury', 'protection', 'no-fault', 'medical'],
    lineOfBusiness: ['auto'],
    category: 'Auto - No-Fault',
    commonlyPairedWith: ['Auto Liability', 'Medical Payments'],
    description: 'No-fault coverage for medical and lost wages'
  },
  {
    name: 'Drive Other Car',
    abbreviations: ['DOC'],
    aliases: ['DOC Coverage', 'Non-Owned Auto Liability'],
    keywords: ['drive', 'other', 'car', 'non-owned', 'borrowed'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Non-Owned',
    commonlyPairedWith: ['Auto Liability'],
    description: 'Covers named insured driving non-owned vehicles'
  },
  {
    name: 'Stated Amount',
    abbreviations: ['SA', 'STATED'],
    aliases: ['Agreed Value', 'Classic Car Value'],
    keywords: ['stated', 'amount', 'agreed', 'value', 'classic', 'antique'],
    lineOfBusiness: ['auto'],
    category: 'Auto - Specialty',
    commonlyPairedWith: ['Comprehensive Coverage'],
    description: 'Agreed value coverage for specialty vehicles'
  },
  {
    name: 'Auto Physical Damage',
    abbreviations: ['APD', 'PD'],
    aliases: ['Physical Damage', 'Vehicle Damage'],
    keywords: ['physical', 'damage', 'vehicle', 'auto', 'collision'],
    lineOfBusiness: ['auto', 'commercial auto'],
    category: 'Auto - Physical Damage',
    commonlyPairedWith: ['Collision Coverage', 'Comprehensive Coverage'],
    description: 'Covers physical damage to vehicles'
  },
  {
    name: 'Trailer Interchange',
    abbreviations: ['TI', 'TRAILER'],
    aliases: ['Trailer Coverage', 'Interchange Coverage'],
    keywords: ['trailer', 'interchange', 'trucking', 'cargo'],
    lineOfBusiness: ['auto', 'commercial auto', 'trucking'],
    category: 'Auto - Commercial',
    commonlyPairedWith: ['Motor Truck Cargo', 'Auto Liability'],
    description: 'Covers trailers in interchange agreements'
  },

  // ============================================================================
  // ADDITIONAL SPECIALTY COVERAGES
  // ============================================================================
  {
    name: 'Event Cancellation',
    abbreviations: ['EC', 'EVENT'],
    aliases: ['Event Insurance', 'Cancellation Coverage'],
    keywords: ['event', 'cancellation', 'postponement', 'weather', 'venue'],
    lineOfBusiness: ['specialty', 'event'],
    category: 'Specialty',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers losses from event cancellation'
  },
  {
    name: 'Prize Indemnification',
    abbreviations: ['PRIZE', 'PI'],
    aliases: ['Hole in One', 'Contest Coverage'],
    keywords: ['prize', 'indemnification', 'contest', 'promotion', 'giveaway'],
    lineOfBusiness: ['specialty'],
    category: 'Specialty',
    commonlyPairedWith: ['Event Cancellation'],
    description: 'Covers large prize payouts'
  },
  {
    name: 'Film Production',
    abbreviations: ['FILM', 'PROD'],
    aliases: ['Production Insurance', 'Entertainment Insurance'],
    keywords: ['film', 'production', 'movie', 'television', 'entertainment'],
    lineOfBusiness: ['specialty', 'entertainment'],
    category: 'Specialty',
    commonlyPairedWith: ['General Liability', 'Equipment Coverage'],
    description: 'Covers film and video production risks'
  },
  {
    name: 'Aviation Liability',
    abbreviations: ['AVNL', 'AVIA'],
    aliases: ['Aircraft Liability'],
    keywords: ['aviation', 'aircraft', 'airplane', 'flying', 'pilot'],
    lineOfBusiness: ['aviation'],
    category: 'Aviation',
    commonlyPairedWith: ['Aviation Hull'],
    description: 'Covers liability for aircraft operations'
  },
  {
    name: 'Aviation Hull',
    abbreviations: ['AVNH', 'HULL'],
    aliases: ['Aircraft Hull', 'Physical Damage'],
    keywords: ['aviation', 'hull', 'aircraft', 'physical', 'damage'],
    lineOfBusiness: ['aviation'],
    category: 'Aviation',
    commonlyPairedWith: ['Aviation Liability'],
    description: 'Covers physical damage to aircraft'
  },
  {
    name: 'Hangarkeepers Liability',
    abbreviations: ['HNGR', 'HANG'],
    aliases: ['Hangar Liability'],
    keywords: ['hangar', 'keepers', 'liability', 'aviation', 'storage'],
    lineOfBusiness: ['aviation'],
    category: 'Aviation',
    commonlyPairedWith: ['Aviation Liability'],
    description: 'Covers damage to aircraft in your care'
  },
  {
    name: 'Watercraft Liability',
    abbreviations: ['WATL', 'BOAT'],
    aliases: ['Boat Liability', 'Marine Liability'],
    keywords: ['watercraft', 'boat', 'marine', 'liability', 'vessel'],
    lineOfBusiness: ['marine', 'personal lines'],
    category: 'Marine',
    commonlyPairedWith: ['Watercraft Hull'],
    description: 'Covers liability for boat operations'
  },
  {
    name: 'Watercraft Hull',
    abbreviations: ['WATH', 'BOATH'],
    aliases: ['Boat Hull', 'Vessel Physical Damage'],
    keywords: ['watercraft', 'hull', 'boat', 'physical', 'damage'],
    lineOfBusiness: ['marine', 'personal lines'],
    category: 'Marine',
    commonlyPairedWith: ['Watercraft Liability'],
    description: 'Covers physical damage to boats'
  },
  {
    name: 'Livestock Mortality',
    abbreviations: ['LM', 'LIVE'],
    aliases: ['Animal Mortality', 'Livestock Coverage'],
    keywords: ['livestock', 'mortality', 'animal', 'farm', 'cattle'],
    lineOfBusiness: ['farm', 'agricultural'],
    category: 'Agricultural',
    commonlyPairedWith: ['Farm Property'],
    description: 'Covers death of livestock'
  },
  {
    name: 'Crop Insurance',
    abbreviations: ['CROP', 'CI'],
    aliases: ['Crop Coverage', 'Agricultural Coverage'],
    keywords: ['crop', 'agricultural', 'farm', 'harvest', 'weather'],
    lineOfBusiness: ['farm', 'agricultural'],
    category: 'Agricultural',
    commonlyPairedWith: ['Farm Property'],
    description: 'Covers crop losses from covered perils'
  },
  {
    name: 'Farm Property',
    abbreviations: ['FARM', 'FP'],
    aliases: ['Farm Coverage', 'Agricultural Property'],
    keywords: ['farm', 'property', 'agricultural', 'barn', 'equipment'],
    lineOfBusiness: ['farm', 'agricultural'],
    category: 'Agricultural',
    commonlyPairedWith: ['Livestock Mortality', 'Crop Insurance'],
    description: 'Covers farm buildings and equipment'
  },
  {
    name: 'Umbrella Commercial',
    abbreviations: ['CUL', 'COMUMB'],
    aliases: ['Commercial Umbrella', 'CUL Coverage'],
    keywords: ['umbrella', 'commercial', 'excess', 'catastrophic'],
    lineOfBusiness: ['liability', 'umbrella', 'commercial'],
    category: 'Liability - Excess',
    commonlyPairedWith: ['General Liability', 'Auto Liability', 'Employers Liability'],
    description: 'Excess liability for commercial risks'
  },
  {
    name: 'Umbrella Personal',
    abbreviations: ['PUL', 'PERSUMB'],
    aliases: ['Personal Umbrella', 'PUL Coverage'],
    keywords: ['umbrella', 'personal', 'excess', 'catastrophic'],
    lineOfBusiness: ['liability', 'umbrella', 'personal lines'],
    category: 'Liability - Excess',
    commonlyPairedWith: ['Personal Liability', 'Auto Liability'],
    description: 'Excess liability for personal risks'
  },
  {
    name: 'Excess Liability',
    abbreviations: ['XS', 'EXCESS'],
    aliases: ['Follow Form Excess'],
    keywords: ['excess', 'follow', 'form', 'additional', 'limits'],
    lineOfBusiness: ['liability', 'excess'],
    category: 'Liability - Excess',
    commonlyPairedWith: ['General Liability', 'Umbrella Liability'],
    description: 'Provides additional liability limits'
  },

  // ============================================================================
  // PROFESSIONAL LIABILITY BY INDUSTRY
  // ============================================================================
  {
    name: 'Medical Malpractice',
    abbreviations: ['MEDMAL', 'MPL'],
    aliases: ['Medical Professional Liability', 'Healthcare Liability'],
    keywords: ['medical', 'malpractice', 'doctor', 'physician', 'healthcare'],
    lineOfBusiness: ['professional liability', 'healthcare'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers medical professional negligence'
  },
  {
    name: 'Legal Malpractice',
    abbreviations: ['LEGMAL', 'LPL'],
    aliases: ['Lawyers Professional Liability'],
    keywords: ['legal', 'malpractice', 'lawyer', 'attorney', 'law firm'],
    lineOfBusiness: ['professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers legal professional negligence'
  },
  {
    name: 'Accountants Professional Liability',
    abbreviations: ['APL', 'ACCT'],
    aliases: ['CPA Liability', 'Accountants E&O'],
    keywords: ['accountant', 'CPA', 'professional', 'liability', 'audit'],
    lineOfBusiness: ['professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers accounting professional negligence'
  },
  {
    name: 'Architects & Engineers',
    abbreviations: ['A&E', 'AE'],
    aliases: ['Design Professional Liability'],
    keywords: ['architects', 'engineers', 'design', 'professional', 'plans'],
    lineOfBusiness: ['professional liability', 'construction'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability', 'Contractors Liability'],
    description: 'Covers design professional negligence'
  },
  {
    name: 'Real Estate E&O',
    abbreviations: ['REE&O', 'REEO'],
    aliases: ['Real Estate Professional Liability', 'Realtors E&O'],
    keywords: ['real', 'estate', 'realtor', 'agent', 'broker'],
    lineOfBusiness: ['professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers real estate professional negligence'
  },
  {
    name: 'Insurance Agents E&O',
    abbreviations: ['IAE&O', 'AGEO'],
    aliases: ['Insurance Agents Professional Liability'],
    keywords: ['insurance', 'agent', 'broker', 'producer', 'professional'],
    lineOfBusiness: ['professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers insurance agent negligence'
  },
  {
    name: 'Miscellaneous Professional Liability',
    abbreviations: ['MISC', 'MISCPL'],
    aliases: ['Allied Healthcare', 'Consultants E&O'],
    keywords: ['miscellaneous', 'professional', 'consultant', 'services'],
    lineOfBusiness: ['professional liability'],
    category: 'Liability - Professional',
    commonlyPairedWith: ['General Liability'],
    description: 'Covers various professional services'
  },

  // ============================================================================
  // CONSTRUCTION-SPECIFIC COVERAGES
  // ============================================================================
  {
    name: 'Contractors Liability',
    abbreviations: ['CONTL', 'CL'],
    aliases: ['Contractor General Liability'],
    keywords: ['contractors', 'liability', 'construction', 'builder'],
    lineOfBusiness: ['liability', 'construction'],
    category: 'Liability - Construction',
    commonlyPairedWith: ['Completed Operations', 'Builders Risk'],
    description: 'General liability for construction contractors'
  },
  {
    name: 'Wrap-Up Liability',
    abbreviations: ['WRAP', 'OCIP'],
    aliases: ['OCIP', 'CCIP', 'Rolling Wrap'],
    keywords: ['wrap-up', 'OCIP', 'CCIP', 'construction', 'consolidated'],
    lineOfBusiness: ['liability', 'construction'],
    category: 'Liability - Construction',
    commonlyPairedWith: ['Builders Risk', 'Contractors Liability'],
    description: 'Consolidated insurance for construction projects'
  },
  {
    name: 'Subcontractor Default Insurance',
    abbreviations: ['SDI', 'SUBDEF'],
    aliases: ['SDI Coverage', 'Subcontractor Risk'],
    keywords: ['subcontractor', 'default', 'construction', 'performance'],
    lineOfBusiness: ['construction', 'surety'],
    category: 'Specialty',
    commonlyPairedWith: ['Contractors Liability', 'Surety Bond'],
    description: 'Covers losses from subcontractor default'
  },
  {
    name: 'Contractors Pollution',
    abbreviations: ['CPL', 'CONTPOL'],
    aliases: ['Contractors Environmental Liability'],
    keywords: ['contractors', 'pollution', 'environmental', 'construction'],
    lineOfBusiness: ['liability', 'construction', 'environmental'],
    category: 'Liability - Environmental',
    commonlyPairedWith: ['Contractors Liability', 'Pollution Liability'],
    description: 'Pollution liability for contractors'
  },
  {
    name: 'Project Specific Liability',
    abbreviations: ['PSL', 'PROJ'],
    aliases: ['Project Policy', 'Job-Specific Coverage'],
    keywords: ['project', 'specific', 'construction', 'job'],
    lineOfBusiness: ['liability', 'construction'],
    category: 'Liability - Construction',
    commonlyPairedWith: ['Builders Risk', 'Wrap-Up Liability'],
    description: 'Liability coverage for specific projects'
  },

  // ============================================================================
  // HEALTHCARE-SPECIFIC COVERAGES
  // ============================================================================
  {
    name: 'Hospital Professional Liability',
    abbreviations: ['HPL', 'HOSP'],
    aliases: ['Hospital Malpractice'],
    keywords: ['hospital', 'professional', 'liability', 'healthcare', 'medical'],
    lineOfBusiness: ['professional liability', 'healthcare'],
    category: 'Liability - Healthcare',
    commonlyPairedWith: ['General Liability', 'Medical Malpractice'],
    description: 'Professional liability for hospitals'
  },
  {
    name: 'Nursing Home Liability',
    abbreviations: ['NHL', 'NURSE'],
    aliases: ['Long-Term Care Liability'],
    keywords: ['nursing', 'home', 'liability', 'long-term', 'care', 'elder'],
    lineOfBusiness: ['professional liability', 'healthcare'],
    category: 'Liability - Healthcare',
    commonlyPairedWith: ['General Liability', 'Abuse and Molestation'],
    description: 'Liability for nursing home operations'
  },
  {
    name: 'Allied Healthcare Professional',
    abbreviations: ['AHP', 'ALLIED'],
    aliases: ['Allied Health Liability'],
    keywords: ['allied', 'healthcare', 'nurse', 'therapist', 'technician'],
    lineOfBusiness: ['professional liability', 'healthcare'],
    category: 'Liability - Healthcare',
    commonlyPairedWith: ['General Liability'],
    description: 'Liability for allied healthcare professionals'
  },

  // ============================================================================
  // FINANCIAL INSTITUTION COVERAGES
  // ============================================================================
  {
    name: 'Financial Institution Bond',
    abbreviations: ['FIB', 'BOND'],
    aliases: ['Bankers Blanket Bond'],
    keywords: ['financial', 'institution', 'bond', 'bank', 'fidelity'],
    lineOfBusiness: ['fidelity', 'financial institutions'],
    category: 'Financial Institutions',
    commonlyPairedWith: ['Directors & Officers Liability'],
    description: 'Fidelity bond for financial institutions'
  },
  {
    name: 'Lender Liability',
    abbreviations: ['LENDL', 'LEND'],
    aliases: ['Lenders E&O'],
    keywords: ['lender', 'liability', 'loan', 'mortgage', 'bank'],
    lineOfBusiness: ['liability', 'financial institutions'],
    category: 'Financial Institutions',
    commonlyPairedWith: ['Professional Liability'],
    description: 'Covers liability for lending activities'
  },
  {
    name: 'Securities Broker-Dealer',
    abbreviations: ['BD', 'SEC'],
    aliases: ['Broker-Dealer E&O'],
    keywords: ['securities', 'broker', 'dealer', 'investment', 'trading'],
    lineOfBusiness: ['professional liability', 'financial institutions'],
    category: 'Financial Institutions',
    commonlyPairedWith: ['Fiduciary Liability'],
    description: 'Liability for securities broker-dealers'
  },
  {
    name: 'Investment Advisor Liability',
    abbreviations: ['IAL', 'RIA'],
    aliases: ['RIA E&O', 'Investment Management Liability'],
    keywords: ['investment', 'advisor', 'RIA', 'management', 'fiduciary'],
    lineOfBusiness: ['professional liability', 'financial institutions'],
    category: 'Financial Institutions',
    commonlyPairedWith: ['Fiduciary Liability'],
    description: 'Liability for investment advisors'
  },

  // ============================================================================
  // NON-PROFIT COVERAGES
  // ============================================================================
  {
    name: 'Nonprofit D&O',
    abbreviations: ['NPD&O', 'NPDO'],
    aliases: ['Nonprofit Directors & Officers'],
    keywords: ['nonprofit', 'directors', 'officers', 'charity', 'board'],
    lineOfBusiness: ['management liability', 'nonprofit'],
    category: 'Liability - Management',
    commonlyPairedWith: ['Employment Practices Liability'],
    description: 'D&O coverage for nonprofits'
  },
  {
    name: 'Volunteer Liability',
    abbreviations: ['VOL', 'VOLUN'],
    aliases: ['Volunteer Coverage'],
    keywords: ['volunteer', 'liability', 'nonprofit', 'charity'],
    lineOfBusiness: ['liability', 'nonprofit'],
    category: 'Liability - Specialty',
    commonlyPairedWith: ['General Liability', 'Nonprofit D&O'],
    description: 'Covers liability of volunteers'
  },
  {
    name: 'Improper Sexual Conduct',
    abbreviations: ['ISC', 'SEXUAL'],
    aliases: ['Sexual Misconduct Liability'],
    keywords: ['sexual', 'misconduct', 'improper', 'conduct', 'abuse'],
    lineOfBusiness: ['liability', 'specialty'],
    category: 'Liability - Specialty',
    commonlyPairedWith: ['General Liability', 'Abuse and Molestation'],
    description: 'Covers sexual misconduct claims'
  },
];

