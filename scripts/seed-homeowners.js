#!/usr/bin/env node
/**
 * Seed Script: Personal Lines Homeowners Product (HO-3)
 *
 * Populates the application with realistic P&C insurance data for a
 * standard ISO HO-3 Special Form homeowners product, including:
 *   - Organization & user profile
 *   - Product with version
 *   - 12+ coverages (A–F, endorsements, conditions)
 *   - Limits and deductibles for each coverage
 *   - 8 realistic ISO homeowners form PDFs
 *   - Clauses extracted from forms
 *   - Underwriting rules
 *   - Rate program with rating steps
 *   - Rating tables (territory, protection class, age-of-home)
 *   - Data dictionary fields
 *   - State programs (50 states + DC)
 *   - Change set (sample governance workflow)
 *   - Tasks
 *
 * Usage:
 *   node scripts/seed-homeowners.js
 *
 * Prerequisites:
 *   - Firebase project must be configured in .firebaserc
 *   - Must be authenticated: firebase login
 *   - Runs against the 'default' project (insurance-product-hub)
 */

const admin = require('../functions/node_modules/firebase-admin');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Initialize Firebase Admin
// ============================================================================
admin.initializeApp({
  projectId: 'insurance-product-hub',
});

const db = admin.firestore();
const { Timestamp, FieldValue } = admin.firestore;
const now = Timestamp.now;

// ============================================================================
// Constants
// ============================================================================
const ORG_ID = 'org_acme_insurance';
const USER_ID = 'seed_user_001';
const USER_EMAIL = 'product.manager@acmeinsurance.com';
const USER_NAME = 'Sarah Chen';

const PRODUCT_ID = 'ho3_homeowners';
const PRODUCT_VERSION_ID = 'v1_2026';
const RATE_PROGRAM_ID = 'ho3_base_rates';
const RATE_VERSION_ID = 'rv1_2026';

// ============================================================================
// Helpers
// ============================================================================
function ts() { return now(); }
function isoNow() { return new Date().toISOString().split('T')[0]; }

const auditFields = {
  createdAt: ts(),
  createdBy: USER_ID,
  updatedAt: ts(),
  updatedBy: USER_ID,
};

// All 50 states + DC
const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY'
];

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',
  FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',
  IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',
  WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'
};

// ============================================================================
// PDF Generation
// ============================================================================
async function generateFormPDF(formNumber, title, editionDate, sections) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontSize = 10;
  const headerSize = 12;
  const titleSize = 14;
  const margin = 54; // 0.75 inch
  const lineHeight = 14;

  let page = pdfDoc.addPage([612, 792]); // Letter
  let y = 792 - margin;

  function newPage() {
    page = pdfDoc.addPage([612, 792]);
    y = 792 - margin;
  }

  function drawText(text, opts = {}) {
    const f = opts.font || font;
    const s = opts.size || fontSize;
    const x = opts.x || margin;
    if (y < margin + 30) newPage();
    page.drawText(text, { x, y, size: s, font: f, color: rgb(0, 0, 0) });
    y -= (opts.lineHeight || lineHeight);
  }

  function drawWrappedText(text, opts = {}) {
    const f = opts.font || font;
    const s = opts.size || fontSize;
    const maxWidth = 612 - 2 * margin;
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = f.widthOfTextAtSize(testLine, s);
      if (width > maxWidth && line) {
        drawText(line, { ...opts, font: f, size: s });
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) drawText(line, { ...opts, font: f, size: s });
  }

  // Header
  drawText('ACME INSURANCE COMPANY', { font: fontBold, size: titleSize, x: margin });
  y -= 6;
  drawText(`${formNumber}  (Ed. ${editionDate})`, { font: fontBold, size: headerSize });
  y -= 4;
  // Horizontal rule
  page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: 612 - margin, y: y + 6 }, thickness: 1, color: rgb(0, 0, 0) });
  y -= 10;
  drawText(title.toUpperCase(), { font: fontBold, size: headerSize });
  y -= 10;

  for (const section of sections) {
    if (y < margin + 60) newPage();
    y -= 6;
    drawText(section.heading, { font: fontBold, size: 11 });
    y -= 4;
    for (const para of section.paragraphs) {
      drawWrappedText(para, { font: font, size: fontSize });
      y -= 6;
    }
  }

  // Footer on each page
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`${formNumber} (Ed. ${editionDate})`, { x: margin, y: 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: 500, y: 30, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
    p.drawText('© 2026 Acme Insurance Company. All rights reserved.', { x: 200, y: 20, size: 7, font: fontItalic, color: rgb(0.5, 0.5, 0.5) });
  });

  return pdfDoc.save();
}

