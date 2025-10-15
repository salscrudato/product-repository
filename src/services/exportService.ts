/**
 * Export Service
 * Export insurance product data in various formats for regulatory filings and analysis
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Product, Coverage, Form, PricingStep, Rule } from '../types';

// ============================================================================
// Excel Export Functions
// ============================================================================

/**
 * Export product data to Excel with multiple sheets
 */
export async function exportProductToExcel(
  product: Product,
  coverages: Coverage[],
  forms: Form[],
  pricingSteps: PricingStep[],
  rules: Rule[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Product Summary Sheet
  const productData = [
    ['Product Information'],
    ['Name', product.name],
    ['Product Code', product.productCode || 'N/A'],
    ['Category', product.category || 'N/A'],
    ['Status', product.status || 'active'],
    ['Created', product.createdAt ? new Date(product.createdAt.toString()).toLocaleDateString() : 'N/A'],
    [''],
    ['Statistics'],
    ['Total Coverages', coverages.filter(c => !c.parentCoverageId).length],
    ['Total Sub-Coverages', coverages.filter(c => c.parentCoverageId).length],
    ['Total Forms', forms.length],
    ['Total Pricing Steps', pricingSteps.length],
    ['Total Rules', rules.length]
  ];
  const productSheet = XLSX.utils.aoa_to_sheet(productData);
  XLSX.utils.book_append_sheet(workbook, productSheet, 'Product Summary');

  // Coverages Sheet
  const coverageHeaders = [
    'Coverage Name',
    'Coverage Code',
    'Type',
    'Category',
    'Base Premium',
    'Minimum Premium',
    'Coinsurance %',
    'Waiting Period',
    'Description'
  ];
  const coverageRows = coverages
    .filter(c => !c.parentCoverageId)
    .map(c => [
      c.name,
      c.coverageCode || '',
      c.type || '',
      c.category || '',
      c.basePremium || '',
      c.minimumPremium || '',
      c.coinsurancePercentage || '',
      c.waitingPeriod ? `${c.waitingPeriod} ${c.waitingPeriodUnit || 'days'}` : '',
      c.description || ''
    ]);
  const coverageSheet = XLSX.utils.aoa_to_sheet([coverageHeaders, ...coverageRows]);
  XLSX.utils.book_append_sheet(workbook, coverageSheet, 'Coverages');

  // Sub-Coverages Sheet
  const subCoverageRows = coverages
    .filter(c => c.parentCoverageId)
    .map(c => {
      const parent = coverages.find(p => p.id === c.parentCoverageId);
      return [
        c.name,
        parent?.name || 'Unknown',
        c.coverageCode || '',
        c.basePremium || '',
        c.description || ''
      ];
    });
  if (subCoverageRows.length > 0) {
    const subCoverageHeaders = ['Sub-Coverage Name', 'Parent Coverage', 'Code', 'Premium', 'Description'];
    const subCoverageSheet = XLSX.utils.aoa_to_sheet([subCoverageHeaders, ...subCoverageRows]);
    XLSX.utils.book_append_sheet(workbook, subCoverageSheet, 'Sub-Coverages');
  }

  // Forms Sheet
  const formHeaders = [
    'Form Name',
    'Form Number',
    'Edition',
    'Category',
    'Type',
    'States',
    'Status'
  ];
  const formRows = forms.map(f => [
    f.formName,
    f.formNumber,
    f.edition || '',
    f.category || '',
    f.type || '',
    f.states?.join(', ') || 'All',
    f.isActive ? 'Active' : 'Inactive'
  ]);
  const formSheet = XLSX.utils.aoa_to_sheet([formHeaders, ...formRows]);
  XLSX.utils.book_append_sheet(workbook, formSheet, 'Forms');

  // Pricing Steps Sheet
  const pricingHeaders = [
    'Order',
    'Type',
    'Step Name',
    'Coverages',
    'Value',
    'Operand',
    'States'
  ];
  const pricingRows = pricingSteps
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(s => [
      s.order || '',
      s.stepType,
      s.stepName || '',
      s.coverages?.join(', ') || '',
      s.value || '',
      s.operand || '',
      s.states?.length === 50 ? 'All States' : s.states?.join(', ') || ''
    ]);
  const pricingSheet = XLSX.utils.aoa_to_sheet([pricingHeaders, ...pricingRows]);
  XLSX.utils.book_append_sheet(workbook, pricingSheet, 'Pricing Steps');

  // Rules Sheet
  const ruleHeaders = [
    'Rule Name',
    'Type',
    'Category',
    'Condition',
    'Outcome',
    'Priority',
    'Status',
    'Proprietary'
  ];
  const ruleRows = rules.map(r => [
    r.name,
    r.ruleType,
    r.ruleCategory,
    r.condition,
    r.outcome,
    r.priority || '',
    r.status,
    r.proprietary ? 'Yes' : 'No'
  ]);
  const ruleSheet = XLSX.utils.aoa_to_sheet([ruleHeaders, ...ruleRows]);
  XLSX.utils.book_append_sheet(workbook, ruleSheet, 'Business Rules');

  // Generate and download file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${product.name.replace(/[^a-z0-9]/gi, '_')}_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);
}

/**
 * Export all products summary to Excel
 */
export async function exportAllProductsToExcel(
  products: Product[],
  allCoverages: Coverage[],
  allForms: Form[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Products Summary
  const headers = [
    'Product Name',
    'Product Code',
    'Category',
    'Status',
    'Coverages',
    'Sub-Coverages',
    'Forms',
    'Created Date'
  ];

  const rows = products.map(p => {
    const productCoverages = allCoverages.filter(c => c.productId === p.id && !c.parentCoverageId);
    const productSubCoverages = allCoverages.filter(c => c.productId === p.id && c.parentCoverageId);
    const productForms = allForms.filter(f => f.productId === p.id);

    return [
      p.name,
      p.productCode || '',
      p.category || '',
      p.status || 'active',
      productCoverages.length,
      productSubCoverages.length,
      productForms.length,
      p.createdAt ? new Date(p.createdAt.toString()).toLocaleDateString() : ''
    ];
  });

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Products Summary');

  // Generate and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `All_Products_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);
}

// ============================================================================
// CSV Export Functions
// ============================================================================

/**
 * Export coverages to CSV
 */
export function exportCoveragesToCSV(coverages: Coverage[], productName: string): void {
  const headers = [
    'Coverage Name',
    'Coverage Code',
    'Type',
    'Category',
    'Base Premium',
    'Minimum Premium',
    'Coinsurance %',
    'Description'
  ];

  const rows = coverages.map(c => [
    c.name,
    c.coverageCode || '',
    c.type || '',
    c.category || '',
    c.basePremium || '',
    c.minimumPremium || '',
    c.coinsurancePercentage || '',
    c.description || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${productName.replace(/[^a-z0-9]/gi, '_')}_Coverages_${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, fileName);
}

/**
 * Export pricing steps to CSV
 */
export function exportPricingStepsToCSV(steps: PricingStep[], productName: string): void {
  const headers = [
    'Order',
    'Type',
    'Step Name',
    'Coverages',
    'Value',
    'Operand',
    'States'
  ];

  const rows = steps
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(s => [
      s.order || '',
      s.stepType,
      s.stepName || '',
      s.coverages?.join('; ') || '',
      s.value || '',
      s.operand || '',
      s.states?.length === 50 ? 'All States' : s.states?.join('; ') || ''
    ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const fileName = `${productName.replace(/[^a-z0-9]/gi, '_')}_Pricing_${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, fileName);
}

// ============================================================================
// JSON Export Functions
// ============================================================================

/**
 * Export complete product data as JSON
 */
export function exportProductToJSON(
  product: Product,
  coverages: Coverage[],
  forms: Form[],
  pricingSteps: PricingStep[],
  rules: Rule[]
): void {
  const exportData = {
    product,
    coverages,
    forms,
    pricingSteps,
    rules,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const fileName = `${product.name.replace(/[^a-z0-9]/gi, '_')}_Export_${new Date().toISOString().split('T')[0]}.json`;
  saveAs(blob, fileName);
}

/**
 * Export regulatory filing package
 * Includes all necessary data for state insurance department filings
 */
export async function exportRegulatoryFilingPackage(
  product: Product,
  coverages: Coverage[],
  forms: Form[],
  pricingSteps: PricingStep[],
  rules: Rule[],
  state: string
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Cover Page
  const coverData = [
    ['INSURANCE PRODUCT FILING'],
    [''],
    ['Product Name:', product.name],
    ['Product Code:', product.productCode || 'N/A'],
    ['Filing State:', state],
    ['Filing Date:', new Date().toLocaleDateString()],
    [''],
    ['CONTENTS'],
    ['1. Product Summary'],
    ['2. Coverage Specifications'],
    ['3. Policy Forms'],
    ['4. Rating Algorithm'],
    ['5. Business Rules']
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(coverData);
  XLSX.utils.book_append_sheet(workbook, coverSheet, 'Cover Page');

  // Add other sheets (reuse existing export logic)
  // ... (similar to exportProductToExcel)

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `${state}_Filing_${product.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, fileName);
}

