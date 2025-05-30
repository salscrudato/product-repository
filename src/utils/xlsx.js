import * as XLSX from 'xlsx';

export const STATE_COLS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

/* ---------- Enhanced XLSX Export Functions ---------- */

// Helper function to apply professional styling to worksheets
const applyWorksheetStyling = (ws, headerRow = 1) => {
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Set column widths for better readability
  const colWidths = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
    const cell = ws[cellAddress];
    if (cell && cell.v) {
      const headerLength = String(cell.v).length;
      colWidths.push({ wch: Math.max(headerLength + 2, 12) });
    } else {
      colWidths.push({ wch: 12 });
    }
  }
  ws['!cols'] = colWidths;

  // Apply header styling
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "6366F1" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
  }

  // Apply alternating row colors for data rows
  for (let row = headerRow; row <= range.e.r; row++) {
    const isEvenRow = (row - headerRow) % 2 === 0;
    const fillColor = isEvenRow ? "F8FAFC" : "FFFFFF";

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { horizontal: "left", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
    }
  }

  return ws;
};

// Enhanced coverage sheet with professional styling
export const makeCoverageSheet = (coverages = []) => {
  // Add metadata header
  const currentDate = new Date().toLocaleDateString();
  const metadata = [
    ['Coverage Export Report'],
    [`Generated on: ${currentDate}`],
    [`Total Coverages: ${coverages.length}`],
    [''], // Empty row for spacing
    ['Coverage Name', 'Coverage Code', 'Category', 'Parent Coverage Code', 'Sub-Coverages', 'States Count', ...STATE_COLS]
  ];

  const rows = coverages.map(c => {
    const row = {
      'Coverage Name': c.name || '',
      'Coverage Code': c.coverageCode || '',
      'Category': c.category || 'Base Coverage',
      'Parent Coverage Code': c.parentCoverageId || '',
      'Sub-Coverages': c.subCount || 0,
      'States Count': c.states?.length || 0
    };

    // Add state columns with Yes/No instead of 1/0
    STATE_COLS.forEach(s => {
      row[s] = c.states?.includes(s) ? 'Yes' : 'No';
    });

    return row;
  });

  // Create worksheet with metadata
  const ws = XLSX.utils.aoa_to_sheet(metadata);

  // Add data rows
  XLSX.utils.sheet_add_json(ws, rows, {
    origin: 'A6',
    skipHeader: false
  });

  // Apply professional styling
  applyWorksheetStyling(ws, 5); // Header is on row 5 (0-indexed)

  // Style the title and metadata
  ws['A1'].s = {
    font: { bold: true, size: 16, color: { rgb: "1E293B" } },
    alignment: { horizontal: "center" }
  };

  ws['A2'].s = {
    font: { italic: true, color: { rgb: "64748B" } }
  };

  ws['A3'].s = {
    font: { bold: true, color: { rgb: "059669" } }
  };

  return ws;
};

// Enhanced forms sheet with professional styling
export const makeFormSheet = (forms = []) => {
  // Add metadata header
  const currentDate = new Date().toLocaleDateString();
  const metadata = [
    ['Forms Export Report'],
    [`Generated on: ${currentDate}`],
    [`Total Forms: ${forms.length}`],
    [''], // Empty row for spacing
    ['Form Name', 'Form Number', 'Edition Date', 'Type', 'Category', 'Products', 'Coverages', 'Download URL']
  ];

  const rows = forms.map(f => ({
    'Form Name': f.formName || 'Unnamed Form',
    'Form Number': f.formNumber || '',
    'Edition Date': f.effectiveDate || '',
    'Type': f.type || 'ISO',
    'Category': f.category || 'Base Coverage Form',
    'Products': (f.productIds || []).length,
    'Coverages': (f.coverageIds || []).length,
    'Download URL': f.downloadUrl || 'Not Available'
  }));

  // Create worksheet with metadata
  const ws = XLSX.utils.aoa_to_sheet(metadata);

  // Add data rows
  XLSX.utils.sheet_add_json(ws, rows, {
    origin: 'A6',
    skipHeader: false
  });

  // Apply professional styling
  applyWorksheetStyling(ws, 5); // Header is on row 5 (0-indexed)

  // Style the title and metadata
  ws['A1'].s = {
    font: { bold: true, size: 16, color: { rgb: "1E293B" } },
    alignment: { horizontal: "center" }
  };

  ws['A2'].s = {
    font: { italic: true, color: { rgb: "64748B" } }
  };

  ws['A3'].s = {
    font: { bold: true, color: { rgb: "059669" } }
  };

  return ws;
};

/* ---------- import ---------- */
export const sheetToCoverageObjects = ws => {
  const json = XLSX.utils.sheet_to_json(ws, { defval:'' });
  return json.map(r => ({
    name: r['Coverage Name'].trim(),
    coverageCode: r['Coverage Code'].trim(),
    category: r['Category'].trim() || 'Base Coverage',
    parentCoverageCode: r['Parent Coverage Code'].trim() || null,
    states: STATE_COLS.filter(s => String(r[s]).trim() === '1')
  }));
};