// ============================================================================
// Form Definitions — Realistic ISO-style HO Forms
// ============================================================================
const FORMS = [
  {
    id: 'form_ho3',
    formNumber: 'HO 00 03',
    title: 'Homeowners 3 – Special Form',
    type: 'policy',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'AGREEMENT', paragraphs: [
        'We will provide the insurance described in this policy in return for the premium and compliance with all applicable provisions of this policy.',
        'This policy applies only to the coverages for which a specific limit of liability is shown in the Declarations. Unless otherwise stated, the limits of liability shown in the Declarations include the cost of defense, settlement and supplementary payments.'
      ]},
      { heading: 'DEFINITIONS', paragraphs: [
        '"Bodily injury" means bodily harm, sickness or disease, including required care, loss of services and death that results.',
        '"Business" means a trade, profession or occupation engaged in on a full-time, part-time or occasional basis; or any other activity engaged in for money or other compensation.',
        '"Dwelling" means the one, two, three or four family building structure identified as the insured dwelling in the Declarations, including attached structures.',
        '"Insured" means you and residents of your household who are your relatives; or other persons under the age of 21 and in the care of any person named above.',
        '"Insured location" means the residence premises; any premises used by you in connection with a premises described above; any premises described in the Declarations.',
        '"Occurrence" means an accident, including continuous or repeated exposure to substantially the same general harmful conditions, which results, during the policy period, in bodily injury or property damage.',
        '"Property damage" means physical injury to, destruction of, or loss of use of tangible property.',
        '"Residence premises" means the one-family dwelling where you reside as shown in the Declarations, including the grounds, other structures and outbuildings appurtenant to the dwelling.',
      ]},
      { heading: 'SECTION I — PROPERTY COVERAGES', paragraphs: [
        'COVERAGE A — DWELLING. We cover the dwelling on the residence premises shown in the Declarations, including structures attached to the dwelling and materials and supplies located on or next to the residence premises used to construct, alter or repair the dwelling or other structures on the residence premises.',
        'COVERAGE B — OTHER STRUCTURES. We cover other structures on the residence premises set apart from the dwelling by clear space. This includes structures connected to the dwelling by only a fence, utility line, or similar connection. We do not cover other structures rented or held for rental to any person not a tenant of the dwelling, unless used solely as a private garage.',
        'COVERAGE C — PERSONAL PROPERTY. We cover personal property owned or used by an insured while it is anywhere in the world. After a loss and at your request, we will cover personal property owned by others while the property is on the part of the residence premises occupied by an insured.',
        'COVERAGE D — LOSS OF USE. If a loss covered under Section I makes that part of the residence premises where you reside not fit to live in, we cover additional living expenses incurred by you so that your household can maintain its normal standard of living.',
      ]},
      { heading: 'SECTION I — PERILS INSURED AGAINST', paragraphs: [
        'COVERAGE A — DWELLING AND COVERAGE B — OTHER STRUCTURES. We insure against direct physical loss to property described in Coverages A and B. We do not insure, however, for loss caused by: Ordinance or law; Earth movement; Water damage; Power failure; Neglect; War; Nuclear hazard; Intentional loss; Governmental action.',
        'COVERAGE C — PERSONAL PROPERTY. We insure for direct physical loss to the property described in Coverage C caused by any of the following perils unless the loss is excluded in Section I — Exclusions: Fire or lightning; Windstorm or hail; Explosion; Riot or civil commotion; Aircraft; Vehicles; Smoke; Vandalism or malicious mischief; Theft; Falling objects; Weight of ice, snow or sleet; Accidental discharge or overflow of water or steam; Sudden and accidental tearing apart of heating, air conditioning, or fire protective sprinkler system; Freezing; Sudden and accidental damage from artificially generated electrical current; Volcanic eruption.',
      ]},
      { heading: 'SECTION I — EXCLUSIONS', paragraphs: [
        'We do not insure for loss caused directly or indirectly by any of the following: Ordinance or law; Earth movement including earthquake, landslide, mudslide, mudflow, sinkhole, subsidence; Water damage meaning flood, surface water, waves, tidal water, tsunami, overflow of body of water, spray from any of these whether or not driven by wind; Power failure occurring off the residence premises; Neglect of an insured to use all reasonable means to save and preserve property; War including undeclared war, civil war, insurrection; Nuclear hazard; Intentional loss by or at the direction of an insured; Governmental action.',
        'We do not insure for loss to property described in Coverages A and B caused by: Wear and tear, marring, deterioration; Mechanical breakdown; Smog, rust or other corrosion; Mold, fungus or wet rot; Contamination; Settling, shrinking, bulging; Nesting or infestation of insects, birds, vermin or rodents; Animals owned or kept by an insured.',
      ]},
      { heading: 'SECTION I — CONDITIONS', paragraphs: [
        'INSURABLE INTEREST AND LIMIT OF LIABILITY. Even if more than one person has an insurable interest in the property covered, we will not be liable in any one loss: to an insured for more than the amount of such insured\'s interest at the time of loss; or for more than the applicable limit of liability.',
        'DEDUCTIBLE. Unless otherwise noted in this policy, the following deductible provision applies: Subject to the policy limits that apply, we will pay only that part of the total of all loss payable that exceeds the deductible amount shown in the Declarations.',
        'DUTIES AFTER LOSS. In case of a loss to covered property, you must: give prompt notice to us or our agent; protect the property from further damage; cooperate with us in the investigation of a claim; prepare an inventory of damaged personal property.',
        'LOSS SETTLEMENT. Covered property losses are settled as follows: Personal property and structures that are not buildings at actual cash value at the time of loss; Buildings under Coverage A or B at replacement cost without deduction for depreciation, subject to the following conditions.',
        'PAIR OR SET. In case of loss to a pair or set, we may elect to: restore or repair any part to restore the pair or set to its value before the loss; or pay the difference between actual cash value of the property before and after the loss.',
        'APPRAISAL. If you and we fail to agree on the amount of loss, either may demand an appraisal of the loss. Each party will select a competent appraiser within 20 days after receiving a written request from the other.',
        'MORTGAGE CLAUSE. If a mortgagee is named in this policy, any loss payable under Coverage A or B will be paid to the mortgagee and you, as interests appear.',
      ]},
      { heading: 'SECTION II — LIABILITY COVERAGES', paragraphs: [
        'COVERAGE E — PERSONAL LIABILITY. If a claim is made or a suit is brought against an insured for damages because of bodily injury or property damage caused by an occurrence to which this coverage applies, we will: pay up to our limit of liability for the damages for which an insured is legally liable; and provide a defense at our expense by counsel of our choice.',
        'COVERAGE F — MEDICAL PAYMENTS TO OTHERS. We will pay the necessary medical expenses that are incurred or medically ascertained within three years from the date of an accident causing bodily injury. Medical expenses means reasonable charges for medical, surgical, x-ray, dental, ambulance, hospital, professional nursing, prosthetic devices and funeral services.',
      ]},
      { heading: 'SECTION II — EXCLUSIONS', paragraphs: [
        'Coverage E — Personal Liability and Coverage F — Medical Payments to Others do not apply to: bodily injury or property damage which is expected or intended by an insured; bodily injury or property damage arising out of or in connection with a business engaged in by an insured; bodily injury or property damage arising out of the rendering or failure to render professional services; bodily injury or property damage arising out of a premises owned by an insured which is not an insured location.',
        'Coverage E — Personal Liability does not apply to: liability assumed under contract; property damage to property owned by an insured; property damage to property rented to, occupied or used by or in the care of an insured; bodily injury to any person eligible to receive any benefits voluntarily provided or required to be provided by an insured under any workers\' compensation law.',
      ]},
      { heading: 'SECTION II — CONDITIONS', paragraphs: [
        'LIMIT OF LIABILITY. Our total liability under Coverage E for all damages resulting from any one occurrence will not be more than the Coverage E limit of liability shown in the Declarations.',
        'SEVERABILITY OF INSURANCE. This insurance applies separately to each insured. This condition will not increase our limit of liability for any one occurrence.',
        'DUTIES AFTER OCCURRENCE. In case of an occurrence, you or the appropriate insured must: give written notice to us or our agent as soon as is practical; forward to us every notice, demand, summons or other process relating to the occurrence; at our request, help us make settlement, enforce any right of contribution or indemnity; attend hearings and trials.',
      ]},
      { heading: 'GENERAL CONDITIONS', paragraphs: [
        'POLICY PERIOD. This policy applies only to loss which occurs during the policy period.',
        'CONCEALMENT OR FRAUD. We provide coverage to no insureds under this policy if, whether before or after a loss, an insured has: intentionally concealed or misrepresented any material fact or circumstance; engaged in fraudulent conduct; or made false statements relating to this insurance.',
        'LIBERALIZATION CLAUSE. If we adopt any revision that would broaden the coverage under this policy without additional premium, the broader coverage will apply to this policy.',
        'WAIVER OR CHANGE OF POLICY PROVISIONS. A waiver or change of a provision of this policy must be in writing by us to be valid.',
        'CANCELLATION. You may cancel this policy at any time by returning it to us or by letting us know in writing of the date cancellation is to take effect. We may cancel this policy by mailing or delivering to the named insured written notice at least 10 days before the date cancellation takes effect if cancellation is for nonpayment of premium; or 30 days before the date cancellation takes effect if cancellation is for any other reason.',
        'NONRENEWAL. We may elect not to renew this policy. We will mail or deliver written notice to the named insured at least 30 days before the expiration date of this policy.',
        'ASSIGNMENT. Assignment of this policy will not be valid unless we give our written consent.',
        'SUBROGATION. An insured may waive in writing before a loss all rights of recovery against any person. If not waived, we may require an assignment of rights of recovery for a loss to the extent that payment is made by us.',
        'DEATH. If any person named in the Declarations or the spouse, if a resident of the same household, dies, the following apply: the legal representative of the deceased; and any member of the deceased\'s household who is an insured at the time of death, but only while a resident of the residence premises.',
      ]},
    ],
  },
  {
    id: 'form_ho3_dec',
    formNumber: 'HO DS 01',
    title: 'Homeowners Policy Declarations',
    type: 'dec_page',
    origin: 'carrier',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'DECLARATIONS PAGE', paragraphs: [
        'Policy Number: [Policy Number]',
        'Named Insured: [Named Insured]',
        'Mailing Address: [Mailing Address]',
        'Policy Period: From [Effective Date] to [Expiration Date] at 12:01 A.M. standard time at the residence premises.',
      ]},
      { heading: 'PROPERTY ADDRESS', paragraphs: [
        'Location of Residence Premises: [Property Address]',
        'Description: [Number of Families] family dwelling',
        'Year Built: [Year Built]',
        'Construction Type: [Construction Type]',
        'Protection Class: [Protection Class]',
        'Territory: [Territory Code]',
      ]},
      { heading: 'COVERAGE SUMMARY', paragraphs: [
        'Coverage A — Dwelling: $[Amount]',
        'Coverage B — Other Structures: $[Amount] (10% of Coverage A)',
        'Coverage C — Personal Property: $[Amount] (50% of Coverage A)',
        'Coverage D — Loss of Use: $[Amount] (20% of Coverage A)',
        'Coverage E — Personal Liability: $[Amount] Each Occurrence',
        'Coverage F — Medical Payments to Others: $[Amount] Each Person',
        'Section I Deductible: $[Amount]',
      ]},
      { heading: 'FORMS AND ENDORSEMENTS', paragraphs: [
        'Forms and endorsements applying to this policy:',
        'HO 00 03 01 2026 — Homeowners 3 – Special Form',
        'HO DS 01 01 2026 — Homeowners Policy Declarations',
        'HO 04 10 01 2026 — Additional Interests',
        'HO 04 61 01 2026 — Scheduled Personal Property',
        'HO 04 90 01 2026 — Personal Property Replacement Cost',
        'HO 17 33 01 2026 — Mold, Fungus or Wet Rot Exclusion',
        'IL 00 17 01 2026 — Common Policy Conditions',
        'IL 00 21 01 2026 — Nuclear Energy Liability Exclusion',
      ]},
      { heading: 'PREMIUM SUMMARY', paragraphs: [
        'Base Premium: $[Amount]',
        'Endorsement Premiums: $[Amount]',
        'Discounts Applied: [Discounts]',
        'Total Annual Premium: $[Amount]',
        'Installment Plan: [Plan Type]',
      ]},
    ],
  },
  {
    id: 'form_ho0410',
    formNumber: 'HO 04 10',
    title: 'Additional Interests – Homeowners',
    type: 'endorsement',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'SCHEDULE', paragraphs: [
        'Name: [Name of Additional Interest]',
        'Address: [Address]',
        'Applicable Coverage: [Coverage Part]',
        'Nature of Interest: [Mortgagee / Loss Payee / Additional Insured]',
        'Information required to complete this schedule, if not shown above, will be shown in the Declarations.',
      ]},
      { heading: 'A. ADDITIONAL INSURED', paragraphs: [
        'The person or organization shown in the Schedule is an insured for liability arising out of the ownership, maintenance or use of that part of the premises designated in the Schedule and subject to the following additional provisions:',
        '1. This insurance does not apply to structural alterations, new construction or demolition operations performed by or on behalf of the additional insured.',
        '2. This insurance does not apply to bodily injury or property damage arising out of the sole negligence of the additional insured.',
      ]},
      { heading: 'B. MORTGAGEE / LOSS PAYEE', paragraphs: [
        'The word "mortgagee" includes trustee. If a mortgagee is named in this policy, any loss payable under Section I will be paid to the mortgagee and you, as interests appear.',
        'If we deny your claim, that denial will not apply to a valid claim of the mortgagee, if the mortgagee: has submitted a signed, sworn proof of loss within 60 days after receiving notice from us of your denial of claim; has notified us of any change in ownership or occupancy.',
        'If we pay the mortgagee for any loss and deny payment to you, we are subrogated to all the rights of the mortgagee granted under the mortgage on the property.',
      ]},
    ],
  },
  {
    id: 'form_ho0461',
    formNumber: 'HO 04 61',
    title: 'Scheduled Personal Property Endorsement',
    type: 'endorsement',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'SCHEDULE', paragraphs: [
        'This endorsement changes the policy. Please read it carefully.',
        'Class of Personal Property / Amount of Insurance:',
        '1. Jewelry: $[Amount]',
        '2. Furs and Garments Trimmed with Fur: $[Amount]',
        '3. Cameras and Projection Machines: $[Amount]',
        '4. Musical Instruments: $[Amount]',
        '5. Silverware: $[Amount]',
        '6. Golfer\'s Equipment: $[Amount]',
        '7. Fine Arts: $[Amount]',
        '8. Postage Stamps: $[Amount]',
        '9. Rare and Current Coins: $[Amount]',
      ]},
      { heading: 'COVERAGE', paragraphs: [
        'We cover the classes of personal property indicated by an amount of insurance in the Schedule above. This coverage is for direct physical loss unless the loss is excluded in Section I — Exclusions of the policy.',
        'Property covered under this endorsement is not subject to the Coverage C limitations or the deductible clause in the policy. This endorsement supersedes the special limits of liability provisions of Coverage C that may apply.',
        'The amounts shown in the Schedule for each class of property are the most we will pay for any loss. If an article cannot be replaced or repaired, we will pay the lesser of: the scheduled amount; or the actual cash value of the article at the time of loss.',
      ]},
      { heading: 'EXCLUSIONS', paragraphs: [
        'In addition to the exclusions in Section I of the policy, we do not cover loss caused by or resulting from: breakage of fragile or brittle articles (applies only to fine arts); wear and tear, gradual deterioration; insects or vermin; inherent vice, latent defect; mechanical breakdown.',
        'We do not cover loss of a precious or semi-precious stone from its setting.',
      ]},
    ],
  },
  {
    id: 'form_ho0490',
    formNumber: 'HO 04 90',
    title: 'Personal Property Replacement Cost Loss Settlement',
    type: 'endorsement',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'THIS ENDORSEMENT CHANGES THE POLICY. PLEASE READ IT CAREFULLY.', paragraphs: [
        'PERSONAL PROPERTY REPLACEMENT COST LOSS SETTLEMENT',
      ]},
      { heading: 'A. ELIGIBLE PROPERTY', paragraphs: [
        'Covered losses to personal property — Coverage C — will be settled at replacement cost without deduction for depreciation, subject to the following conditions.',
        'This endorsement applies to personal property covered under Coverage C of this policy. However, this endorsement does not apply to: antiques, fine arts, paintings and similar articles of rarity or antiquity; memorabilia, souvenirs, collectors\' items; articles not maintained in good or workable condition; articles that are outdated or obsolete.',
      ]},
      { heading: 'B. LOSS SETTLEMENT', paragraphs: [
        'Losses to eligible property will be settled at replacement cost. Replacement cost means the cost to replace on the same premises with property of comparable material, quality and function, without deduction for depreciation.',
        'We will not pay more than the least of: replacement cost at the time of loss; the full cost of repair; any applicable limit of liability or special limit of liability in this policy; or any applicable Coverage C limit of liability.',
        'If the actual replacement or repair is not made, claims will be settled on an actual cash value basis. An insured may make a claim for the additional amount under replacement cost within 180 days after the loss.',
      ]},
    ],
  },
  {
    id: 'form_ho1733',
    formNumber: 'HO 17 33',
    title: 'Mold, Fungus or Wet Rot Exclusion',
    type: 'endorsement',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'THIS ENDORSEMENT CHANGES THE POLICY. PLEASE READ IT CAREFULLY.', paragraphs: [
        'MOLD, FUNGUS OR WET ROT EXCLUSION',
      ]},
      { heading: 'A. SECTION I — PROPERTY COVERAGES', paragraphs: [
        'The following exclusion is added to Section I — Exclusions:',
        'We do not cover loss caused by, contributed to, or consisting of mold, fungus or wet rot, whether or not the mold, fungus or wet rot is hidden from view, including: the presence, growth, proliferation, spread or any activity of mold, fungus or wet rot; any remediation, removal, abatement, mitigation, disposal or treatment of mold, fungus or wet rot.',
        'This exclusion applies regardless of any other cause or event that contributes concurrently or in any sequence to the loss.',
        'Limited exception: If mold, fungus or wet rot results from a peril otherwise covered under this policy, we will pay for that portion of the loss caused by the covered peril, subject to a maximum payment of $10,000 for the total of all loss arising out of all instances of mold, fungus or wet rot that are the direct result of a covered peril.',
      ]},
      { heading: 'B. SECTION II — LIABILITY COVERAGES', paragraphs: [
        'The following exclusion is added to Coverage E — Personal Liability and Coverage F — Medical Payments to Others:',
        'This insurance does not apply to any claim, demand, suit or judgment based on, arising out of, or in any way related to mold, fungus or wet rot, whether or not the mold, fungus or wet rot is hidden from view.',
        'Mold means any type or form of mold, including but not limited to mold that may give rise to health-related problems, Stachybotrys chartarum and Aspergillus.',
        'Fungus means any type or form of fungus, including but not limited to yeast, mushrooms, rusts and mildew.',
        'Wet rot means any type of wood decay caused by a fungus that attacks moist wood.',
      ]},
    ],
  },
  {
    id: 'form_il0017',
    formNumber: 'IL 00 17',
    title: 'Common Policy Conditions',
    type: 'conditions',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'COMMON POLICY CONDITIONS', paragraphs: [
        'All coverages of this policy are subject to the following conditions.',
      ]},
      { heading: 'A. CANCELLATION', paragraphs: [
        '1. The first Named Insured shown in the Declarations may cancel this policy by mailing or delivering to us advance written notice of cancellation.',
        '2. We may cancel this policy by mailing or delivering to the first Named Insured written notice of cancellation at least: a. 10 days before the effective date of cancellation if we cancel for nonpayment of premium; or b. 30 days before the effective date of cancellation if we cancel for any other reason.',
        '3. We will mail or deliver our notice to the first Named Insured\'s last mailing address known to us.',
        '4. Notice of cancellation will state the effective date of cancellation. The policy period will end on that date.',
        '5. If this policy is cancelled, we will send the first Named Insured any premium refund due. The cancellation will be effective even if we have not made or offered a refund.',
      ]},
      { heading: 'B. CHANGES', paragraphs: [
        'This policy contains all the agreements between you and us concerning the insurance afforded. The first Named Insured shown in the Declarations is authorized to make changes in the terms of this policy with our consent. This policy\'s terms can be amended or waived only by endorsement issued by us and made a part of this policy.',
      ]},
      { heading: 'C. EXAMINATION OF YOUR BOOKS AND RECORDS', paragraphs: [
        'We may examine and audit your books and records as they relate to this policy at any time during the policy period and up to three years afterward.',
      ]},
      { heading: 'D. INSPECTIONS AND SURVEYS', paragraphs: [
        'We have the right to: make inspections and surveys at any time; give you reports on the conditions we find; and recommend changes. Any inspections, surveys, reports or recommendations relate only to insurability and the premiums to be charged. We do not make safety inspections. We do not undertake to perform the duty of any person or organization to provide for the health or safety of workers or the public.',
      ]},
      { heading: 'E. PREMIUMS', paragraphs: [
        'The first Named Insured shown in the Declarations is responsible for the payment of all premiums. We will compute all premiums for this policy in accordance with our rules and rates current at the time the premium is due.',
      ]},
      { heading: 'F. TRANSFER OF YOUR RIGHTS AND DUTIES UNDER THIS POLICY', paragraphs: [
        'Your rights and duties under this policy may not be transferred without our written consent except in the case of death of an individual named insured.',
      ]},
    ],
  },
  {
    id: 'form_il0021',
    formNumber: 'IL 00 21',
    title: 'Nuclear Energy Liability Exclusion Endorsement (Broad Form)',
    type: 'endorsement',
    origin: 'iso',
    editionDate: '01 2026',
    jurisdictions: ['ALL'],
    sections: [
      { heading: 'NUCLEAR ENERGY LIABILITY EXCLUSION ENDORSEMENT', paragraphs: [
        'This endorsement modifies insurance provided under the HOMEOWNERS POLICY.',
      ]},
      { heading: 'EXCLUSION', paragraphs: [
        'This policy does not apply: Under any Liability Coverage, to bodily injury or property damage with respect to which an insured under this policy is also an insured under a nuclear energy liability policy issued by Nuclear Energy Liability Insurance Association, Mutual Atomic Energy Liability Underwriters, Nuclear Insurance Association of Canada or any of their successors.',
        'Under any Medical Payments Coverage, to expenses incurred with respect to bodily injury resulting from the hazardous properties of nuclear material, if the nuclear material is at any nuclear facility owned by, or operated by or on behalf of, an insured.',
        'Under any Liability Coverage, to bodily injury or property damage resulting from the hazardous properties of nuclear material, if the nuclear material is at any nuclear facility owned by, or operated by or on behalf of, an insured.',
      ]},
      { heading: 'DEFINITIONS', paragraphs: [
        '"Hazardous properties" includes radioactive, toxic or explosive properties of nuclear material.',
        '"Nuclear material" means source material, special nuclear material or by-product material as those terms are defined in the Atomic Energy Act of 1954 or in any law amendatory thereof.',
        '"Nuclear facility" means any nuclear reactor; any equipment or device designed or used for separating the isotopes of uranium or plutonium; any equipment or device used for the processing or utilizing of spent fuel; any structure, basin, excavation, premises or place prepared or used for the storage or disposal of waste nuclear material.',
        '"Nuclear reactor" means any apparatus designed or used to sustain nuclear fission in a self-supporting chain reaction or to contain a critical mass of fissionable material.',
      ]},
    ],
  },
];

