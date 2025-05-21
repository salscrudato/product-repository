import * as XLSX from 'xlsx';
export const STATE_COLS = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

/* ---------- export ---------- */
export const makeCoverageSheet = (coverages=[]) => {
  const rows = coverages.map(c => {
    const row = {
      'Coverage Name': c.name,
      'Coverage Code': c.coverageCode,
      Category: c.category || '',
      'Parent Coverage Code': c.parentCoverageId || ''
    };
    STATE_COLS.forEach(s => (row[s] = c.states?.includes(s) ? 1 : 0));
    return row;
  });
  return XLSX.utils.json_to_sheet(rows, { header: [
    'Coverage Name','Coverage Code','Category','Parent Coverage Code',...STATE_COLS
  ]});
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