// ============================================================================
// Coverage Definitions
// ============================================================================
const COVERAGES = [
  {
    id: 'cov_a_dwelling',
    name: 'Coverage A – Dwelling',
    coverageCode: 'HO-COV-A',
    coverageKind: 'coverage',
    description: 'Covers the dwelling on the residence premises, including attached structures. Provides open peril (special form) coverage for the building structure. Includes materials and supplies on or next to the premises used for construction, alteration or repair.',
    type: 'property',
    isOptional: false,
    scopeOfCoverage: 'Dwelling structure and attached structures on the residence premises',
    perilsCovered: ['Open Peril (Special Form)', 'Fire', 'Lightning', 'Windstorm', 'Hail', 'Explosion', 'Riot', 'Aircraft', 'Vehicles', 'Smoke', 'Vandalism', 'Theft', 'Falling Objects', 'Weight of Ice/Snow/Sleet', 'Water Damage (Accidental)', 'Electrical Damage', 'Volcanic Eruption'],
    exclusions: ['Ordinance or Law', 'Earth Movement', 'Flood', 'Power Failure', 'Neglect', 'War', 'Nuclear Hazard', 'Intentional Loss', 'Governmental Action', 'Wear and Tear', 'Mechanical Breakdown', 'Mold/Fungus', 'Settling/Cracking'],
    valuationMethod: 'RC',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 350000, displayValue: '$350,000', isDefault: true },
      { limitType: 'perOccurrence', amount: 250000, displayValue: '$250,000' },
      { limitType: 'perOccurrence', amount: 500000, displayValue: '$500,000' },
      { limitType: 'perOccurrence', amount: 750000, displayValue: '$750,000' },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000', isDefault: true },
      { deductibleType: 'flat', amount: 2500, displayValue: '$2,500' },
      { deductibleType: 'flat', amount: 5000, displayValue: '$5,000' },
      { deductibleType: 'percentage', percentage: 1, displayValue: '1% of Coverage A', description: 'Wind/Hail deductible in coastal states' },
      { deductibleType: 'percentage', percentage: 2, displayValue: '2% of Coverage A', description: 'Hurricane deductible' },
    ],
  },
  {
    id: 'cov_b_other_structures',
    name: 'Coverage B – Other Structures',
    coverageCode: 'HO-COV-B',
    coverageKind: 'coverage',
    description: 'Covers other structures on the residence premises set apart from the dwelling by clear space. Default limit is 10% of Coverage A. Examples: detached garage, shed, fence, pool.',
    type: 'property',
    isOptional: false,
    scopeOfCoverage: 'Detached structures on the residence premises',
    perilsCovered: ['Open Peril (Special Form)'],
    exclusions: ['Structures rented to others (unless private garage)', 'Structures used for business'],
    valuationMethod: 'RC',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 35000, displayValue: '$35,000 (10% of Cov A)', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000 (follows Section I deductible)', isDefault: true },
    ],
  },
  {
    id: 'cov_c_personal_property',
    name: 'Coverage C – Personal Property',
    coverageCode: 'HO-COV-C',
    coverageKind: 'coverage',
    description: 'Covers personal property owned or used by an insured, worldwide. Default limit is 50% of Coverage A. Named perils coverage applies. Special limits apply to certain categories of property.',
    type: 'property',
    isOptional: false,
    scopeOfCoverage: 'Personal property owned or used by an insured, worldwide',
    perilsCovered: ['Fire', 'Lightning', 'Windstorm', 'Hail', 'Explosion', 'Riot', 'Aircraft', 'Vehicles', 'Smoke', 'Vandalism', 'Theft', 'Falling Objects', 'Weight of Ice/Snow/Sleet', 'Water Damage (Accidental)', 'Electrical Damage', 'Volcanic Eruption'],
    exclusions: ['Animals/fish/birds', 'Motor vehicles', 'Aircraft/hovercraft', 'Property of roomers not related', 'Business property (limited)'],
    valuationMethod: 'ACV',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 175000, displayValue: '$175,000 (50% of Cov A)', isDefault: true },
      { limitType: 'sublimit', amount: 200, displayValue: '$200', description: 'Money, bank notes, coins' },
      { limitType: 'sublimit', amount: 1500, displayValue: '$1,500', description: 'Jewelry, watches, furs' },
      { limitType: 'sublimit', amount: 2500, displayValue: '$2,500', description: 'Firearms and related equipment' },
      { limitType: 'sublimit', amount: 2500, displayValue: '$2,500', description: 'Silverware, goldware, platinumware' },
      { limitType: 'sublimit', amount: 2500, displayValue: '$2,500', description: 'Business property on premises' },
      { limitType: 'sublimit', amount: 500, displayValue: '$500', description: 'Business property off premises' },
      { limitType: 'sublimit', amount: 1500, displayValue: '$1,500', description: 'Electronic apparatus in motor vehicles' },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000 (follows Section I deductible)', isDefault: true },
    ],
  },
  {
    id: 'cov_d_loss_of_use',
    name: 'Coverage D – Loss of Use',
    coverageCode: 'HO-COV-D',
    coverageKind: 'coverage',
    description: 'Covers additional living expenses and fair rental value when the residence becomes uninhabitable due to a covered loss. Default limit is 20% of Coverage A.',
    type: 'property',
    isOptional: false,
    scopeOfCoverage: 'Additional living expenses and fair rental value',
    perilsCovered: ['Follows Section I covered perils'],
    exclusions: ['Civil authority access restricted more than 2 weeks'],
    valuationMethod: 'ACV',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 70000, displayValue: '$70,000 (20% of Cov A)', isDefault: true },
    ],
    deductibles: [],
  },
  {
    id: 'cov_e_personal_liability',
    name: 'Coverage E – Personal Liability',
    coverageCode: 'HO-COV-E',
    coverageKind: 'coverage',
    description: 'Provides personal liability coverage for bodily injury and property damage claims. Includes defense costs. Per occurrence limit.',
    type: 'liability',
    isOptional: false,
    scopeOfCoverage: 'Bodily injury and property damage liability arising from premises or personal activities',
    perilsCovered: ['Occurrence-based liability'],
    exclusions: ['Expected/intended injury', 'Business activities', 'Professional services', 'Motor vehicle liability', 'Watercraft liability', 'Workers compensation', 'Communicable disease'],
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 100000, displayValue: '$100,000', isDefault: true },
      { limitType: 'perOccurrence', amount: 300000, displayValue: '$300,000' },
      { limitType: 'perOccurrence', amount: 500000, displayValue: '$500,000' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_f_medical_payments',
    name: 'Coverage F – Medical Payments to Others',
    coverageCode: 'HO-COV-F',
    coverageKind: 'coverage',
    description: 'Pays medical expenses for persons injured on the insured premises or by the activities of an insured, regardless of fault. Per person limit.',
    type: 'liability',
    isOptional: false,
    scopeOfCoverage: 'Medical expenses for third-party injuries on insured premises',
    perilsCovered: ['No-fault medical payments'],
    exclusions: ['Injuries to insureds', 'Workers compensation situations', 'Nuclear energy'],
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perPerson', amount: 1000, displayValue: '$1,000 per person', isDefault: true },
      { limitType: 'perPerson', amount: 5000, displayValue: '$5,000 per person' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_spp',
    name: 'Scheduled Personal Property',
    coverageCode: 'HO-SPP',
    coverageKind: 'endorsement',
    description: 'Provides open peril coverage for specifically scheduled high-value personal articles (jewelry, fine arts, furs, musical instruments, etc.) at agreed values. No deductible applies.',
    type: 'property',
    isOptional: true,
    scopeOfCoverage: 'Scheduled high-value personal articles',
    perilsCovered: ['Open Peril (All Risk)'],
    exclusions: ['Breakage of fragile articles', 'Wear and tear', 'Insects/vermin', 'Inherent vice', 'Mechanical breakdown'],
    valuationMethod: 'agreedValue',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 25000, displayValue: '$25,000 (varies by schedule)', isDefault: true },
    ],
    deductibles: [],
  },
  {
    id: 'cov_rc_personal_property',
    name: 'Personal Property Replacement Cost',
    coverageCode: 'HO-RC-PP',
    coverageKind: 'endorsement',
    description: 'Upgrades Coverage C (Personal Property) settlement from actual cash value to replacement cost. Insured must actually replace the property to receive replacement cost payment.',
    type: 'property',
    isOptional: true,
    valuationMethod: 'RC',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [],
    deductibles: [],
  },
  {
    id: 'cov_mold_exclusion',
    name: 'Mold, Fungus or Wet Rot Exclusion',
    coverageCode: 'HO-MOLD-EX',
    coverageKind: 'exclusion',
    description: 'Excludes coverage for mold, fungus or wet rot damage under Section I (Property) and Section II (Liability). Limited exception of $10,000 applies when mold results from a covered peril.',
    type: 'property',
    isOptional: false,
    limits: [
      { limitType: 'sublimit', amount: 10000, displayValue: '$10,000', description: 'Limited coverage when mold results from covered peril' },
    ],
    deductibles: [],
  },
  {
    id: 'cov_ordinance_law',
    name: 'Ordinance or Law Coverage',
    coverageCode: 'HO-ORD',
    coverageKind: 'endorsement',
    description: 'Covers the increased cost of construction due to enforcement of building codes or ordinances after a covered loss. Pays for demolition, increased cost of construction, and loss of undamaged portion of the building.',
    type: 'property',
    isOptional: true,
    scopeOfCoverage: 'Increased cost of construction due to building code enforcement',
    perilsCovered: ['Follows Section I covered perils'],
    valuationMethod: 'RC',
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 35000, displayValue: '10% of Coverage A', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000 (follows Section I deductible)', isDefault: true },
    ],
  },
  {
    id: 'cov_water_backup',
    name: 'Water Backup and Sump Discharge or Overflow',
    coverageCode: 'HO-WATER',
    coverageKind: 'endorsement',
    description: 'Provides coverage for water damage resulting from water that backs up through sewers or drains, or water that overflows or is discharged from a sump, sump pump or related equipment.',
    type: 'property',
    isOptional: true,
    scopeOfCoverage: 'Water backup through sewers/drains and sump pump overflow',
    perilsCovered: ['Sewer/drain backup', 'Sump pump overflow'],
    exclusions: ['Flood', 'Surface water', 'Tidal water'],
    coverageTrigger: 'occurrence',
    premiumBasis: 'rated',
    limits: [
      { limitType: 'perOccurrence', amount: 5000, displayValue: '$5,000', isDefault: true },
      { limitType: 'perOccurrence', amount: 10000, displayValue: '$10,000' },
      { limitType: 'perOccurrence', amount: 25000, displayValue: '$25,000' },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 1000, displayValue: '$1,000', isDefault: true },
    ],
  },
  {
    id: 'cov_identity_theft',
    name: 'Identity Theft Expense Coverage',
    coverageCode: 'HO-IDTHEFT',
    coverageKind: 'endorsement',
    description: 'Covers expenses incurred as a direct result of identity theft, including costs to restore credit history, lost wages, legal fees, and notary/certified mailing costs.',
    type: 'liability',
    isOptional: true,
    scopeOfCoverage: 'Expenses from identity theft restoration',
    perilsCovered: ['Identity theft'],
    coverageTrigger: 'occurrence',
    premiumBasis: 'flat',
    limits: [
      { limitType: 'aggregate', amount: 15000, displayValue: '$15,000 aggregate', isDefault: true },
    ],
    deductibles: [
      { deductibleType: 'flat', amount: 250, displayValue: '$250', isDefault: true },
    ],
  },
];

// ============================================================================
// Underwriting Rules
// ============================================================================
const RULES = [
  {
    id: 'rule_min_cov_a',
    name: 'Minimum Coverage A Limit',
    description: 'Coverage A dwelling limit must be at least 80% of the estimated replacement cost of the dwelling to qualify for replacement cost loss settlement.',
    type: 'eligibility',
  },
  {
    id: 'rule_prot_class',
    name: 'Protection Class Eligibility',
    description: 'Dwellings with a protection class of 9 or 10 require underwriter approval. Protection class 10 (unprotected) is declined in most states.',
    type: 'eligibility',
  },
  {
    id: 'rule_age_surcharge',
    name: 'Age of Home Surcharge',
    description: 'Dwellings over 40 years old receive a premium surcharge. Dwellings over 75 years old require a 4-point inspection report.',
    type: 'rating',
  },
  {
    id: 'rule_coastal_wind',
    name: 'Coastal Wind/Hail Deductible',
    description: 'Properties within coastal wind zones in FL, TX, SC, NC, and LA are subject to a mandatory percentage-based wind/hail deductible of 2% of Coverage A.',
    type: 'eligibility',
  },
  {
    id: 'rule_claims_history',
    name: 'Prior Claims History',
    description: 'Applicants with 3 or more claims in the prior 5 years are referred for underwriter review. Applicants with 2+ weather-related claims in 3 years may receive a surcharge.',
    type: 'eligibility',
  },
  {
    id: 'rule_credit_score',
    name: 'Insurance Credit Score',
    description: 'Insurance score is used as a rating factor where permitted by state law. Scores below 550 are referred for underwriter approval.',
    type: 'rating',
  },
  {
    id: 'rule_trampoline',
    name: 'Trampoline Exclusion',
    description: 'If a trampoline is present on the property, Coverage E liability is modified to exclude trampoline-related injuries unless a safety net enclosure is present.',
    type: 'underwriting',
  },
  {
    id: 'rule_dog_breed',
    name: 'Restricted Dog Breed',
    description: 'Properties with restricted dog breeds (Pit Bull, Rottweiler, Wolf hybrid, etc.) are subject to a liability exclusion for dog bite claims or require a minimum $300,000 Coverage E limit.',
    type: 'underwriting',
  },
];

// ============================================================================
// Data Dictionary Fields
// ============================================================================
const DATA_DICTIONARY = [
  { id: 'dd_cov_a_limit', fieldCode: 'cov_a_limit', label: 'Coverage A Dwelling Limit', type: 'number', category: 'coverage', description: 'The limit of insurance for Coverage A — Dwelling' },
  { id: 'dd_cov_b_limit', fieldCode: 'cov_b_limit', label: 'Coverage B Other Structures Limit', type: 'number', category: 'coverage', description: 'The limit of insurance for Coverage B — Other Structures (default 10% of Cov A)' },
  { id: 'dd_cov_c_limit', fieldCode: 'cov_c_limit', label: 'Coverage C Personal Property Limit', type: 'number', category: 'coverage', description: 'The limit of insurance for Coverage C — Personal Property (default 50% of Cov A)' },
  { id: 'dd_cov_d_limit', fieldCode: 'cov_d_limit', label: 'Coverage D Loss of Use Limit', type: 'number', category: 'coverage', description: 'The limit of insurance for Coverage D — Loss of Use (default 20% of Cov A)' },
  { id: 'dd_cov_e_limit', fieldCode: 'cov_e_limit', label: 'Coverage E Personal Liability Limit', type: 'number', category: 'coverage', description: 'Per occurrence limit for Coverage E — Personal Liability' },
  { id: 'dd_cov_f_limit', fieldCode: 'cov_f_limit', label: 'Coverage F Medical Payments Limit', type: 'number', category: 'coverage', description: 'Per person limit for Coverage F — Medical Payments to Others' },
  { id: 'dd_deductible', fieldCode: 'section_i_deductible', label: 'Section I Deductible', type: 'number', category: 'coverage', description: 'Section I all-peril deductible amount' },
  { id: 'dd_year_built', fieldCode: 'year_built', label: 'Year Built', type: 'number', category: 'risk', description: 'Year the dwelling was constructed' },
  { id: 'dd_construction', fieldCode: 'construction_type', label: 'Construction Type', type: 'text', category: 'risk', description: 'Primary construction material (Frame, Masonry, Superior, etc.)' },
  { id: 'dd_prot_class', fieldCode: 'protection_class', label: 'Protection Class', type: 'number', category: 'risk', description: 'ISO fire protection class (1–10)' },
  { id: 'dd_territory', fieldCode: 'territory', label: 'Rating Territory', type: 'text', category: 'risk', description: 'Rating territory code based on property location' },
  { id: 'dd_sqft', fieldCode: 'square_footage', label: 'Square Footage', type: 'number', category: 'risk', description: 'Total heated living area square footage' },
  { id: 'dd_roof_type', fieldCode: 'roof_type', label: 'Roof Type', type: 'text', category: 'risk', description: 'Roof covering material (Asphalt shingle, Tile, Metal, Slate, etc.)' },
  { id: 'dd_roof_age', fieldCode: 'roof_age', label: 'Roof Age', type: 'number', category: 'risk', description: 'Age of the roof in years' },
  { id: 'dd_num_stories', fieldCode: 'number_of_stories', label: 'Number of Stories', type: 'number', category: 'risk', description: 'Number of stories in the dwelling' },
  { id: 'dd_distance_coast', fieldCode: 'distance_to_coast', label: 'Distance to Coast (miles)', type: 'number', category: 'risk', description: 'Distance from property to nearest coastline in miles' },
  { id: 'dd_credit_score', fieldCode: 'insurance_credit_score', label: 'Insurance Credit Score', type: 'number', category: 'risk', description: 'Insurance credit score used for rating (where permitted by law)' },
  { id: 'dd_prior_claims', fieldCode: 'prior_claims_count', label: 'Prior Claims (5yr)', type: 'number', category: 'risk', description: 'Number of homeowners claims in the prior 5 years' },
  { id: 'dd_base_premium', fieldCode: 'base_premium', label: 'Base Premium', type: 'number', category: 'premium', description: 'Calculated base premium before credits and surcharges' },
  { id: 'dd_total_premium', fieldCode: 'total_annual_premium', label: 'Total Annual Premium', type: 'number', category: 'premium', description: 'Final total annual premium after all adjustments' },
];

// ============================================================================
// Rating Table Data
// ============================================================================
const TERRITORY_FACTORS = {
  'T01': { label: 'Metro Urban', factor: 1.00 },
  'T02': { label: 'Urban', factor: 0.95 },
  'T03': { label: 'Suburban', factor: 0.88 },
  'T04': { label: 'Exurban', factor: 0.82 },
  'T05': { label: 'Rural', factor: 0.78 },
  'T06': { label: 'Coastal Metro', factor: 1.25 },
  'T07': { label: 'Coastal Suburban', factor: 1.35 },
  'T08': { label: 'Coastal Rural', factor: 1.15 },
  'T09': { label: 'Wind Pool Zone', factor: 1.65 },
  'T10': { label: 'Hurricane Prone', factor: 1.85 },
};

const PROTECTION_CLASS_FACTORS = {
  '1': 0.80, '2': 0.85, '3': 0.88, '4': 0.92, '5': 1.00,
  '6': 1.05, '7': 1.12, '8': 1.20, '9': 1.45, '10': 1.80,
};

const CONSTRUCTION_FACTORS = {
  'Frame': 1.00,
  'Masonry': 0.90,
  'Masonry Veneer': 0.95,
  'Superior (Fire Resistive)': 0.82,
  'Log': 1.10,
  'Manufactured/Mobile': 1.35,
};

const AGE_OF_HOME_FACTORS = {
  '0-5': 0.90, '6-10': 0.95, '11-20': 1.00, '21-30': 1.05,
  '31-40': 1.10, '41-50': 1.18, '51-75': 1.25, '76+': 1.40,
};

// ============================================================================
// Seed Functions
// ============================================================================
async function seedOrg() {
  console.log('  → Organization...');
  const orgRef = db.doc(`orgs/${ORG_ID}`);
  await orgRef.set({
    id: ORG_ID,
    name: 'Acme Insurance Company',
    createdAt: ts(),
    createdBy: USER_ID,
    settings: { allowInvites: true, defaultRole: 'viewer' },
  });

  // Member
  await db.doc(`orgs/${ORG_ID}/members/${USER_ID}`).set({
    orgId: ORG_ID,
    userId: USER_ID,
    email: USER_EMAIL,
    displayName: USER_NAME,
    role: 'admin',
    status: 'active',
    createdAt: ts(),
    createdBy: USER_ID,
    joinedAt: ts(),
  });

  // User profile
  await db.doc(`users/${USER_ID}`).set({
    primaryOrgId: ORG_ID,
    displayName: USER_NAME,
    email: USER_EMAIL,
    createdAt: ts(),
  });
}

async function seedProduct() {
  console.log('  → Product...');
  const productRef = db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}`);
  await productRef.set({
    orgId: ORG_ID,
    productCode: 'HO-3',
    name: 'Homeowners 3 – Special Form',
    description: 'ISO HO-3 Special Form homeowners insurance providing open peril coverage on the dwelling (Coverage A & B) and named peril coverage on personal property (Coverage C). Includes personal liability (Coverage E) and medical payments to others (Coverage F).',
    category: 'Personal Lines',
    lineOfBusiness: 'Homeowners',
    status: 'active',
    states: ALL_STATES,
    version: 1,
    coverageCount: COVERAGES.length,
    formCount: FORMS.length,
    ruleCount: RULES.length,
    ...auditFields,
  });

  // Product version
  await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/versions/${PRODUCT_VERSION_ID}`).set({
    entityId: PRODUCT_ID,
    versionNumber: 1,
    status: 'published',
    effectiveStart: '2026-01-01',
    effectiveEnd: '2026-12-31',
    summary: 'HO-3 2026 Edition — Initial filing',
    notes: 'Base product filing for all states. Incorporates 2026 ISO circular updates.',
    publishedAt: ts(),
    publishedBy: USER_ID,
    ...auditFields,
  });
}

async function seedCoverages() {
  console.log('  → Coverages...');
  for (const cov of COVERAGES) {
    const covRef = db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}`);
    const { limits, deductibles, ...covData } = cov;
    await covRef.set({
      ...covData,
      productId: PRODUCT_ID,
      ...auditFields,
    });

    // Limits subcollection
    if (limits && limits.length > 0) {
      for (let i = 0; i < limits.length; i++) {
        const limId = `${cov.id}_lim_${i}`;
        await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}/limits/${limId}`).set({
          id: limId,
          coverageId: cov.id,
          productId: PRODUCT_ID,
          ...limits[i],
          displayOrder: i,
          ...auditFields,
        });
      }
    }

    // Deductibles subcollection
    if (deductibles && deductibles.length > 0) {
      for (let i = 0; i < deductibles.length; i++) {
        const dedId = `${cov.id}_ded_${i}`;
        await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/coverages/${cov.id}/deductibles/${dedId}`).set({
          id: dedId,
          coverageId: cov.id,
          productId: PRODUCT_ID,
          ...deductibles[i],
          displayOrder: i,
          ...auditFields,
        });
      }
    }
  }
}

async function seedForms() {
  console.log('  → Forms & PDFs...');
  const pdfDir = path.join(__dirname, '..', 'seed-pdfs');
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

  for (const form of FORMS) {
    // Generate PDF
    const pdfBytes = await generateFormPDF(form.formNumber, form.title, form.editionDate, form.sections);
    const pdfPath = path.join(pdfDir, `${form.formNumber.replace(/\s+/g, '_')}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);
    console.log(`    ✓ PDF: ${pdfPath}`);

    // Form document
    const formRef = db.doc(`orgs/${ORG_ID}/forms/${form.id}`);
    await formRef.set({
      orgId: ORG_ID,
      formNumber: form.formNumber,
      title: form.title,
      isoOrManuscript: form.origin,
      type: form.type,
      description: form.title,
      versionCount: 1,
      archived: false,
      latestPublishedVersionId: `${form.id}_v1`,
      ...auditFields,
    });

    // Form version
    const versionRef = db.doc(`orgs/${ORG_ID}/forms/${form.id}/versions/${form.id}_v1`);
    await versionRef.set({
      formId: form.id,
      versionNumber: 1,
      status: 'published',
      editionDate: form.editionDate,
      jurisdiction: form.jurisdictions,
      effectiveStart: '2026-01-01',
      effectiveEnd: null,
      storagePath: `seed-pdfs/${form.formNumber.replace(/\s+/g, '_')}.pdf`,
      extractedText: form.sections.map(s => `${s.heading}\n${s.paragraphs.join('\n')}`).join('\n\n'),
      indexingStatus: 'complete',
      summary: form.title,
      notes: `ISO ${form.editionDate} edition`,
      publishedAt: ts(),
      publishedBy: USER_ID,
      ...auditFields,
    });

    // Form use (link to product version)
    const useRef = db.doc(`orgs/${ORG_ID}/formUses/${form.id}_use`);
    await useRef.set({
      orgId: ORG_ID,
      formId: form.id,
      formVersionId: `${form.id}_v1`,
      productVersionId: PRODUCT_VERSION_ID,
      coverageVersionId: null,
      stateCode: null,
      useType: form.type === 'policy' ? 'base_form' : (form.type === 'endorsement' ? 'endorsement' : 'conditions'),
      formNumber: form.formNumber,
      formTitle: form.title,
      productName: 'Homeowners 3 – Special Form',
      coverageName: '',
      createdAt: ts(),
      createdBy: USER_ID,
    });
  }
}

async function seedClauses() {
  console.log('  → Clauses...');
  const clauses = [
    { id: 'clause_insuring_agreement', name: 'Insuring Agreement', type: 'insuring_agreement', text: 'We will provide the insurance described in this policy in return for the premium and compliance with all applicable provisions of this policy.' },
    { id: 'clause_duties_after_loss', name: 'Duties After Loss', type: 'condition', text: 'In case of a loss to covered property, you must: give prompt notice to us or our agent; protect the property from further damage; cooperate with us in the investigation of a claim; prepare an inventory of damaged personal property showing the quantity, description, actual cash value and amount of loss.' },
    { id: 'clause_appraisal', name: 'Appraisal', type: 'condition', text: 'If you and we fail to agree on the amount of loss, either may demand an appraisal of the loss. Each party will select a competent appraiser within 20 days after receiving a written request from the other.' },
    { id: 'clause_mortgage', name: 'Mortgage Clause', type: 'condition', text: 'If a mortgagee is named in this policy, any loss payable under Coverage A or B will be paid to the mortgagee and you, as interests appear.' },
    { id: 'clause_subrogation', name: 'Subrogation', type: 'condition', text: 'An insured may waive in writing before a loss all rights of recovery against any person. If not waived, we may require an assignment of rights of recovery for a loss to the extent that payment is made by us.' },
    { id: 'clause_earth_movement_excl', name: 'Earth Movement Exclusion', type: 'exclusion', text: 'We do not insure for loss caused directly or indirectly by earth movement including earthquake, landslide, mudslide, mudflow, sinkhole, or subsidence.' },
    { id: 'clause_flood_excl', name: 'Water Damage Exclusion', type: 'exclusion', text: 'We do not insure for loss caused by flood, surface water, waves, tidal water, tsunami, overflow of body of water, spray from any of these whether or not driven by wind.' },
    { id: 'clause_mold_excl', name: 'Mold/Fungus Exclusion', type: 'exclusion', text: 'We do not cover loss caused by, contributed to, or consisting of mold, fungus or wet rot, whether or not hidden from view. Limited exception: $10,000 maximum when mold results from a covered peril.' },
    { id: 'clause_loss_settlement', name: 'Loss Settlement', type: 'condition', text: 'Buildings under Coverage A or B are settled at replacement cost without deduction for depreciation. Personal property under Coverage C is settled at actual cash value unless the Personal Property Replacement Cost endorsement applies.' },
    { id: 'clause_cancellation', name: 'Cancellation', type: 'condition', text: 'You may cancel this policy at any time by returning it to us. We may cancel by mailing written notice at least 10 days before the effective date for nonpayment of premium, or 30 days for any other reason.' },
  ];

  for (const c of clauses) {
    await db.doc(`orgs/${ORG_ID}/clauses/${c.id}`).set({
      orgId: ORG_ID,
      canonicalName: c.name,
      type: c.type,
      tags: [c.type, 'homeowners', 'ho3'],
      description: c.text.substring(0, 200),
      versionCount: 1,
      archived: false,
      latestPublishedVersionId: `${c.id}_v1`,
      ...auditFields,
    });

    await db.doc(`orgs/${ORG_ID}/clauses/${c.id}/versions/${c.id}_v1`).set({
      clauseId: c.id,
      versionNumber: 1,
      text: c.text,
      anchors: [],
      sourceFormVersionId: 'form_ho3_v1',
      sourceFormNumber: 'HO 00 03',
      status: 'published',
      effectiveStart: '2026-01-01',
      effectiveEnd: null,
      summary: c.name,
      publishedAt: ts(),
      publishedBy: USER_ID,
      ...auditFields,
    });
  }
}

async function seedRules() {
  console.log('  → Underwriting Rules...');
  for (const rule of RULES) {
    await db.doc(`orgs/${ORG_ID}/rules/${rule.id}`).set({
      orgId: ORG_ID,
      name: rule.name,
      description: rule.description,
      type: rule.type,
      versionCount: 1,
      archived: false,
      latestPublishedVersionId: `${rule.id}_v1`,
      ...auditFields,
    });

    await db.doc(`orgs/${ORG_ID}/rules/${rule.id}/versions/${rule.id}_v1`).set({
      ruleId: rule.id,
      versionNumber: 1,
      status: 'published',
      conditions: { operator: 'AND', conditions: [] },
      outcome: { action: 'flag', message: rule.description },
      scope: { productIds: [PRODUCT_ID] },
      effectiveStart: '2026-01-01',
      effectiveEnd: null,
      summary: rule.name,
      publishedAt: ts(),
      publishedBy: USER_ID,
      ...auditFields,
    });
  }
}

async function seedRateProgram() {
  console.log('  → Rate Program & Tables...');

  // Rate program
  await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}`).set({
    orgId: ORG_ID,
    name: 'HO-3 Base Rating Program',
    description: 'Standard homeowners base premium calculation with territory, protection class, construction, and age-of-home factors.',
    status: 'active',
    ...auditFields,
  });

  // Version
  await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}/versions/${RATE_VERSION_ID}`).set({
    rateProgramId: RATE_PROGRAM_ID,
    versionNumber: 1,
    status: 'published',
    publishedAt: ts(),
    publishedBy: USER_ID,
    effectiveStart: ts(),
    effectiveEnd: null,
    ...auditFields,
  });

  // Rating steps
  const steps = [
    { id: 'step_base', order: 1, stepType: 'set', label: 'Base Rate per $1,000', field: 'base_rate_per_thousand', value: 3.50, description: 'Base rate of $3.50 per $1,000 of Coverage A' },
    { id: 'step_cov_a_prem', order: 2, stepType: 'multiply', label: 'Coverage A Premium', field: 'cov_a_base_premium', leftField: 'base_rate_per_thousand', rightField: 'cov_a_limit_thousands', description: 'Base rate × (Coverage A limit / 1000)' },
    { id: 'step_territory', order: 3, stepType: 'table_lookup', label: 'Territory Factor', field: 'territory_factor', tableName: 'Territory Factors', lookupField: 'territory', description: 'Look up territory factor from territory table' },
    { id: 'step_prot_class', order: 4, stepType: 'table_lookup', label: 'Protection Class Factor', field: 'prot_class_factor', tableName: 'Protection Class Factors', lookupField: 'protection_class', description: 'Look up protection class factor' },
    { id: 'step_construction', order: 5, stepType: 'table_lookup', label: 'Construction Factor', field: 'construction_factor', tableName: 'Construction Factors', lookupField: 'construction_type', description: 'Look up construction type factor' },
    { id: 'step_age', order: 6, stepType: 'table_lookup', label: 'Age of Home Factor', field: 'age_factor', tableName: 'Age of Home Factors', lookupField: 'age_band', description: 'Look up age of home factor' },
    { id: 'step_apply_terr', order: 7, stepType: 'multiply', label: 'Apply Territory', field: 'after_territory', leftField: 'cov_a_base_premium', rightField: 'territory_factor', description: 'Apply territory factor to base premium' },
    { id: 'step_apply_prot', order: 8, stepType: 'multiply', label: 'Apply Protection Class', field: 'after_prot_class', leftField: 'after_territory', rightField: 'prot_class_factor', description: 'Apply protection class factor' },
    { id: 'step_apply_const', order: 9, stepType: 'multiply', label: 'Apply Construction', field: 'after_construction', leftField: 'after_prot_class', rightField: 'construction_factor', description: 'Apply construction factor' },
    { id: 'step_apply_age', order: 10, stepType: 'multiply', label: 'Apply Age Factor', field: 'after_age', leftField: 'after_construction', rightField: 'age_factor', description: 'Apply age of home factor' },
    { id: 'step_liability_charge', order: 11, stepType: 'set', label: 'Liability Charge', field: 'liability_charge', value: 85.00, description: 'Fixed charge for Coverage E ($100K) and Coverage F ($1K)' },
    { id: 'step_total', order: 12, stepType: 'add', label: 'Total Annual Premium', field: 'total_annual_premium', leftField: 'after_age', rightField: 'liability_charge', description: 'Sum of property premium and liability charge' },
  ];

  for (const step of steps) {
    await db.doc(`orgs/${ORG_ID}/ratePrograms/${RATE_PROGRAM_ID}/versions/${RATE_VERSION_ID}/steps/${step.id}`).set({
      rateProgramVersionId: RATE_VERSION_ID,
      ...step,
      createdAt: ts(),
    });
  }

  // Rating Tables
  const tables = [
    {
      id: 'table_territory',
      name: 'Territory Factors',
      description: 'Rating factors by territory code for HO-3 product',
      dimensions: [{ name: 'Territory Code', type: 'discrete', values: Object.keys(TERRITORY_FACTORS) }],
      cells: Object.fromEntries(Object.entries(TERRITORY_FACTORS).map(([k, v]) => [k, { value: v.factor, label: v.label }])),
    },
    {
      id: 'table_protection',
      name: 'Protection Class Factors',
      description: 'ISO fire protection class rating factors',
      dimensions: [{ name: 'Protection Class', type: 'discrete', values: Object.keys(PROTECTION_CLASS_FACTORS) }],
      cells: Object.fromEntries(Object.entries(PROTECTION_CLASS_FACTORS).map(([k, v]) => [k, { value: v }])),
    },
    {
      id: 'table_construction',
      name: 'Construction Type Factors',
      description: 'Rating factors by dwelling construction type',
      dimensions: [{ name: 'Construction Type', type: 'discrete', values: Object.keys(CONSTRUCTION_FACTORS) }],
      cells: Object.fromEntries(Object.entries(CONSTRUCTION_FACTORS).map(([k, v]) => [k, { value: v }])),
    },
    {
      id: 'table_age',
      name: 'Age of Home Factors',
      description: 'Rating factors by age band of dwelling',
      dimensions: [{ name: 'Age Band', type: 'discrete', values: Object.keys(AGE_OF_HOME_FACTORS) }],
      cells: Object.fromEntries(Object.entries(AGE_OF_HOME_FACTORS).map(([k, v]) => [k, { value: v }])),
    },
  ];

  for (const table of tables) {
    await db.doc(`orgs/${ORG_ID}/tables/${table.id}`).set({
      orgId: ORG_ID,
      name: table.name,
      description: table.description,
      ...auditFields,
    });

    await db.doc(`orgs/${ORG_ID}/tables/${table.id}/versions/${table.id}_v1`).set({
      tableId: table.id,
      versionNumber: 1,
      status: 'published',
      dimensions: table.dimensions,
      cellStorage: { cells: table.cells, storageType: 'sparse' },
      publishedAt: ts(),
      publishedBy: USER_ID,
      effectiveStart: ts(),
      effectiveEnd: null,
      ...auditFields,
    });
  }
}

async function seedDataDictionary() {
  console.log('  → Data Dictionary...');
  for (const field of DATA_DICTIONARY) {
    await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/dataDictionary/${field.id}`).set({
      fieldCode: field.fieldCode,
      label: field.label,
      type: field.type,
      category: field.category,
      description: field.description,
      status: 'published',
      ...auditFields,
    });
  }
}

async function seedStatePrograms() {
  console.log('  → State Programs...');
  // Filed/approved in most states, pending in a few, not offered in a couple
  const notOffered = ['AK', 'HI']; // Not offered (specialist markets)
  const pendingFiling = ['DC', 'MA', 'NJ']; // Pending filing
  const filedPending = ['CA', 'NY', 'FL', 'TX', 'LA']; // Filed, pending approval

  for (const stateCode of ALL_STATES) {
    let status, filingDate, approvalDate;

    if (notOffered.includes(stateCode)) {
      status = 'not_offered';
    } else if (pendingFiling.includes(stateCode)) {
      status = 'draft';
    } else if (filedPending.includes(stateCode)) {
      status = 'filed';
      filingDate = ts();
    } else {
      status = 'active';
      filingDate = ts();
      approvalDate = ts();
    }

    const doc = {
      stateCode,
      stateName: STATE_NAMES[stateCode] || stateCode,
      status,
      requiredArtifacts: {
        formVersionIds: FORMS.map(f => `${f.id}_v1`),
        ruleVersionIds: RULES.map(r => `${r.id}_v1`),
        rateProgramVersionIds: [RATE_VERSION_ID],
      },
      validationErrors: [],
      createdAt: ts(),
      createdBy: USER_ID,
      updatedAt: ts(),
      updatedBy: USER_ID,
    };
    if (filingDate) doc.filingDate = filingDate;
    if (approvalDate) doc.approvalDate = approvalDate;
    if (status === 'active') doc.activationDate = ts();

    await db.doc(`orgs/${ORG_ID}/products/${PRODUCT_ID}/versions/${PRODUCT_VERSION_ID}/statePrograms/${stateCode}`).set(doc);
  }
}

async function seedChangeSet() {
  console.log('  → Change Set...');
  const csId = 'cs_2026_annual_update';
  await db.doc(`orgs/${ORG_ID}/changeSets/${csId}`).set({
    orgId: ORG_ID,
    title: '2026 Annual Rate & Form Update',
    description: 'Annual filing package incorporating ISO circular updates, rate adjustments, and new endorsement forms for the 2026 policy year.',
    status: 'draft',
    ownerUserId: USER_ID,
    ownerDisplayName: USER_NAME,
    itemCount: 3,
    ...auditFields,
  });

  const items = [
    { id: 'csi_rate_update', action: 'update', entityType: 'rateProgram', entityId: RATE_PROGRAM_ID, entityLabel: 'HO-3 Base Rating Program', summary: 'Territory factor adjustments for coastal zones' },
    { id: 'csi_new_endorsement', action: 'create', entityType: 'form', entityId: 'form_ho1733', entityLabel: 'HO 17 33 – Mold Exclusion', summary: 'New mandatory mold exclusion endorsement' },
    { id: 'csi_rule_update', action: 'update', entityType: 'rule', entityId: 'rule_coastal_wind', entityLabel: 'Coastal Wind/Hail Deductible', summary: 'Extended wind deductible zones for NC and SC' },
  ];

  for (const item of items) {
    await db.doc(`orgs/${ORG_ID}/changeSets/${csId}/items/${item.id}`).set({
      ...item,
      createdAt: ts(),
      createdBy: USER_ID,
    });
  }
}

async function seedTasks() {
  console.log('  → Tasks...');
  const tasks = [
    { id: 'task_rate_review', title: 'Review 2026 territory factor updates', status: 'in_progress', priority: 'high', phase: 'review', description: 'Review and approve the coastal territory factor increases before filing with state DOIs.' },
    { id: 'task_form_filing', title: 'File HO-3 2026 edition with CA DOI', status: 'open', priority: 'high', phase: 'filing', description: 'Submit the 2026 HO-3 filing package to the California Department of Insurance.' },
    { id: 'task_mold_endorsement', title: 'Distribute HO 17 33 mold exclusion to all states', status: 'open', priority: 'medium', phase: 'implementation', description: 'Ensure the new HO 17 33 mold exclusion endorsement is included in all state filings.' },
    { id: 'task_qa_scenarios', title: 'Build QA scenarios for new rating factors', status: 'open', priority: 'medium', phase: 'testing', description: 'Create regression test scenarios covering the updated territory and protection class factors.' },
    { id: 'task_agent_bulletin', title: 'Draft agent bulletin for 2026 changes', status: 'open', priority: 'low', phase: 'communication', description: 'Prepare communication to agents summarizing all product changes for the 2026 policy year.' },
  ];

  for (const task of tasks) {
    await db.doc(`orgs/${ORG_ID}/tasks/${task.id}`).set({
      orgId: ORG_ID,
      ...task,
      assigneeUserId: USER_ID,
      assigneeDisplayName: USER_NAME,
      links: [{ type: 'product', entityId: PRODUCT_ID, label: 'HO-3 Homeowners' }],
      ...auditFields,
    });
  }
}

async function seedAnalytics() {
  console.log('  → Analytics...');
  await db.doc(`orgs/${ORG_ID}/analytics/portfolio_snapshot`).set({
    orgId: ORG_ID,
    snapshotDate: isoNow(),
    totalProducts: 1,
    totalCoverages: COVERAGES.length,
    totalForms: FORMS.length,
    totalRules: RULES.length,
    totalStates: ALL_STATES.length - 2, // minus not_offered
    readinessGrade: 'B+',
    productReadiness: [{
      productId: PRODUCT_ID,
      productName: 'Homeowners 3 – Special Form',
      grade: 'B+',
      coverageReadiness: 0.92,
      formReadiness: 1.0,
      ruleReadiness: 0.88,
      rateReadiness: 1.0,
      stateReadiness: 0.85,
    }],
    ...auditFields,
  });
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Seeding: Personal Lines Homeowners (HO-3) Product Data    ║');
  console.log('║  Target:  insurance-product-hub                            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    await seedOrg();
    await seedProduct();
    await seedCoverages();
    await seedForms();
    await seedClauses();
    await seedRules();
    await seedRateProgram();
    await seedDataDictionary();
    await seedStatePrograms();
    await seedChangeSet();
    await seedTasks();
    await seedAnalytics();

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ Seed complete!                                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Organization:  Acme Insurance Company (${ORG_ID})  ║`);
    console.log(`║  Product:       HO-3 Special Form                          ║`);
    console.log(`║  Coverages:     ${String(COVERAGES.length).padEnd(2)} (A–F + endorsements)                   ║`);
    console.log(`║  Forms:         ${String(FORMS.length).padEnd(2)} (PDFs in seed-pdfs/)                    ║`);
    console.log(`║  Clauses:       10                                          ║`);
    console.log(`║  Rules:         ${String(RULES.length).padEnd(2)}                                          ║`);
    console.log(`║  Rate Tables:   4                                           ║`);
    console.log(`║  Dict Fields:   ${String(DATA_DICTIONARY.length).padEnd(2)}                                         ║`);
    console.log(`║  State Programs: ${String(ALL_STATES.length).padEnd(2)} (50 states + DC)                    ║`);
    console.log(`║  Tasks:         5                                           ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('To log in, sign in with any Firebase Auth user, then run:');
    console.log(`  In browser console: update user profile primaryOrgId to "${ORG_ID}"`);
    console.log('');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
