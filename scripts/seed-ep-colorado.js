#!/usr/bin/env node
/**
 * Seed: Drivers Edge Insurance Company — Enthusiast+ Automobile Program (Colorado)
 *
 * Replicates the client's filed product into the existing "Auto" product,
 * following the Product Component Model (PCM):
 *
 *   Product  =  Auto  (productId preserved)
 *    ├─ LOB  =  Personal Auto
 *    ├─ Coverages (BI, PD, MP, UM/UIM, OTC, COLL)
 *    │   └─ Sub-Coverages / Endorsements (UM PD, Glass, Cherished Salvage,
 *    │       Waiver, Special Build, Rental, Gap, etc.) wired by parentCoverageId
 *    ├─ Rates — 24-step vehicle algorithm (Part A) + 9-step policy algorithm
 *    │         (Part C, UM/UIM) + endorsement premiums (Part D), each step
 *    │         carries the real lookup table inline as `tableData`.
 *    └─ Rules — filed manual rules (eligibility, discounts, endorsements,
 *               driving record/loss history, UM/UIM & MedPay rejection, etc.)
 *
 * Scope of clear: DELETE every coverage on this product (coverage entities
 * support DELETE). Pricing steps / rules / forms are append-only on this
 * API (DELETE returns 404), so new ones will coexist with any existing.
 *
 * Data source: EP CO Prem Calculation 04 25 (2nd Ed.), EP CO Rates 04 25
 * (3rd Ed.), EP CO Rules 01 25 (2nd Ed.), EP Symbols 04 25.
 *
 * Usage:
 *   node scripts/seed-ep-colorado.js
 *   DRY_RUN=1 node scripts/seed-ep-colorado.js
 */

'use strict';

const BASE_URL   = process.env.BASE_URL   || 'https://app-nvi-demo-prohub-insurance-pl.azurewebsites.net';
const PRODUCT_ID = process.env.PRODUCT_ID || 'product-10b39165-cb9e-44c6-ae38-1a3436038fb6';
const DRY_RUN    = process.env.DRY_RUN === '1';
const NOW        = new Date().toISOString();

const HDRS = {
  'Accept': '*/*', 'Content-Type': 'application/json',
  'Origin': BASE_URL, 'Referer': `${BASE_URL}/coverage/${PRODUCT_ID}`,
};

async function req(method, path, body) {
  if (DRY_RUN && method !== 'GET') { console.log(`    [dry] ${method} ${path}`); return { id: `dry-${Math.random().toString(36).slice(2,10)}` }; }
  const res = await fetch(`${BASE_URL}${path}`, { method, headers: HDRS, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) { throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}: ${text.slice(0,200)}`); }
  try { return JSON.parse(text); } catch { return text; }
}

const CO_ONLY = ['CO']; // this is a Colorado filing

// ============================================================================
// Rating tables — from EP CO Rates 04 25 (3rd Ed.)
// Embedded inline so each pricing step carries its lookup data.
// ============================================================================

// --- Base Rates (Coverage → base rate) ---
const T_BASE_RATE = {
  BI: 346.4159, PD: 254.6268, MP: 24.1807,
  'UM/UIM': 691.2548, 'UM PD': 60.6585,
  OTC: 146.0778, COLL: 98.4824,
};

// --- Limit Factors ---
const T_LIMIT_SINGLE = {
  '5000':   { MP: 1.0000 },
  '15000':  { PD: 0.8410 },
  '25000':  { PD: 0.8950 },
  '50000':  { PD: 0.9456 },
  '65000':  { 'BI CSL': 0.8646, 'PD CSL': 0.9432, 'UM/UIM': 0.7293 },
  '100000': { 'BI CSL': 0.9519, PD: 1.0000, 'PD CSL': 0.9750, 'UM/UIM': 0.9560 },
  '250000': { PD: 1.1152 },
  '300000': { 'BI CSL': 1.3315, PD: 1.1505, 'PD CSL': 1.1218, 'UM/UIM': 1.4827 },
  '500000': { 'BI CSL': 1.6134, PD: 1.2671, 'PD CSL': 1.2354, 'UM/UIM': 2.6577 },
};
const T_LIMIT_SPLIT = {
  '25/50':   { BI: 0.7104, 'UM/UIM': 0.6083 },
  '50/100':  { BI: 0.9008, 'UM/UIM': 0.7794 },
  '100/300': { BI: 1.0000, 'UM/UIM': 1.0000 },
  '250/500': { BI: 1.3239, 'UM/UIM': 1.4449 },
  '300/300': { BI: 1.3657, 'UM/UIM': 1.4827 },
  '500/500': { BI: 1.6548, 'UM/UIM': 2.6577 },
};

// --- Deductible Factors (OTC) — deductible × vehicle value band ---
// columns: 0-9999, 10-19999, 20-29999, 30-39999, 40-49999, 50-99999, 100-149999, 150-199999, 200000+
const T_DED_OTC = {
  '0':      [1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000],
  '100':    [0.9524,0.9707,0.9804,0.9854,0.9874,0.9912,0.9931,0.9967,0.9981],
  '250':    [0.8857,0.9292,0.9528,0.9645,0.9696,0.9784,0.9833,0.9922,0.9954],
  '500':    [0.7997,0.8716,0.9123,0.9332,0.9421,0.9588,0.9669,0.9843,0.9912],
  '1000':   [0.6946,0.7826,0.8485,0.8823,0.8972,0.9256,0.9364,0.9693,0.9817],
  '1500':   [0.6513,0.7081,0.7939,0.8393,0.8614,0.8982,0.9093,0.9536,0.9703],
  '2500':   [0.6117,0.6117,0.7024,0.7663,0.8007,0.8492,0.8625,0.9292,0.9527],
  '5000':   [0.5679,0.5679,0.5679,0.6335,0.6899,0.7575,0.7769,0.8711,0.9154],
  '10000':  [null,  0.5288,0.5288,0.5288,0.5408,0.6312,0.6856,0.7891,0.8741],
  '20000':  [null,  null,  0.4832,0.4832,0.4832,0.5160,0.5787,0.6799,0.8089],
  '50000':  [null,  null,  null,  null,  null,  0.4286,0.4286,0.4875,0.6676],
  '100000': [null,  null,  null,  null,  null,  null,  0.3518,0.3964,0.4894],
};
const T_DED_OTC_GLASS = {
  '100':    [0.9725,0.9812,0.9861,0.9893,0.9908,0.9933,0.9945,0.9971,0.9983],
  '250':    [0.9321,0.9533,0.9657,0.9735,0.9773,0.9833,0.9864,0.9929,0.9960],
  '500':    [0.8670,0.9086,0.9325,0.9475,0.9549,0.9674,0.9728,0.9860,0.9923],
  '1000':   [0.7578,0.8273,0.8733,0.9003,0.9142,0.9380,0.9463,0.9724,0.9847],
  '1500':   [0.7221,0.7559,0.8209,0.8594,0.8796,0.9132,0.9243,0.9596,0.9760],
  '2500':   [0.6814,0.6814,0.7311,0.7879,0.8197,0.8664,0.8805,0.9373,0.9620],
  '5000':   [0.6347,0.6347,0.6347,0.6557,0.7090,0.7770,0.7991,0.8819,0.9335],
  '10000':  [null,  0.5692,0.5692,0.5692,0.5692,0.6515,0.6999,0.8040,0.8993],
  '20000':  [null,  null,  0.5113,0.5113,0.5113,0.5332,0.5922,0.6948,0.8376],
  '50000':  [null,  null,  null,  null,  null,  0.4424,0.4450,0.4940,0.6901],
  '100000': [null,  null,  null,  null,  null,  null,  0.3653,0.4031,0.5214],
};
const T_DED_COLL = {
  '0':      [1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000,1.0000],
  '100':    [0.9675,0.9766,0.9824,0.9851,0.9876,0.9908,0.9943,0.9956,0.9956],
  '250':    [0.9221,0.9436,0.9571,0.9634,0.9700,0.9776,0.9861,0.9890,0.9890],
  '500':    [0.8480,0.8894,0.9158,0.9281,0.9408,0.9557,0.9725,0.9781,0.9784],
  '1000':   [0.7128,0.7940,0.8422,0.8646,0.8860,0.9145,0.9463,0.9573,0.9573],
  '1500':   [0.6390,0.7093,0.7781,0.8111,0.8385,0.8840,0.9249,0.9419,0.9531],
  '2500':   [0.5980,0.5980,0.6656,0.7142,0.7516,0.8188,0.8803,0.9100,0.9232],
  '5000':   [0.5593,0.5593,0.5593,0.5774,0.5891,0.6934,0.7797,0.8402,0.8725],
  '10000':  [null,  0.5205,0.5205,0.5205,0.5205,0.5598,0.6526,0.7264,0.7900],
  '20000':  [null,  null,  0.4773,0.4773,0.4773,0.5100,0.5291,0.5844,0.6469],
  '50000':  [null,  null,  null,  null,  null,  0.4313,0.4313,0.4640,0.4720],
  '100000': [null,  null,  null,  null,  null,  null,  0.3539,0.3865,0.3933],
};
const DED_VALUE_BANDS = ['0-9999','10000-19999','20000-29999','30000-39999','40000-49999','50000-99999','100000-149999','150000-199999','200000+'];

// --- Guaranteed Value® factors (UM PD, OTC, COLL) — value in dollars ---
const T_GV = [
  [1,0.0002,0.0001,0.0002],[500,0.1205,0.0586,0.1205],[1500,0.1787,0.1690,0.1787],[2500,0.2879,0.2764,0.2879],
  [3500,0.3940,0.3822,0.3940],[4500,0.4981,0.4869,0.4981],[5500,0.6006,0.5907,0.6006],[6500,0.7019,0.6938,0.7019],
  [7500,0.8021,0.7964,0.8021],[8500,0.9014,0.8984,0.9014],[9500,1.0000,1.0000,1.0000],[10500,1.0979,1.1012,1.0979],
  [11500,1.1951,1.2021,1.1951],[12500,1.2918,1.3026,1.2918],[13500,1.3879,1.4028,1.3879],[14500,1.4836,1.5028,1.4836],
  [15500,1.5788,1.6025,1.5788],[16500,1.6736,1.7020,1.6736],[17500,1.7680,1.8013,1.7680],[18500,1.8621,1.9003,1.8621],
  [19500,1.9558,1.9992,1.9558],[20500,2.0492,2.0978,2.0492],[21500,2.1423,2.2051,2.1423],[22500,2.2351,2.3126,2.2351],
  [23500,2.3277,2.4204,2.3277],[24500,2.4199,2.5284,2.4199],[25500,2.5119,2.6373,2.5119],[26500,2.6037,2.7465,2.6037],
  [27500,2.6952,2.8560,2.6952],[28500,2.7866,2.9656,2.7866],[29500,2.8777,3.0755,2.8777],[30500,2.9685,3.1856,2.9685],
  [31500,3.0592,3.2958,3.0592],[32500,3.1497,3.4063,3.1497],[33500,3.2400,3.5169,3.2400],[34500,3.3302,3.6278,3.3302],
  [35500,3.4201,3.7388,3.4201],[36500,3.5099,3.8500,3.5099],[37500,3.5995,3.9613,3.5995],[38500,3.6890,4.0728,3.6890],
  [39500,3.7783,4.1845,3.7783],[40500,3.8675,4.2963,3.8675],[41500,3.9565,4.3809,3.9565],[42500,4.0453,4.4650,4.0453],
  [43500,4.1340,4.5488,4.1340],[44500,4.2226,4.6322,4.2226],[45500,4.3111,4.7375,4.3111],[46500,4.3994,4.7970,4.3994],
  [47500,4.4876,4.8563,4.4876],[48500,4.5756,4.9151,4.5756],[49500,4.6636,4.9736,4.6636],[52500,4.9267,5.1472,4.9267],
  [57500,5.3631,5.4307,5.3631],[62500,5.7968,5.7076,5.7968],[67500,6.2283,5.9789,6.2283],[72500,6.6576,6.2451,6.6576],
  [77500,7.0850,6.5068,7.0850],[82500,7.5104,6.7646,7.5104],[87500,7.9342,7.0186,7.9342],[92500,8.3563,7.2694,8.3563],
  [97500,8.7769,7.5172,8.7769],[100000,8.9867,7.6400,8.9867],
];
const GV_ADDL_PER_100 = { 'UM PD': 0.0075, OTC: 0.0075, COLL: 0.0075 };

// --- Modified/Model Year Factors (compacted: first column Modified vs Stock, year, then [BI/PD/MP, UM PD, OTC, COLL]) ---
// Format: { "Modified_1945": { BI: 1.2201, UMPD: 1.5255, OTC: 1.0996, COLL: 1.5255 }, ... }
// For brevity, we encode ranges where a factor is constant.
const T_MMY_RANGES = [
  // [kind, yearFrom, yearTo, BI, UMPD, OTC, COLL]
  ['Modified', null, 1945, 1.2201, 1.5255, 1.0996, 1.5255],
  ['Modified', 1946, 1951, 1.2201, 1.5255, 1.2926, 1.5255],
  ['Modified', 1952, 1969, 1.2201, 1.5255, 1.4501, 1.5255],
  ['Modified', 1970, 1972, 1.5362, 1.5255, 1.4501, 1.5255],
  ['Modified', 1973, 1973, 1.5362, 1.8062, 1.4501, 1.8062],
  ['Modified', 1974, 1982, 1.5362, 1.8062, 1.6000, 1.8062],
  ['Modified', 1983, 1983, 1.5362, 1.8062, 1.7874, 1.8062],
  ['Modified', 1984, 1986, 1.7894, 1.8062, 1.7874, 1.8062],
  ['Modified', 1987, 1988, 1.7894, 2.1308, 1.7874, 2.1308],
  ['Modified', 1989, 1991, 1.7894, 2.1308, 2.3000, 2.1308],
  ['Modified', 1992, 1992, 1.7894, 2.1308, 1.6932, 2.1308],
  ['Modified', 1993, 1996, 1.7894, 3.6000, 1.6932, 3.6000],
  ['Modified', 1997, 1997, 2.1701, 3.6000, 1.6932, 3.6000],
  ['Modified', 1998, 1998, 2.1701, 3.0398, 1.6932, 3.0398],
  ['Modified', 1999, 2000, 2.1701, 3.0398, 1.4809, 3.0398],
  ['Modified', 2001, 2020, 2.1701, 2.3984, 1.4809, 2.3984],
  ['Stock',    null, 1945, 0.8172, 0.6652, 0.6246, 0.6652],
  ['Stock',    1946, 1946, 0.8172, 0.7533, 0.6246, 0.7533],
  ['Stock',    1947, 1949, 0.8172, 0.7533, 0.8873, 0.7533],
  ['Stock',    1950, 1950, 0.8172, 0.7533, 0.9300, 0.7533],
  ['Stock',    1951, 1953, 0.8172, 0.8319, 0.9300, 0.8319],
  ['Stock',    1954, 1961, 0.8172, 0.8319, 0.9500, 0.8319],
  ['Stock',    1962, 1963, 0.8172, 0.8319, 1.0000, 0.8319],
  ['Stock',    1964, 1964, 0.8172, 1.0000, 1.0000, 1.0000],
  ['Stock',    1965, 1970, 1.0000, 1.0000, 1.0000, 1.0000],
  ['Stock',    1971, 1973, 1.0000, 1.1512, 1.1858, 1.1512],
  ['Stock',    1974, 1975, 1.0000, 1.1512, 1.3686, 1.1512],
  ['Stock',    1976, 1976, 1.0000, 1.3745, 1.3686, 1.3745],
  ['Stock',    1977, 1978, 1.2104, 1.3745, 1.3686, 1.3745],
  ['Stock',    1979, 1979, 1.2104, 1.5275, 1.3686, 1.5275],
  ['Stock',    1980, 1982, 1.2104, 1.5275, 1.4323, 1.5275],
  ['Stock',    1983, 1983, 1.2104, 1.5275, 1.7353, 1.5275],
  ['Stock',    1984, 1986, 1.6594, 1.7030, 1.7353, 1.7030],
  ['Stock',    1987, 1990, 1.6594, 2.0481, 1.7353, 2.0481],
  ['Stock',    1991, 1993, 1.6594, 2.0481, 1.3713, 2.0481],
  ['Stock',    1994, 1996, 1.6594, 2.4218, 1.3713, 2.4218],
  ['Stock',    1997, 1997, 2.0125, 2.4218, 1.3713, 2.4218],
  ['Stock',    1998, 2000, 2.0125, 2.9553, 1.3713, 2.9553],
  ['Stock',    2001, 2001, 2.0125, 2.3865, 1.3713, 2.3865],
  ['Stock',    2002, 2010, 2.0125, 2.3865, 1.1965, 2.3865],
  ['Stock',    2011, 2020, 2.0125, 2.0119, 1.1965, 2.0119],
];

// --- Vehicle Type ---
const T_VEH_TYPE = {
  Auto:       { BI:1.0000, PD:1.0000, MP:1.0000, 'UM PD':1.0000, OTC:1.0000, COLL:1.0000 },
  Truck:      { BI:1.1500, PD:1.1500, MP:1.1500, 'UM PD':1.1000, OTC:1.1500, COLL:1.1000 },
  Motorcycle: { BI:0.1551, PD:0.0270, MP:1.1378, 'UM PD':1.0000, OTC:0.7794, COLL:1.0999 },
  Trailer:    { BI:1.0000, PD:1.0000, MP:1.0000, 'UM PD':1.0000, OTC:1.0000, COLL:1.0000 },
};

// --- Vehicle Attribute ---
const T_VEH_ATTR = {
  'Custom Import':  { BI:1.0, PD:1.0, MP:1.0, 'UM PD':1.6, OTC:2.0, COLL:1.6 },
  'Custom Cruiser': { BI:1.0, PD:1.0, MP:1.0, 'UM PD':1.6, OTC:2.0, COLL:1.6 },
  'Supercar':       { BI:1.5, PD:1.5, MP:1.5, 'UM PD':1.15, OTC:1.0, COLL:1.15 },
};

// --- Vehicle Symbol (A–F) ---
const T_VEH_SYMBOL = {
  A: { BI:1.0, PD:1.0, MP:1.0, 'UM PD':0.80, OTC:0.80, COLL:0.80 },
  B: { BI:1.0, PD:1.0, MP:1.0, 'UM PD':0.95, OTC:1.00, COLL:0.95 },
  C: { BI:1.0, PD:1.0, MP:1.0, 'UM PD':1.00, OTC:1.00, COLL:1.00 },
  D: { BI:1.1, PD:1.1, MP:1.1, 'UM PD':1.25, OTC:1.20, COLL:1.25 },
  E: { BI:1.2, PD:1.2, MP:1.2, 'UM PD':1.45, OTC:1.40, COLL:1.45 },
  F: { BI:1.0, PD:1.0, MP:1.0, 'UM PD':1.00, OTC:1.00, COLL:1.00 },
};

// --- Supercar Mileage ---
const T_SUPERCAR_MI = {
  '<=3500':    { BI:1.00, PD:1.00, MP:1.00, 'UM PD':1.00, OTC:1.00, COLL:1.00 },
  '3501-5000': { BI:1.45, PD:1.45, MP:1.45, 'UM PD':1.45, OTC:1.25, COLL:1.45 },
  '5001+':     { BI:1.55, PD:1.55, MP:1.55, 'UM PD':1.55, OTC:1.35, COLL:1.60 },
};

// --- Usage ---
const T_USAGE = {
  Pleasure:              { BI:1.00, PD:1.00, MP:1.00, 'UM PD':1.00, OTC:1.00, COLL:1.00 },
  'Commute 0-3':         { BI:1.00, PD:1.00, MP:1.00, 'UM PD':1.00, OTC:1.00, COLL:1.00 },
  'Commute 4-14':        { BI:1.05, PD:1.05, MP:1.07, 'UM PD':1.00, OTC:1.09, COLL:1.00 },
  'Commute 15+':         { BI:1.15, PD:1.15, MP:1.07, 'UM PD':1.05, OTC:1.30, COLL:1.05 },
  'Occasional Business': { BI:1.30, PD:1.30, MP:1.07, 'UM PD':1.15, OTC:1.25, COLL:1.15 },
};

// --- ZIP Code Factors (Colorado — from the filing) ---
// Columns: BI, PD, MP, OTC, COLL
const T_ZIP = {
 '80001':[1.04,1.04,1.01,1.08,1.13],'80002':[0.98,0.98,0.99,1.06,1.12],'80003':[1.05,1.05,1.05,1.07,1.08],
 '80004':[1.03,1.03,0.99,1.04,1.00],'80005':[1.02,1.02,1.02,0.99,1.01],'80010':[1.26,1.26,1.22,1.10,1.39],
 '80011':[1.21,1.21,1.25,1.07,1.17],'80012':[1.17,1.17,1.25,1.08,1.23],'80013':[1.26,1.26,1.25,1.04,1.23],
 '80014':[1.19,1.19,1.21,1.10,1.27],'80015':[1.14,1.14,1.20,1.03,1.21],'80016':[1.15,1.15,1.08,1.05,1.13],
 '80017':[1.23,1.23,1.23,1.06,1.24],'80020':[0.94,0.94,0.96,0.97,0.97],'80021':[0.99,0.99,0.93,0.96,0.97],
 '80022':[1.09,1.09,1.13,1.06,1.01],'80026':[0.89,0.89,0.98,0.93,0.91],'80027':[0.90,0.90,0.91,1.01,0.88],
 '80030':[1.03,1.03,1.09,1.07,1.16],'80031':[1.07,1.07,1.10,0.95,1.13],'80033':[0.99,0.99,1.01,1.07,1.10],
 '80101':[0.76,0.76,0.89,2.01,1.01],'80104':[0.91,0.91,0.92,1.17,0.94],'80108':[0.90,0.90,0.88,1.08,0.95],
 '80109':[0.94,0.94,0.92,1.12,0.95],'80110':[1.03,1.03,1.03,1.08,1.08],'80111':[1.07,1.07,0.99,1.00,1.08],
 '80112':[1.07,1.07,1.01,0.95,1.01],'80113':[1.05,1.05,1.00,1.06,1.11],'80120':[0.98,0.98,0.95,1.01,0.98],
 '80121':[0.97,0.97,0.92,0.98,0.99],'80122':[1.00,1.00,0.93,0.95,1.00],'80123':[0.93,0.93,0.95,1.08,0.96],
 '80124':[0.96,0.96,0.94,1.00,1.03],'80126':[0.95,0.95,0.91,0.93,1.02],'80127':[0.82,0.82,0.88,1.10,0.91],
 '80128':[0.92,0.92,0.97,1.02,0.99],'80129':[0.99,0.99,0.99,0.94,0.99],'80134':[0.98,0.98,0.92,1.00,1.01],
 '80202':[1.13,1.13,0.98,1.09,1.39],'80203':[1.10,1.10,1.01,1.11,1.42],'80204':[1.17,1.17,1.03,1.16,1.39],
 '80205':[1.14,1.14,1.05,1.04,1.34],'80206':[1.13,1.13,0.98,1.08,1.44],'80207':[1.17,1.17,1.05,1.10,1.35],
 '80209':[1.12,1.12,0.95,1.11,1.36],'80210':[1.06,1.06,0.99,1.09,1.24],'80211':[1.17,1.17,1.01,1.10,1.30],
 '80212':[1.08,1.08,1.03,1.11,1.22],'80214':[1.01,1.01,1.09,1.13,1.10],'80215':[1.00,1.00,0.97,1.11,1.06],
 '80216':[1.14,1.14,1.14,1.04,1.18],'80218':[1.10,1.10,1.02,1.10,1.43],'80219':[1.11,1.11,1.13,1.26,1.32],
 '80220':[1.24,1.24,1.02,1.01,1.31],'80221':[1.06,1.06,1.08,1.07,1.18],'80222':[1.12,1.12,1.01,1.07,1.25],
 '80223':[1.07,1.07,1.07,1.20,1.31],'80224':[1.13,1.13,1.11,1.09,1.24],'80226':[1.03,1.03,1.03,1.15,1.13],
 '80227':[1.02,1.02,1.02,1.12,1.11],'80228':[0.92,0.92,0.95,1.11,1.03],'80229':[1.12,1.12,1.10,1.03,1.14],
 '80230':[1.23,1.23,1.09,1.06,1.30],'80231':[1.18,1.18,1.15,1.08,1.34],'80232':[1.07,1.07,1.08,1.14,1.13],
 '80233':[1.01,1.01,1.09,0.99,1.09],'80234':[1.03,1.03,1.05,0.95,1.02],'80235':[0.95,0.95,1.03,1.09,1.01],
 '80236':[0.97,0.97,1.10,1.14,1.10],'80237':[1.08,1.08,1.04,1.06,1.19],'80238':[1.14,1.14,1.06,1.08,1.33],
 '80239':[1.20,1.20,1.24,1.04,1.28],'80246':[1.17,1.17,1.08,1.09,1.31],'80247':[1.27,1.27,1.22,1.13,1.27],
 '80249':[1.13,1.13,1.24,1.09,1.06],'80301':[0.87,0.87,0.87,0.92,0.90],'80302':[0.93,0.93,0.88,0.97,1.00],
 '80303':[0.89,0.89,0.91,0.98,0.95],'80304':[0.92,0.92,0.87,0.96,0.91],'80305':[0.93,0.93,0.89,0.99,0.93],
 '80401':[0.91,0.91,0.94,1.09,0.99],'80403':[0.85,0.85,0.86,1.30,0.92],'80439':[0.81,0.81,0.84,1.30,1.10],
 '80501':[0.85,0.85,0.98,0.95,0.90],'80503':[0.83,0.83,0.92,0.98,0.93],'80504':[0.95,0.95,0.93,1.01,0.97],
 '80516':[0.87,0.87,0.96,0.99,0.87],'80521':[0.82,0.82,0.78,1.04,0.91],'80525':[0.82,0.82,0.80,1.01,0.88],
 '80526':[0.80,0.80,0.76,1.07,0.87],'80538':[0.80,0.80,0.88,1.07,0.91],'80601':[1.03,1.03,1.03,0.99,0.97],
 '80602':[0.96,0.96,1.00,0.93,0.93],'80634':[0.79,0.79,0.84,1.07,0.91],'80817':[0.98,0.98,1.10,1.21,1.05],
 '80831':[0.92,0.92,1.12,1.38,1.00],'80903':[1.02,1.02,1.08,1.25,1.11],'80904':[0.99,0.99,1.08,1.19,1.04],
 '80905':[1.03,1.03,1.07,1.24,1.10],'80906':[0.97,0.97,1.05,1.29,1.07],'80907':[1.05,1.05,1.09,1.22,1.06],
 '80909':[1.03,1.03,1.17,1.35,1.07],'80910':[1.08,1.08,1.18,1.27,1.13],'80915':[1.08,1.08,1.22,1.38,1.10],
 '80917':[1.05,1.05,1.16,1.34,1.10],'80918':[0.99,0.99,1.15,1.26,1.04],'80919':[0.92,0.92,1.05,1.19,0.97],
 '80920':[0.99,0.99,1.10,1.19,1.01],'80921':[0.89,0.89,0.95,1.28,0.98],'80923':[1.01,1.01,1.14,1.30,1.04],
 '81001':[0.94,0.94,1.08,1.51,0.96],'81003':[0.99,0.99,1.10,1.54,0.99],'81004':[0.93,0.93,1.07,1.62,1.00],
 '81005':[0.96,0.96,1.06,1.47,0.96],'81007':[0.95,0.95,1.09,1.51,0.96],'81101':[1.02,1.02,1.00,1.37,1.27],
 '81201':[1.02,1.02,1.00,1.46,1.27],'81212':[1.02,1.02,1.00,1.41,1.27],'81301':[1.02,1.02,1.00,1.53,1.27],
 '81401':[0.62,0.62,0.67,1.19,0.85],'81501':[0.67,0.67,0.71,0.74,0.83],'81505':[0.65,0.65,0.69,0.74,0.83],
 '81611':[0.67,0.67,0.79,1.29,1.14],'81620':[0.67,0.67,0.62,1.15,1.12],'81621':[0.65,0.65,0.66,1.24,1.16],
 '81623':[0.65,0.65,0.67,1.35,1.07],'81631':[0.63,0.63,0.60,1.23,1.07],'81632':[0.63,0.63,0.58,1.18,1.06],
 '81635':[0.61,0.61,0.64,1.13,0.93],'81650':[0.61,0.61,0.68,1.28,0.96],'81657':[0.66,0.66,0.60,1.25,1.07],
};

// --- Insurance Score Factors (by score range × coverage) ---
const T_INS_SCORE = {
  '<=520':   { BI:1.8534, PD:1.8534, MP:1.8534, 'UM/UIM':1.8534, 'UM PD':1.8534, OTC:2.9018, COLL:1.9864 },
  '521-530': { BI:1.8023, PD:1.8023, MP:1.8023, 'UM/UIM':1.8023, 'UM PD':1.8023, OTC:2.7123, COLL:1.9256 },
  '531-540': { BI:1.7480, PD:1.7480, MP:1.7480, 'UM/UIM':1.7480, 'UM PD':1.7480, OTC:2.5269, COLL:1.8611 },
  '541-550': { BI:1.6973, PD:1.6973, MP:1.6973, 'UM/UIM':1.6973, 'UM PD':1.6973, OTC:2.3674, COLL:1.8012 },
  '551-560': { BI:1.6482, PD:1.6482, MP:1.6482, 'UM/UIM':1.6482, 'UM PD':1.6482, OTC:2.2229, COLL:1.7434 },
  '561-570': { BI:1.6000, PD:1.6000, MP:1.6000, 'UM/UIM':1.6000, 'UM PD':1.6000, OTC:2.0910, COLL:1.6868 },
  '571-580': { BI:1.5525, PD:1.5525, MP:1.5525, 'UM/UIM':1.5525, 'UM PD':1.5525, OTC:1.9702, COLL:1.6311 },
  '581-590': { BI:1.5083, PD:1.5083, MP:1.5083, 'UM/UIM':1.5083, 'UM PD':1.5083, OTC:1.8648, COLL:1.5795 },
  '591-600': { BI:1.4650, PD:1.4650, MP:1.4650, 'UM/UIM':1.4650, 'UM PD':1.4650, OTC:1.7680, COLL:1.5293 },
  '601-610': { BI:1.4212, PD:1.4212, MP:1.4212, 'UM/UIM':1.4212, 'UM PD':1.4212, OTC:1.6756, COLL:1.4784 },
  '611-620': { BI:1.3823, PD:1.3823, MP:1.3823, 'UM/UIM':1.3823, 'UM PD':1.3823, OTC:1.5982, COLL:1.4336 },
  '621-630': { BI:1.3408, PD:1.3408, MP:1.3408, 'UM/UIM':1.3408, 'UM PD':1.3408, OTC:1.5196, COLL:1.3857 },
  '631-640': { BI:1.3017, PD:1.3017, MP:1.3017, 'UM/UIM':1.3017, 'UM PD':1.3017, OTC:1.4495, COLL:1.3408 },
  '641-650': { BI:1.2649, PD:1.2649, MP:1.2649, 'UM/UIM':1.2649, 'UM PD':1.2649, OTC:1.3866, COLL:1.2987 },
  '651-660': { BI:1.2270, PD:1.2270, MP:1.2270, 'UM/UIM':1.2270, 'UM PD':1.2270, OTC:1.3245, COLL:1.2554 },
  '661-670': { BI:1.1915, PD:1.1915, MP:1.1915, 'UM/UIM':1.1915, 'UM PD':1.1915, OTC:1.2689, COLL:1.2151 },
  '671-680': { BI:1.1570, PD:1.1570, MP:1.1570, 'UM/UIM':1.1570, 'UM PD':1.1570, OTC:1.2170, COLL:1.1761 },
  '681-690': { BI:1.1233, PD:1.1233, MP:1.1233, 'UM/UIM':1.1233, 'UM PD':1.1233, OTC:1.1678, COLL:1.1380 },
  '691-700': { BI:1.0934, PD:1.0934, MP:1.0934, 'UM/UIM':1.0934, 'UM PD':1.0934, OTC:1.1257, COLL:1.1045 },
  '701-710': { BI:1.0589, PD:1.0589, MP:1.0589, 'UM/UIM':1.0589, 'UM PD':1.0589, OTC:1.0781, COLL:1.0657 },
  '711-720': { BI:1.0295, PD:1.0295, MP:1.0295, 'UM/UIM':1.0295, 'UM PD':1.0295, OTC:1.0387, COLL:1.0329 },
  '721-730': { BI:1.0000, PD:1.0000, MP:1.0000, 'UM/UIM':1.0000, 'UM PD':1.0000, OTC:1.0000, COLL:1.0000 },
  '731-740': { BI:0.9697, PD:0.9697, MP:0.9697, 'UM/UIM':0.9697, 'UM PD':0.9697, OTC:0.9608, COLL:0.9663 },
  '741-750': { BI:0.9407, PD:0.9407, MP:0.9407, 'UM/UIM':0.9407, 'UM PD':0.9407, OTC:0.9240, COLL:0.9343 },
  '751-760': { BI:0.9124, PD:0.9124, MP:0.9124, 'UM/UIM':0.9124, 'UM PD':0.9124, OTC:0.8884, COLL:0.9030 },
  '761-770': { BI:0.8880, PD:0.8880, MP:0.8880, 'UM/UIM':0.8880, 'UM PD':0.8880, OTC:0.8579, COLL:0.8762 },
  '771-780': { BI:0.8620, PD:0.8620, MP:0.8620, 'UM/UIM':0.8620, 'UM PD':0.8620, OTC:0.8256, COLL:0.8477 },
  '781-790': { BI:0.8384, PD:0.8384, MP:0.8384, 'UM/UIM':0.8384, 'UM PD':0.8384, OTC:0.7963, COLL:0.8219 },
  '791-800': { BI:0.8136, PD:0.8136, MP:0.8136, 'UM/UIM':0.8136, 'UM PD':0.8136, OTC:0.7654, COLL:0.7949 },
  '801-810': { BI:0.7886, PD:0.7886, MP:0.7886, 'UM/UIM':0.7886, 'UM PD':0.7886, OTC:0.7342, COLL:0.7678 },
  '811-820': { BI:0.7683, PD:0.7683, MP:0.7683, 'UM/UIM':0.7683, 'UM PD':0.7683, OTC:0.7086, COLL:0.7458 },
  '821-830': { BI:0.7446, PD:0.7446, MP:0.7446, 'UM/UIM':0.7446, 'UM PD':0.7446, OTC:0.6786, COLL:0.7203 },
  '831-840': { BI:0.7209, PD:0.7209, MP:0.7209, 'UM/UIM':0.7209, 'UM PD':0.7209, OTC:0.6482, COLL:0.6948 },
  '841-850': { BI:0.7018, PD:0.7018, MP:0.7018, 'UM/UIM':0.7018, 'UM PD':0.7018, OTC:0.6235, COLL:0.6744 },
  '851-860': { BI:0.6824, PD:0.6824, MP:0.6824, 'UM/UIM':0.6824, 'UM PD':0.6824, OTC:0.5980, COLL:0.6536 },
  '861-870': { BI:0.6616, PD:0.6616, MP:0.6616, 'UM/UIM':0.6616, 'UM PD':0.6616, OTC:0.5704, COLL:0.6315 },
  '871-880': { BI:0.6420, PD:0.6420, MP:0.6420, 'UM/UIM':0.6420, 'UM PD':0.6420, OTC:0.5510, COLL:0.6108 },
  '881-900': { BI:0.6240, PD:0.6240, MP:0.6240, 'UM/UIM':0.6240, 'UM PD':0.6240, OTC:0.5324, COLL:0.5917 },
  '901-940': { BI:0.5690, PD:0.5690, MP:0.5690, 'UM/UIM':0.5690, 'UM PD':0.5690, OTC:0.4700, COLL:0.5341 },
  '941-997': { BI:0.5690, PD:0.5690, MP:0.5690, 'UM/UIM':0.5690, 'UM PD':0.5690, OTC:0.3500, COLL:0.5341 },
  'No Hit':  { BI:1.1532, PD:1.1532, MP:1.1532, 'UM/UIM':1.1532, 'UM PD':1.1532, OTC:1.0419, COLL:1.3015 },
  'Thin File':{ BI:1.5381, PD:1.5381, MP:1.5381, 'UM/UIM':1.5381, 'UM PD':1.5381, OTC:1.3140, COLL:1.4738 },
};

// --- Driver Age (full table 16-90+) ---
const T_AGE = {
  '<=16':[3.4355,3.4355,1.7710,1.6412,1.5614,2.2902],'17':[2.8449,2.8449,1.6940,1.6258,1.5488,2.2748],
  '18':[2.3665,2.3665,1.5345,1.6104,1.5309,2.0438],'19':[1.7204,1.7204,1.3589,1.5950,1.5194,1.6742],
  '20':[1.4278,1.4278,1.2381,1.5796,1.4952,1.4454],'21':[1.2658,1.2658,1.1690,1.5642,1.4805,1.2936],
  '22':[1.1706,1.1706,1.1690,1.5499,1.4480,1.1627],'23':[1.0868,1.0868,1.1690,1.5077,1.4280,1.0681],
  '24':[1.0416,1.0416,1.1690,1.4649,1.3936,1.0483],'25':[1.0028,1.0028,1.1430,1.4238,1.3515,1.0286],
  '26':[0.9650,0.9650,1.1430,1.3882,1.3090,1.0088],'27':[0.9093,0.9093,1.1420,1.3460,1.2900,0.9890],
  '28':[0.9083,0.9083,1.1400,1.3310,1.2600,0.9890],'29':[0.8889,0.8889,1.1380,1.3160,1.2310,0.9880],
  '30':[0.8706,0.8706,1.1360,1.3020,1.2030,0.9860],'31':[0.8585,0.8585,1.1350,1.2890,1.1770,0.9860],
  '32':[0.8474,0.8474,1.1300,1.2770,1.1480,0.9860],'33':[0.8373,0.8373,1.1250,1.2650,1.1480,0.9710],
  '34':[0.8282,0.8282,1.1210,1.2530,1.1480,0.9560],'35':[0.8191,0.8191,1.1160,1.2410,1.1480,0.9400],
  '36':[0.8100,0.8100,1.1110,1.2290,1.1480,0.9240],'37':[0.8009,0.8009,1.1040,1.2180,1.1480,0.9080],
  '38':[0.7908,0.7908,1.0910,1.2060,1.1480,0.8920],'39':[0.7817,0.7817,1.0770,1.1940,1.1480,0.8770],
  '40':[0.7706,0.7706,1.0630,1.1830,1.1480,0.8610],'45':[0.7141,0.7141,0.9950,1.1280,1.1160,0.7880],
  '50':[0.6545,0.6545,0.9290,1.0750,1.0730,0.7270],'55':[0.6080,0.6080,0.8710,0.9390,1.0150,0.6850],
  '60':[0.5858,0.5858,0.8250,0.8570,0.9460,0.6640],'65':[0.5999,0.5999,0.7970,0.8270,0.8740,0.6750],
  '70':[0.6605,0.6605,0.7930,0.8220,0.7970,0.7250],'75':[0.7716,0.7716,0.8240,0.8060,0.7090,0.8060],
  '80':[0.9211,0.9211,0.9190,0.7390,0.6090,0.9270],'85':[1.0393,1.0393,1.0100,0.5910,0.5500,1.1040],
  '90+':[1.0837,1.0837,1.0100,0.5110,0.5700,1.1480],
};

// --- Driving Record Points Factors ---
const T_POINTS = {
  '<=1':1.0000, '2':1.0500, '3':1.1500, '4':1.4000, '5':1.7500,
  '6':2.2500, '7':2.7500, '8':3.2500, '9':3.7500, '10':4.2500,
  '11':4.7500, '12':5.2500, '13':5.7500, '14+':6.2500,
};

// --- Loss History Factors ---
const T_LOSS = {
  '1_vehicle': [1.0000,1.6000,2.4900,3.6400,7.8400,9.2900, 1.2500 /* each addl */],
  '2_vehicle': [1.0000,1.4700,1.9200,2.4900,4.5700,5.2900, 0.6500],
  '3_vehicle': [1.0000,1.4100,1.7200,2.1100,3.4700,3.9500, 0.4500],
  '4+_vehicle':[1.0000,1.4100,1.6300,1.9200,2.9200,3.2900, 0.3500],
};

// --- Number of Vehicles/Drivers (collapsed — matrix was identical by driver count 2+) ---
const T_NVD = {
  // [drivers][vehicles] → { BI, PD, MP, UM/UIM, UM PD, OTC, COLL }
  '1v': { BI:0.9740, PD:0.9740, MP:0.9810, 'UM/UIM':0.9500, 'UM PD':1.0280, OTC:0.9320, COLL:1.0020 },
  '2v': { BI:0.7500, PD:0.7500, MP:0.7877, 'UM/UIM':0.7220, 'UM PD':0.8430, OTC:1.0130, COLL:0.8116 },
  '3v': { BI:0.7130, PD:0.7130, MP:0.7153, 'UM/UIM':0.6756, 'UM PD':0.7454, OTC:1.0850, COLL:0.7987 },
  '4v': { BI:0.6661, PD:0.6661, MP:0.6437, 'UM/UIM':0.6354, 'UM PD':0.6749, OTC:1.0990, COLL:0.7808 },
  '5v': { BI:0.6406, PD:0.6406, MP:0.5814, 'UM/UIM':0.6156, 'UM PD':0.6642, OTC:1.1290, COLL:0.7703 },
  '6v+':{ BI:0.6037, PD:0.6037, MP:0.5390, 'UM/UIM':0.5502, 'UM PD':0.6494, OTC:1.1540, COLL:0.6901 },
};

// --- Payment Discount ---
const T_PAY = {
  'Paid-in-Full':         { all: 0.9000 },
  'Recurring ACH Payment':{ all: 0.9500 },
};

// --- Additional Rating Factors ---
const T_ARF = {
  'Cherished Salvage®':            { OTC:1.1500, COLL:1.1500 },
  'Waiver of Subrogation':         { OTC:1.0100, COLL:1.0100 },
  'Mass Marketing Discount':       { BI:0.95, PD:0.95, MP:0.95, OTC:0.95, COLL:0.95 },
  'Secure Storage Discount':       { OTC:0.7500 },
  'Antique Low Use Vehicle':       { BI:0.1800, PD:0.1170, MP:0.4490, 'UM PD':0.4320, OTC:0.3387, COLL:0.3901 },
  'Antique Low Use Policy (All)':  { 'UM/UIM':0.4320 },
  'Antique Low Use Policy (Some)': { 'UM/UIM':0.6213 },
  'Accident Prevention Course (55+)':{ BI:0.95, PD:0.95, MP:0.95, COLL:0.95 },
};

// ============================================================================
// Data Dictionary — every field the rating algorithm and rules depend on
// ============================================================================
const DD = [
  // Driver
  { fieldCode:'driver_age',              label:'Driver Age',               dataType:'integer', category:'driver',   description:'Age of listed driver in years. Drives Driver Age Factor.' },
  { fieldCode:'driving_record_points',   label:'Driving Record Points',    dataType:'integer', category:'driver',   description:'Cumulative points assigned per Rule 10.1 over previous 3 years. Points expire at first renewal after conviction is 3 years old.' },
  { fieldCode:'at_fault_accidents_3yr',  label:'At-Fault Accidents (3yr)', dataType:'integer', category:'driver',   description:'Count of at-fault accidents in the preceding 3 years. Per Rule 10.1.B, excludes certain loss types.' },
  { fieldCode:'accident_prevention_course_55plus', label:'Accident Prevention Course (55+)', dataType:'boolean', category:'driver', description:'Principal operator age 55+ who completed a pre-approved DR driver education course within last 36 months. Rule 4.G.' },
  { fieldCode:'insurance_score',         label:'Insurance Score',          dataType:'integer', category:'driver',   description:'Credit-based insurance score. Rule 10.2.A mandates application to all vehicles. Updated every 36 months minimum.' },
  { fieldCode:'has_motorcycle_safety_cert',label:'Motorcycle Safety Foundation Certificate', dataType:'boolean', category:'driver', description:'Proof of MSF certificate. Rule 4.E discount.' },
  // Vehicle
  { fieldCode:'vehicle_type',            label:'Vehicle Type',             dataType:'enum',    category:'vehicle',  description:'Auto / Truck / Motorcycle / Trailer. Anything not listed rated as Auto.', values:['Auto','Truck','Motorcycle','Trailer'] },
  { fieldCode:'vehicle_make',            label:'Vehicle Make',             dataType:'string',  category:'vehicle',  description:'Manufacturer. Drives Symbol Assignment (EP Symbols 04 25).' },
  { fieldCode:'vehicle_model_year',      label:'Vehicle Model Year',       dataType:'integer', category:'vehicle',  description:'Year of manufacture. For replicas, use replica year.' },
  { fieldCode:'vehicle_is_modified',     label:'Modified vs Stock',        dataType:'boolean', category:'vehicle',  description:'Modified vs Stock designation. Drives MMY table.' },
  { fieldCode:'vehicle_attribute',       label:'Vehicle Attribute',        dataType:'enum',    category:'vehicle',  description:'Custom Import / Custom Cruiser / Supercar / None', values:['None','Custom Import','Custom Cruiser','Supercar'] },
  { fieldCode:'vehicle_symbol',          label:'Vehicle Symbol',           dataType:'enum',    category:'vehicle',  description:'A–F symbol assignment per EP Symbols 04 25, by make × body type. 1980+ only; not applied to motorcycles, pre-1980 replicas, or trailers.', values:['A','B','C','D','E','F'] },
  { fieldCode:'vehicle_is_supercar',     label:'Is Supercar',              dataType:'boolean', category:'vehicle',  description:'Triggers Supercar Mileage Factor application.' },
  { fieldCode:'annual_mileage',          label:'Annual Mileage',           dataType:'integer', category:'vehicle',  description:'Declared annual mileage. Used for Supercar Mileage Factor (≤3500 / 3501-5000 / 5001+).' },
  { fieldCode:'vehicle_is_antique_low_use',label:'Antique Low Use Vehicle',dataType:'boolean', category:'vehicle',  description:'Flags the Antique Low Use Vehicle factor.' },
  { fieldCode:'vehicle_usage',           label:'Usage Category',           dataType:'enum',    category:'vehicle',  description:'Pleasure/Hobby, Commute 0-3, Commute 4-14, Commute 15+, Occasional Business. Per Rule 2.D.', values:['Pleasure','Commute 0-3','Commute 4-14','Commute 15+','Occasional Business'] },
  { fieldCode:'garaging_zip',            label:'Garaging ZIP Code',        dataType:'string',  category:'vehicle',  description:'ZIP where vehicle is customarily garaged/stored. Drives ZIP Code factor and determines rating territory.' },
  { fieldCode:'guaranteed_value',        label:'Guaranteed Value®',        dataType:'decimal', category:'vehicle',  description:'Agreed value for UM PD, OTC, COLL. Interpolated linearly; rounded to 4 decimals.' },
  { fieldCode:'stated_value',            label:'Stated Value',             dataType:'decimal', category:'vehicle',  description:'Alternate valuation per Rule 9.14. At total loss, pays lesser of Stated Value or ACV. Excludes several endorsements.' },
  { fieldCode:'vehicle_engine_cc',       label:'Motorcycle Engine Displacement (cc)', dataType:'integer', category:'vehicle', description:'For motorcycle rating only.' },
  { fieldCode:'is_touring_bike',         label:'Touring Bike',             dataType:'boolean', category:'vehicle',  description:'Motorcycle discount factor 0.60.' },
  { fieldCode:'has_antilock_brake',      label:'Motorcycle Anti-Lock Brake', dataType:'boolean', category:'vehicle',description:'Motorcycle ABS discount 0.95 on BI/PD/COLL.' },
  { fieldCode:'is_high_performance_mc',  label:'High Performance Motorcycle', dataType:'boolean', category:'vehicle', description:'High Performance Surcharge 2.10.' },
  // Policy
  { fieldCode:'number_of_vehicles',      label:'Number of Vehicles',       dataType:'integer', category:'policy',   description:'Excludes motorcycles, trailers, OTC-only. If entirely excluded types, apply 1 vehicle factor.' },
  { fieldCode:'number_of_drivers',       label:'Number of Drivers',        dataType:'integer', category:'policy',   description:'Used with Number of Vehicles for NVD factor.' },
  { fieldCode:'number_of_motorcycles',   label:'Number of Motorcycles',    dataType:'integer', category:'policy',   description:'Drives Multi-Motorcycle Discount.' },
  { fieldCode:'payment_plan',            label:'Payment Plan',             dataType:'enum',    category:'policy',   description:'Full / Semi-Annual / Quarterly / Monthly. Rule 7.A.', values:['Full','Semi-Annual','Quarterly','Monthly'] },
  { fieldCode:'uses_recurring_ach',      label:'Recurring ACH Payment',    dataType:'boolean', category:'policy',   description:'Auto-pay via ACH. Rule 4.D.' },
  { fieldCode:'is_mass_marketing_program', label:'Mass Marketing Program', dataType:'boolean', category:'policy',   description:'Flag for Rule 4.B discount eligibility (requires company approval).' },
  { fieldCode:'is_secure_storage',       label:'Secure Storage',           dataType:'boolean', category:'policy',   description:'Private garage, barn, pole building, dedicated storage unit, car condo. Rule 4.F.' },
  { fieldCode:'has_cherished_salvage',   label:'Cherished Salvage® Selected', dataType:'boolean', category:'policy', description:'Insured retains salvage at total loss. Rule 9.11 — vehicles 10+ model years only; excludes Stated Value and Special Build.' },
  { fieldCode:'has_waiver_of_subrogation',label:'Waiver of Subrogation',   dataType:'boolean', category:'policy',   description:'Waives insurer subrogation vs. repair facility/tech/broker. Rule 9.2.' },
  { fieldCode:'has_special_build',       label:'Special Build Coverage',   dataType:'boolean', category:'policy',   description:'Provides reimbursement beyond GV up to $500,000 for rebuild per Rule 9.15. Excludes Stated Value, VUC, Cherished Salvage.' },
  // Coverage-level
  { fieldCode:'limit_bi',                label:'BI Liability Limit',       dataType:'string',  category:'coverage', description:'Single limit ($65k–$500k) or Split (25/50 through 500/500). UM/UIM offered at or below BI.' },
  { fieldCode:'limit_pd',                label:'PD Liability Limit',       dataType:'integer', category:'coverage', description:'$15,000 through $500,000.' },
  { fieldCode:'limit_mp',                label:'Medical Payments Limit',   dataType:'integer', category:'coverage', description:'$5,000 default per Rule 8.3. Insured may reject in writing.' },
  { fieldCode:'limit_um_uim',            label:'UM/UIM BI Limit',          dataType:'string',  category:'coverage', description:'Offered at minimum CO FR limit. Insured may reject in writing per Rule 8.1.' },
  { fieldCode:'limit_um_pd',             label:'UM PD Limit',              dataType:'decimal', category:'coverage', description:'Equals Guaranteed Value® or Stated Value. Available only when UM/UIM purchased and COLL is not. Rule 8.1.B.' },
  { fieldCode:'deductible_otc',          label:'OTC Deductible',           dataType:'integer', category:'coverage', description:'$0 through $100,000 (availability depends on vehicle value band).' },
  { fieldCode:'deductible_coll',         label:'Collision Deductible',     dataType:'integer', category:'coverage', description:'$0 through $100,000.' },
  { fieldCode:'has_full_glass_coverage', label:'Full Glass Coverage',      dataType:'boolean', category:'coverage', description:'When selected, uses OTC Full Glass deductible table.' },
  // Endorsements
  { fieldCode:'spare_parts_limit',       label:'Spare Parts Increased Limit', dataType:'integer', category:'endorsement', description:'Base $750 per Rule 9.1; rated per $100 increase.' },
  { fieldCode:'custom_features_limit',   label:'Custom Features Limit',    dataType:'integer', category:'endorsement', description:'Up to $10,000; part of GV not additional. Rated per $100. Rule 9.3.' },
  { fieldCode:'value_added_tier',        label:'Value-Added Tier',         dataType:'enum',    category:'endorsement', description:'Plus / Premium / Ultimate. Bundled endorsement per Rule 12.', values:['None','Plus','Premium','Ultimate'] },
  { fieldCode:'has_vuc_endorsement',     label:'Vehicle Under Construction', dataType:'boolean', category:'endorsement', description:'Quarterly GV increases + Automotive Tools coverage. Rule 9.10.' },
  { fieldCode:'motorsports_tier',        label:'Motorsports Advantage™',   dataType:'enum',    category:'endorsement', description:'Base / +Autocross / +HPDE / +Autocross+HPDE. Rule 9.12.', values:['None','Base','+Autocross','+HPDE','+Autocross+HPDE'] },
  { fieldCode:'rental_reimbursement_tier',label:'Rental Reimbursement',    dataType:'enum',    category:'endorsement', description:'$50/day-$1500 or $125/day-$3750. Requires BI+PD. Rule 9.18.', values:['None','$50/$1500','$125/$3750'] },
  { fieldCode:'has_overlander',          label:'Overlander Endorsement',   dataType:'boolean', category:'endorsement', description:'Camping/low-risk offroad bundle. Requires BI+PD. Rule 9.17.' },
];

// ============================================================================
// Coverages — PCM hierarchy
// ============================================================================
const COVERAGES = [
  // ─── Root — 7 filed coverages ─────────────────────────────────────────────
  { key:'bi',     parent:null, name:'Bodily Injury Liability', code:'BI',
    category:'Liability',
    description:'Pays damages for bodily injury for which the insured is legally responsible arising from the use of a covered auto. Offered at or above the CO financial responsibility minimum. Limits expressed as split (25/50 through 500/500) or combined single limit ($65K–$500K).',
    limits:['25/50','50/100','100/300 (default)','250/500','300/300','500/500','$65,000 CSL','$100,000 CSL','$300,000 CSL','$500,000 CSL'],
    deductibles:[] },
  { key:'pd',     parent:null, name:'Property Damage Liability', code:'PD',
    category:'Liability',
    description:'Pays damages for property damage for which the insured is legally responsible arising from the use of a covered auto.',
    limits:['$15,000','$25,000','$50,000 (default)','$100,000','$250,000','$300,000','$500,000'],
    deductibles:[] },
  { key:'mp',     parent:null, name:'Medical Payments', code:'MP',
    category:'Medical',
    description:'$5,000 default per Rule 8.3. Available under every auto policy providing BI/PD. Named Insured may reject in writing; proof of rejection retained 3+ years or $5,000 MP presumed in force.',
    limits:['$5,000 (default)'],
    deductibles:[] },
  { key:'umuim',  parent:null, name:'Uninsured and Underinsured Motorist — Bodily Injury', code:'UM/UIM',
    category:'Liability',
    description:'Per Rule 8.1.A, offered at CO FR minimum on every policy providing BI/PD. Named Insured may reject in writing. Increased limits available up to the BI limit on the policy.',
    limits:['25/50','50/100','100/300 (default)','250/500','$65,000 CSL','$100,000 CSL','$300,000 CSL','$500,000 CSL'],
    deductibles:[] },
  { key:'otc',    parent:null, name:'Other Than Collision (Comprehensive)', code:'OTC',
    category:'Property',
    description:'Covers direct and accidental loss to the covered auto not caused by collision or overturn. Subject to selected deductible based on vehicle value band. Settled at Guaranteed Value® (or Stated Value if endorsed).',
    limits:['Guaranteed Value® (or Stated Value)'],
    deductibles:['$0','$100','$250','$500','$1,000','$1,500','$2,500','$5,000','$10,000','$20,000','$50,000','$100,000'] },
  { key:'coll',   parent:null, name:'Collision', code:'COLL',
    category:'Property',
    description:'Covers direct and accidental loss to the covered auto from collision with another object or overturn. Subject to selected deductible based on vehicle value band.',
    limits:['Guaranteed Value® (or Stated Value)'],
    deductibles:['$0','$100','$250','$500','$1,000','$1,500','$2,500','$5,000','$10,000','$20,000','$50,000','$100,000'] },

  // ─── Sub-coverages / endorsements ─────────────────────────────────────────
  { key:'umpd',   parent:'umuim', name:'Uninsured Motorist Property Damage', code:'UM PD',
    category:'Property',
    description:'Per Rule 8.1.B — available only when UM/UIM BI is purchased AND Collision is not. Limit equals Guaranteed Value® or Stated Value of the vehicle. Named Insured may reject in writing.',
    limits:['Equals Guaranteed Value® / Stated Value'], deductibles:[] },
  { key:'glass',  parent:'otc', name:'Full Glass Coverage', code:'GLASS',
    category:'Property',
    description:'When selected, glass-only losses are rated using the Full Glass deductible table (slightly higher factors than standard OTC), effectively reducing the net deductible applied to glass repairs/replacement.',
    limits:['ACV'], deductibles:['$100 (default when selected)'] },
  { key:'cherished',parent:'otc', name:'Cherished Salvage®', code:'CS',
    category:'Endorsement',
    description:'Insured retains the salvage in the event of a total loss or constructive total loss. Rule 9.11 — vehicles 10+ model years only; incompatible with Stated Value or Special Build.',
    limits:[], deductibles:[] },
  { key:'waiver', parent:'otc', name:'Waiver of Subrogation', code:'WOS',
    category:'Endorsement',
    description:'Waives insurer\'s right of subrogation against an auto repair facility, individual repair technician, or broker. Rule 9.2.',
    limits:[], deductibles:[] },
  { key:'special_build',parent:'otc', name:'Special Build Coverage', code:'SB',
    category:'Endorsement',
    description:'Up to $500,000 reimbursement beyond Guaranteed Value® for rebuild to pre-loss condition using similar materials. Rule 9.15 — insured must provide bills/receipts. Excludes Stated Value, VUC, Cherished Salvage.',
    limits:['50% OTC/COLL factor','100% OTC/COLL factor'], deductibles:[] },
  { key:'custom_features',parent:'otc', name:'Custom Features', code:'CF',
    category:'Endorsement',
    description:'Covers custom furnishings/equipment/electronics permanently installed in or attached to the vehicle. Up to $10,000; part of Guaranteed Value®, not an additional limit. Rule 9.3. Excluded on Stated Value vehicles.',
    limits:['Rate per $100: 1.5000'], deductibles:[] },
  { key:'spare_parts',parent:'otc', name:'Increased Limits — Spare Parts', code:'ILSP',
    category:'Endorsement',
    description:'Policy includes a basic limit of $750 for Spare Parts; may be increased. Rate per $100 = 0.3500. Rule 9.1.',
    limits:['Base $750 + increments of $100'], deductibles:[] },
  { key:'vuc',    parent:'coll', name:'Vehicle Under Construction', code:'VUC',
    category:'Endorsement',
    description:'Quarterly Guaranteed Value® increases during restoration/new build; adds Automotive Tools coverage. Rule 9.10 — $20/vehicle. Excludes Stated Value and Special Build.',
    limits:[], deductibles:[] },
  { key:'motorsports',parent:'coll', name:'Motorsports Advantage™', code:'MSA',
    category:'Endorsement',
    description:'Additional coverage for Spare Parts, Tools, Personal Effects, Safety Equipment, Accidental Death, Debris Removal, Pit Vehicle Physical Damage, Track Damage, Loss of Use/Trip Interruption. Optional autocross/HPDE coverage at higher tiers. Rule 9.12.',
    limits:['Base $20','+Autocross $250','+HPDE $150','+Autocross+HPDE $350'], deductibles:[] },
  { key:'rental', parent:'bi', name:'Rental Reimbursement', code:'RR',
    category:'Endorsement',
    description:'Reimburses temporary replacement transportation after a covered loss. Requires BI+PD. Rule 9.18. Contingent on bills/receipts submitted.',
    limits:['$50/day / $1,500 max — $50','$125/day / $3,750 max — $125'], deductibles:[] },
  { key:'overlander',parent:'bi', name:'Overlander Endorsement', code:'OL',
    category:'Endorsement',
    description:'Camping + low-risk offroad bundle: $10K Vacation Site Liability, $5K MP, $5K Camping Accessories, $250 Offroad Recovery. Requires liability coverage. $25/vehicle. Rule 9.17.',
    limits:['$25 per vehicle'], deductibles:[] },
  { key:'value_added',parent:null, name:'Value-Added Endorsement', code:'VA',
    category:'Endorsement',
    description:'Policy-level bundled endorsement with 3 tiers (Plus / Premium / Ultimate) covering Car Covers, Spare Parts, Limited Vehicle Fraud, Loss of Use, Post-Loss Trailering, Accidental Death, Automotive Tools, Branded Merchandise, Personal Effects, Vehicle Valuable Papers, Accidental Airbag Deployment, Vehicle Lock. Rule 12.',
    limits:['Plus $5','Premium $25','Ultimate $50'], deductibles:[] },
  { key:'stated_value',parent:'coll', name:'Stated Value', code:'SV',
    category:'Endorsement',
    description:'Alternative valuation for closed-end lease vehicles or where GV cannot be established. At total loss, pays lesser of Stated Value or ACV. Excludes Cherished Salvage, Custom Features, Special Build, VUC. Rule 9.14.',
    limits:[], deductibles:[] },
  { key:'nde',    parent:'bi', name:'Named Driver Exclusion', code:'NDE',
    category:'Endorsement',
    description:'Excludes coverage while vehicle driven by a specified excluded driver. Requires Named Insured signature. Applies to all vehicles and future renewals until discontinued by company. Rule 9.7.',
    limits:[], deductibles:[] },
  { key:'ndc',    parent:'coll', name:'Named Driver Coverage', code:'NDC',
    category:'Endorsement',
    description:'Excludes physical damage coverage except while operated by named individual(s). At company discretion for otherwise-declined risks. Rule 9.9.',
    limits:[], deductibles:[] },
  { key:'ailessor',parent:'bi', name:'Additional Insured — Lessor', code:'AIL',
    category:'Endorsement',
    description:'Extends BI/PD to a scheduled person/entity held legally responsible for acts/omissions of an insured. Rule 9.5.',
    limits:[], deductibles:[] },
  { key:'loss_payable',parent:'coll', name:'Loss Payable', code:'LP',
    category:'Endorsement',
    description:'Provides loss payment as interest appears to a scheduled loss payee. Rule 9.4.',
    limits:[], deductibles:[] },
  { key:'biz_use',parent:'bi', name:'Business Use', code:'BU',
    category:'Endorsement',
    description:'Coverage for incidental/occasional business use of an insured vehicle. Rule 9.6. Vehicles with >50% business use or fee-hire not eligible per Rule 2.D.5.',
    limits:[], deductibles:[] },
  { key:'moto',   parent:null, name:'Collector Motorcycle', code:'CM',
    category:'Endorsement',
    description:'Provides Motorcycle Passenger Liability equal to the BI Liability limit. Rule 9.8.',
    limits:[], deductibles:[] },
  { key:'off_road',parent:'otc', name:'Off Road Endorsement', code:'OR',
    category:'Endorsement',
    description:'Automatic on Truck/Jeep/SUV at no additional charge: Auto Tools $250 ($25 ded), Spare Parts $1,500, Fire Ext. Recovery $250, Offroad Safety Equipment $500. Rule 9.16.A.',
    limits:[], deductibles:[] },
  { key:'enjoy_ride',parent:'coll', name:'Enjoy The Ride Endorsement', code:'ETR',
    category:'Endorsement',
    description:'Automatic on Auto body type, model year 2000+: Motorsports MP $5K, Autocross Physical Damage $10K ($250 min ded), Finder\'s Fee $500, Branded Merchandise $750. Rule 9.16.B.',
    limits:[], deductibles:[] },
];

// ============================================================================
// Pricing Steps — Premium Calculation algorithm with inline tableData
// Part A (vehicle coverage premium), Part C (policy UM/UIM), Part D
// (endorsements), Part E (total).
// ============================================================================
const ROOT_COVERAGE_NAMES = ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury','Other Than Collision (Comprehensive)','Collision'];
const UMPD_NAME = 'Uninsured Motorist Property Damage';

function step(order, name, type, stepFormType, coverages, table, tableData, operand, value, description, extra={}) {
  return {
    productId: PRODUCT_ID,
    stepType: type,              // 'factor' or 'operand'
    type: stepFormType,          // UI "Type" column — server renames to stepFormType
    stepName: name,
    coverages,
    table,
    tableData,
    rounding: extra.rounding || 'none',
    states: CO_ONLY,
    upstreamId: '',
    operand,
    value,
    order,
    description,
    lookupKey: extra.lookupKey || null,
    conditions: extra.conditions || null,
    section: extra.section || 'Part A — Vehicle Coverage Premium',
    createdAt: NOW, updatedAt: NOW,
  };
}

// Part A — 24 vehicle-level steps
const PRICING_STEPS = [
  step( 0, 'Base Rate',                                'factor','Table',      ROOT_COVERAGE_NAMES.concat([UMPD_NAME]), 'Base Rates',               T_BASE_RATE,            '*', 1.0,
    'Per-coverage filed base rate from BR-1. Starting point for Part A.', { lookupKey:'coverage', rounding:'0.01' }),
  step( 1, 'Driver Age Factor',                        'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Age Factors (AGE-1/2)', T_AGE, '*', 1.0,
    'Looked up by driver age. Straight-averaged across all rated drivers (see step 4).', { lookupKey:'driver_age' }),
  step( 2, 'Driving Record Points Factor',             'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Collision'], 'Points Factors (PTS-1)', T_POINTS, '*', 1.0,
    'Looked up by driver points. Straight-averaged across drivers.', { lookupKey:'driving_record_points' }),
  step( 3, 'Accident Prevention Course Discount (55+)','factor','User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Collision'], 'Accident Prevention Course (55+)', T_ARF['Accident Prevention Course (55+)'], '*', 0.95,
    'Applied per Rule 4.G — driver 55+, DR-approved course in last 36 months, not court-ordered. Subject to 3-year re-evaluation.', { lookupKey:'accident_prevention_course_55plus' }),
  step( 4, 'Average Driver Factor',                    'operand','Calculated',['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], '', null, '=', 0,
    'Straight average of driver factors (Age × Points × APC) across all rated drivers; round to 4 decimals.', { rounding:'0.0001' }),
  step( 5, 'Limit Factor',                             'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury'], 'Limit Factors (ILF-1)', { single:T_LIMIT_SINGLE, split:T_LIMIT_SPLIT }, '*', 1.0,
    'Split Limit (25/50…500/500) or Single/CSL table. BI CSL uses separate BI CSL column.', { lookupKey:'limit_selected' }),
  step( 6, 'Deductible Factor',                        'factor','Table',      ['Other Than Collision (Comprehensive)','Collision'], 'Deductible Factors (DED-1/2)', { otc:T_DED_OTC, otc_glass:T_DED_OTC_GLASS, coll:T_DED_COLL, bands:DED_VALUE_BANDS }, '*', 1.0,
    'Looked up by deductible × vehicle value band. Full Glass sub-table used when cov_glass is selected. "-" in table = deductible unavailable.', { lookupKey:'deductible_selected' }),
  step( 7, 'Guaranteed Value® Factor',                 'factor','Table',      [UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Guaranteed Value® Factors (GV-1/2)', { table:T_GV, addlPer100:GV_ADDL_PER_100 }, '*', 1.0,
    'Linear interpolation between GV rows; round to 4 decimals. Over $100K: +0.0075/100 addl.', { lookupKey:'guaranteed_value', rounding:'0.0001' }),
  step( 8, 'Modified/Model Year Factor',               'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Modified/Model Year Factors (MMY-1..4)', T_MMY_RANGES, '*', 1.0,
    'Modified/Stock × year. Replicas use replica year. Factors vary by coverage × year band.', { lookupKey:['vehicle_is_modified','vehicle_model_year'] }),
  step( 9, 'Vehicle Type Factor',                      'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Vehicle Type Factors (TYPE-1)', T_VEH_TYPE, '*', 1.0,
    'Auto/Truck/Motorcycle/Trailer. Anything unlisted rated as Auto.', { lookupKey:'vehicle_type' }),
  step(10, 'Vehicle Attribute Factor',                 'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Vehicle Attribute Factors (ATTR-1)', T_VEH_ATTR, '*', 1.0,
    'Custom Import / Custom Cruiser / Supercar.', { lookupKey:'vehicle_attribute' }),
  step(11, 'Vehicle Symbol Factor',                    'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Vehicle Symbol Factors (SYMB-1)', T_VEH_SYMBOL, '*', 1.0,
    'Symbol A–F by make × body type from EP Symbols 04 25. Applies to model year 1980+, excludes motorcycles / pre-1980 replicas / trailers (Rule 10.2.B).', { lookupKey:'vehicle_symbol' }),
  step(12, 'Supercar Mileage Factor',                  'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Supercar Mileage Factors (SCMI-1)', T_SUPERCAR_MI, '*', 1.0,
    'Applied only when vehicle_is_supercar = true.', { lookupKey:'annual_mileage', conditions:'vehicle_is_supercar == true' }),
  step(13, 'Usage Factor',                             'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Usage Factors (USE-1)', T_USAGE, '*', 1.0,
    'Pleasure, Commute 0-3/4-14/15+, Occasional Business. If multiple categories apply, use the one generating the highest rate (Rule 2.D).', { lookupKey:'vehicle_usage' }),
  step(14, 'Antique Low Use Vehicle Factor',           'factor','User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Additional Rating Factors (ARF-1)', T_ARF['Antique Low Use Vehicle'], '*', 1.0,
    'Per-vehicle factor for antique low-use qualification.', { lookupKey:'vehicle_is_antique_low_use' }),
  step(15, 'ZIP Code Factor',                          'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Other Than Collision (Comprehensive)','Collision'], 'ZIP Code Factors (ZIP-1..13)', T_ZIP, '*', 1.0,
    'Colorado ZIP table. For new ZIPs: (1) use prior parent ZIP, (2) combined new → one of source ZIPs, (3) else adjacent lowest-rate (Rule 11.A).', { lookupKey:'garaging_zip' }),
  step(16, 'Insurance Score Factor',                   'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Insurance Score Factors (IS-1/2)', T_INS_SCORE, '*', 1.0,
    'Mandatory on all vehicles (Rule 10.2.A). Score refreshed at least every 36 months. No-Hit and Thin File have specific factors.', { lookupKey:'insurance_score' }),
  step(17, 'Loss History Factor',                      'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Collision'], 'Loss History Factors (LOSS-1)', T_LOSS, '*', 1.0,
    '# at-fault accidents in last 3 yrs, staggered by # vehicles with surcharge. Excludes losses <$3K, rear-ended no citation, hit-and-run reported, animal/glass, etc. (Rule 10.1.B).', { lookupKey:['vehicles_with_surcharge','at_fault_accidents_3yr'] }),
  step(18, 'Number of Vehicles/Drivers Factor',        'factor','Table',      ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Number of Vehicles/Drivers Factors (NVD-1)', T_NVD, '*', 1.0,
    'Excludes motorcycles/trailers/OTC-only from vehicle count. Policies entirely of excluded types use 1 vehicle / 1 driver factor.', { lookupKey:['number_of_vehicles','number_of_drivers'] }),
  step(19, 'Cherished Salvage® Factor',                'factor','User Input', ['Other Than Collision (Comprehensive)','Collision'], 'Additional Rating Factors (ARF-1)', T_ARF['Cherished Salvage®'], '*', 1.15,
    'Applied when Cherished Salvage® is selected. Vehicle must be 10+ model years and cannot have Stated Value or Special Build.', { lookupKey:'has_cherished_salvage' }),
  step(20, 'Waiver of Subrogation Factor',             'factor','User Input', ['Other Than Collision (Comprehensive)','Collision'], 'Additional Rating Factors (ARF-1)', T_ARF['Waiver of Subrogation'], '*', 1.01,
    'Rule 9.2.', { lookupKey:'has_waiver_of_subrogation' }),
  step(21, 'Special Build Coverage Factor',            'factor','Table',      ['Other Than Collision (Comprehensive)','Collision'], 'Optional Endorsements — Special Build (ENDO-1)', { '50%':1.25, '100%':1.50 }, '*', 1.0,
    'Rebuild beyond GV up to $500K. Excludes Stated Value, VUC, Cherished Salvage. Rule 9.15.', { lookupKey:'special_build_increase' }),
  step(22, 'Mass Marketing Discount',                  'factor','User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Other Than Collision (Comprehensive)','Collision'], 'Additional Rating Factors (ARF-1)', T_ARF['Mass Marketing Discount'], '*', 0.95,
    'Rule 4.B — requires company approval of program.', { lookupKey:'is_mass_marketing_program' }),
  step(23, 'Secure Storage Discount',                  'factor','User Input', ['Other Than Collision (Comprehensive)'], 'Additional Rating Factors (ARF-1)', T_ARF['Secure Storage Discount'], '*', 0.75,
    'Rule 4.F — private garage/barn/pole building/dedicated storage/car condo. Public parking garages do NOT qualify.', { lookupKey:'is_secure_storage' }),
  step(24, 'Paid-in-Full Discount',                    'factor','User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Payment Discount Factors (PAY-1)', T_PAY['Paid-in-Full'], '*', 0.9,
    'Rule 4.C — full premium at inception/renewal, or paid within 90 days.', { lookupKey:'payment_plan' }),
  step(25, 'Recurring ACH Payment Discount',           'factor','User Input', ['Bodily Injury Liability','Property Damage Liability','Medical Payments','Uninsured and Underinsured Motorist — Bodily Injury',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], 'Payment Discount Factors (PAY-1)', T_PAY['Recurring ACH Payment'], '*', 0.95,
    'Rule 4.D — ACH on non-full payment plan.', { lookupKey:'uses_recurring_ach' }),
  step(26, 'Vehicle Coverage Premium',                 'operand','Calculated',['Bodily Injury Liability','Property Damage Liability','Medical Payments',UMPD_NAME,'Other Than Collision (Comprehensive)','Collision'], '', null, '=', 0,
    'End of Part A: product of base rate and all applicable factors, by coverage. Round to the nearest cent per PREM CALC rounding rule.', { rounding:'0.01' }),

  // Part C — Policy-level UM/UIM (9 steps)
  step(27, 'Policy UM/UIM Base Rate',                  'factor','Table',      ['Uninsured and Underinsured Motorist — Bodily Injury'], 'Base Rates (BR-1)', { 'UM/UIM': T_BASE_RATE['UM/UIM'] }, '*', T_BASE_RATE['UM/UIM'],
    'Policy-level (not per-vehicle) UM/UIM base rate.', { section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(28, 'Policy UM/UIM × Vehicles with Coverage',   'operand','Calculated',['Uninsured and Underinsured Motorist — Bodily Injury'], '', null, '*', 0,
    'Multiplied by number of vehicles with UM/UIM coverage.', { lookupKey:'number_of_vehicles', section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(29, 'Policy UM/UIM Limit Factor',               'factor','Table',      ['Uninsured and Underinsured Motorist — Bodily Injury'], 'Limit Factors (ILF-1)', { single:T_LIMIT_SINGLE, split:T_LIMIT_SPLIT }, '*', 1.0,
    'Applied once at the policy level.', { lookupKey:'limit_um_uim', section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(30, 'Policy UM/UIM Antique Low Use Factor',     'factor','Table',      ['Uninsured and Underinsured Motorist — Bodily Injury'], 'ARF (ARF-1)', { all:T_ARF['Antique Low Use Policy (All)']['UM/UIM'], some:T_ARF['Antique Low Use Policy (Some)']['UM/UIM'] }, '*', 1.0,
    'All-antique vs some-antique policy.', { section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(31, 'Policy UM/UIM Insurance Score Factor',     'factor','Table',      ['Uninsured and Underinsured Motorist — Bodily Injury'], 'Insurance Score Factors (IS-1/2)', T_INS_SCORE, '*', 1.0,
    'Applied once at the policy level using Named Insured score.', { lookupKey:'insurance_score', section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(32, 'Policy UM/UIM Number of Vehicles/Drivers', 'factor','Table',      ['Uninsured and Underinsured Motorist — Bodily Injury'], 'NVD-1', T_NVD, '*', 1.0,
    'Applied once at the policy level.', { section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(33, 'Policy UM/UIM Paid-in-Full Discount',      'factor','User Input', ['Uninsured and Underinsured Motorist — Bodily Injury'], 'PAY-1', T_PAY['Paid-in-Full'], '*', 0.9,
    'Rule 4.C.', { section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(34, 'Policy UM/UIM ACH Discount',               'factor','User Input', ['Uninsured and Underinsured Motorist — Bodily Injury'], 'PAY-1', T_PAY['Recurring ACH Payment'], '*', 0.95,
    'Rule 4.D.', { section:'Part C — Policy Level Coverage (UM/UIM)' }),
  step(35, 'Policy UM/UIM Premium',                    'operand','Calculated',['Uninsured and Underinsured Motorist — Bodily Injury'], '', null, '=', 0,
    'End of Part C: round to nearest cent. Replaces per-vehicle UM/UIM premium from Part A for UM/UIM.', { rounding:'0.01', section:'Part C — Policy Level Coverage (UM/UIM)' }),

  // Part D — Endorsement premiums (6 steps)
  step(36, 'Endorsement Base — Custom Features',       'factor','User Input', ['Custom Features'], '', { ratePer100:1.5000 }, '*', 1.5,
    'Per $100 of custom features value. Rule 9.3.', { section:'Part D — Endorsement Premium Calculation' }),
  step(37, 'Endorsement Base — Increased Limits Spare Parts','factor','User Input', ['Increased Limits — Spare Parts'], '', { ratePer100:0.3500 }, '*', 0.35,
    'Per $100 above $750 base. Rule 9.1.', { section:'Part D — Endorsement Premium Calculation' }),
  step(38, 'Endorsement — Value-Added',                'factor','Table',      ['Value-Added Endorsement'], 'Optional Endorsements (ENDO-1)', { Plus:5, Premium:25, Ultimate:50 }, '+', 0,
    'Flat policy premium by tier. Rule 12.', { lookupKey:'value_added_tier', section:'Part D — Endorsement Premium Calculation' }),
  step(39, 'Endorsement — Vehicle Under Construction', 'factor','User Input', ['Vehicle Under Construction'], 'ENDO-1', { perVehicle:20 }, '+', 20,
    '$20/vehicle. Rule 9.10.', { section:'Part D — Endorsement Premium Calculation' }),
  step(40, 'Endorsement — Motorsports Advantage™',     'factor','Table',      ['Motorsports Advantage™'], 'ENDO-1', { Base:20, '+Autocross':250, '+HPDE':150, '+Autocross+HPDE':350, addlPer100Over25k:1.0000 }, '+', 20,
    'Per-vehicle by tier. Autocross/HPDE add +1.0000 per $100 value over $25,000.', { lookupKey:'motorsports_tier', section:'Part D — Endorsement Premium Calculation' }),
  step(41, 'Endorsement — Rental Reimbursement',       'factor','Table',      ['Rental Reimbursement'], 'ENDO-1', { '$50/$1500':50, '$125/$3750':125 }, '+', 50,
    'Per-vehicle. Requires BI+PD. Rule 9.18.', { lookupKey:'rental_reimbursement_tier', section:'Part D — Endorsement Premium Calculation' }),
  step(42, 'Endorsement — Overlander',                 'factor','User Input', ['Overlander Endorsement'], 'ENDO-1', { perVehicle:25 }, '+', 25,
    '$25/vehicle. Rule 9.17.', { section:'Part D — Endorsement Premium Calculation' }),
  step(43, 'Total Endorsement Premium',                'operand','Calculated',['Value-Added Endorsement','Vehicle Under Construction','Motorsports Advantage™','Rental Reimbursement','Overlander Endorsement','Custom Features','Increased Limits — Spare Parts'], '', null, '=', 0,
    'Sum of all Part D endorsement premiums.', { section:'Part D — Endorsement Premium Calculation' }),

  // Part E — Total
  step(44, 'Subtotal — Parts A + C + D (Minimum Premium)','operand','Calculated',ROOT_COVERAGE_NAMES, '', { minPremium:125 }, '+', 0,
    'Sum of Parts A, C, and D — subject to minimum written premium of $125 (Rule 3.1.C).', { section:'Part E — Total Premium' }),
  step(45, 'Auto Theft Prevention Authority Fee',      'factor','User Input', ROOT_COVERAGE_NAMES, '', { perVehicle:1.00 }, '+', 1.00,
    'Fully earned. $1 per vehicle, all registered motor vehicles under 26,000 GVW. Rule 3.2.', { section:'Part E — Total Premium' }),
  step(46, 'Final Policy Premium',                     'operand','Calculated',ROOT_COVERAGE_NAMES, '', null, '=', 0,
    'Final premium.', { rounding:'0.01', section:'Part E — Total Premium' }),
];

// ============================================================================
// Rules — filed manual rules
// ============================================================================
const RULES = [
  { name:'Enthusiast Vehicle Definition',             cat:'Eligibility', ref:'Rule 1', condition:'(vehicle_age >= 25 AND personal_use_only) OR unique_rare_limited_production OR exotic_special_interest_under_14yrs', outcome:'Qualifies as Enthusiast Vehicle eligible for E+ program.' },
  { name:'Vehicle Usage Eligibility',                 cat:'Eligibility', ref:'Rule 2.A-C', condition:'usage_primary IN (daily driving, auto club, exhibits, parades, private collection) AND NOT racing AND NOT rallies', outcome:'Eligible. If >50% business use or fee-hire → decline per Rule 2.D.5.' },
  { name:'Usage Category Selection',                  cat:'Rating',      ref:'Rule 2.D', condition:'vehicle_usage IN (Pleasure, Commute 0-3, Commute 4-14, Commute 15+, Occasional Business)', outcome:'Use highest-rate category when multiple apply.' },
  { name:'Policy Term and Minimum Premium',           cat:'Other',       ref:'Rule 3.1', condition:'policy_term = 1 year', outcome:'Minimum annual written premium = $125 combined for all coverages.' },
  { name:'Auto Theft Prevention Authority Fee',       cat:'Other',       ref:'Rule 3.2', condition:'registered_motor_vehicle AND gvw < 26000', outcome:'Charge $1/vehicle annually. Fully earned.' },
  { name:'Mass Marketing Discount',                   cat:'Rating',      ref:'Rule 4.B', condition:'eligible_mass_marketing_program AND company_approved', outcome:'Apply 0.95 factor to BI, PD, MP, OTC, COLL.' },
  { name:'Paid-in-Full Discount',                     cat:'Rating',      ref:'Rule 4.C', condition:'full_premium_paid_at_inception OR paid_in_full_within_90_days', outcome:'Apply 0.90 factor to all coverages.' },
  { name:'Recurring ACH Payment Discount',            cat:'Rating',      ref:'Rule 4.D', condition:'payment_plan != Full AND uses_recurring_ach', outcome:'Apply 0.95 factor to all coverages.' },
  { name:'Motorcycle Safety Course Discount',         cat:'Rating',      ref:'Rule 4.E', condition:'has_msf_certificate', outcome:'Apply 0.90 factor to all motorcycle coverages.' },
  { name:'Secure Storage Discount',                   cat:'Rating',      ref:'Rule 4.F', condition:'stored_in_secure_location (private garage/barn/pole-building/rental-unit/car-condo)', outcome:'Apply 0.75 factor to OTC. Public parking garages do NOT qualify.' },
  { name:'Accident Prevention Course Discount (55+)', cat:'Rating',      ref:'Rule 4.G', condition:'driver_age >= 55 AND completed_pre_approved_course_last_36_months AND NOT court_ordered', outcome:'Apply 0.95 factor to BI, PD, MP, COLL. Remove at next renewal after an at-fault accident; withhold 3 years.' },
  { name:'Policy Changes — Pro-Rata',                 cat:'Other',       ref:'Rule 5',  condition:'policy_amendment_requires_premium_adjustment', outcome:'Compute pro-rata using rates in effect on effective date. Reinstate within 30 days at prior returned premium. Min $5 charge for increases.' },
  { name:'Cancellation — Pro-Rata',                   cat:'Other',       ref:'Rule 6',  condition:'policy_or_coverage_cancelled', outcome:'Return premium pro-rata on 365-day year (except min-earned coverages).' },
  { name:'Payment Plans and Fees',                    cat:'Other',       ref:'Rule 7',  condition:'true', outcome:'Full / Semi-Annual / Quarterly / Monthly available. NSF $25, Late $10, Reinstatement $15, Installment $3.50. All fees fully earned. Late fee waived when reinstatement fee applies.' },
  { name:'UM/UIM Bodily Injury — Mandatory Offer',    cat:'Compliance',  ref:'Rule 8.1.A', condition:'motor_vehicle_registered_or_garaged_in_CO', outcome:'Must offer UM/UIM BI at CO FR minimum under every policy providing BI/PD. Named Insured may reject in writing. Prior rejection carries forward across renewals.' },
  { name:'UM PD Availability',                        cat:'Eligibility', ref:'Rule 8.1.B', condition:'UM_BI_purchased AND Collision_NOT_purchased', outcome:'UM PD available at limit equal to GV/Stated Value. Named Insured may reject in writing.' },
  { name:'Medical Payments — Mandatory Offer',        cat:'Compliance',  ref:'Rule 8.3', condition:'policy_provides_BI_and_PD', outcome:'Must offer $5K MP. Insurer retains proof of rejection 3+ years — else $5K MP presumed in force.' },
  { name:'Custom Features Eligibility',               cat:'Eligibility', ref:'Rule 9.3', condition:'valuation = Guaranteed Value®', outcome:'Up to $10K, counts against GV (not additional). NOT available on Stated Value vehicles.' },
  { name:'Named Driver Exclusion',                    cat:'Eligibility', ref:'Rule 9.7', condition:'insured_signs_exclusion_endorsement', outcome:'Excludes specified driver. Binds all vehicles + renewals until discontinued. Excluded driver\'s record/experience not reflected in premium.' },
  { name:'Vehicle Under Construction Eligibility',    cat:'Eligibility', ref:'Rule 9.10', condition:'active_restoration_or_new_build AND NOT stated_value AND NOT special_build', outcome:'Adds quarterly GV increases + Automotive Tools. At policy expiration, reverts to Decl. GV.' },
  { name:'Cherished Salvage® Eligibility',            cat:'Eligibility', ref:'Rule 9.11', condition:'vehicle_age >= 10 AND NOT stated_value AND NOT special_build', outcome:'Insured retains salvage at total loss / constructive total loss.' },
  { name:'Stated Value Incompatibilities',            cat:'Eligibility', ref:'Rule 9.14', condition:'valuation = Stated Value', outcome:'NOT eligible for Cherished Salvage, Custom Features, Special Build, or VUC.' },
  { name:'Special Build Coverage Eligibility',        cat:'Eligibility', ref:'Rule 9.15', condition:'rebuilding_to_pre_loss_condition AND insured_provides_receipts AND NOT stated_value AND NOT vuc AND NOT cherished_salvage', outcome:'Up to $500,000 beyond GV reimbursement.' },
  { name:'Auto Segment — Off Road Endorsement',       cat:'Coverage',    ref:'Rule 9.16.A', condition:'vehicle_body IN (Truck, Jeep, SUV)', outcome:'Automatically attached at no cost: Auto Tools $250, Spare Parts $1,500, Fire Ext. $250, Offroad Safety Equip. $500.' },
  { name:'Auto Segment — Enjoy The Ride Endorsement', cat:'Coverage',    ref:'Rule 9.16.B', condition:'vehicle_body = Auto AND model_year >= 2000', outcome:'Automatically attached at no cost: Motorsports MP $5K, Autocross $10K ($250 min ded), Finder Fee $500, Branded Merch $750.' },
  { name:'Overlander Endorsement Eligibility',        cat:'Eligibility', ref:'Rule 9.17', condition:'NOT OTC_only_vehicle AND has_liability', outcome:'$25/vehicle bundle: Vacation Site Liability $10K, MP $5K, Camping Accessories $5K, Offroad Recovery $250.' },
  { name:'Rental Reimbursement Eligibility',          cat:'Eligibility', ref:'Rule 9.18', condition:'has_BI AND has_PD', outcome:'Tiered: $50/day/$1500 max @ $50 or $125/day/$3750 max @ $125 per vehicle. Reimbursement requires receipts.' },
  { name:'Driving Record Points — Assignment',        cat:'Rating',      ref:'Rule 10.1.A', condition:'violation_in_prev_3_years AND at_least_one_violation_in_prev_15_months', outcome:'Apply points per table (6 for major, 2-4 for minor). Expires first renewal after conviction is 3 years old.' },
  { name:'At-Fault Accident — Loss History',          cat:'Rating',      ref:'Rule 10.1.B', condition:'driver_50pct_or_more_at_fault OR PD_liability_paid OR COLL_single_vehicle_paid', outcome:'Apply LOSS-1 surcharge. Excludes <$3K losses, lawfully parked, MP/UM/OTC/T&L payouts, reimbursed, rear-ended no-citation, reported hit-and-run, animal/gravel/falling objects, non-listed operator, other-driver cited, emergency response.' },
  { name:'Insurance Score — Application',             cat:'Rating',      ref:'Rule 10.2.A', condition:'true', outcome:'Apply to all vehicles on all policies. Refresh at least every 36 months. One insured-requested re-score per policy term.' },
  { name:'Vehicle Symbol — Application',              cat:'Rating',      ref:'Rule 10.2.B', condition:'vehicle_model_year >= 1980 AND vehicle_type != Motorcycle AND NOT replica_pre_1980 AND vehicle_type != Trailer', outcome:'Apply symbol factor A–F from EP Symbols 04 25.' },
  { name:'Rating Territory — ZIP Assignment',         cat:'Rating',      ref:'Rule 11',    condition:'true', outcome:'Use vehicle garaging ZIP. For new/missing ZIPs: (1) source ZIP if split, (2) one of source ZIPs if combined, else (3) adjacent ZIP with lowest rate.' },
  { name:'Personal Property Blanket Coverage',        cat:'Coverage',    ref:'Rule 13',    condition:'spare_parts_OR_automotive_tools_for_collector_vehicle', outcome:'Eligible for Blanket endorsement. Non-collectible personal property, dealer stock, business property NOT eligible.' },
];

// ============================================================================
// Runtime
// ============================================================================
async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Seed: Drivers Edge Insurance Company — Enthusiast+ (Colorado)');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Target: ${BASE_URL}`);
  console.log(`  Product: ${PRODUCT_ID}`);
  console.log(`  Dry run: ${DRY_RUN}`);
  console.log('');

  // ─── CLEAR: delete every coverage on this product ────────────────────────
  console.log('→ Clearing existing coverages (DELETE /api/coverages/:id)...');
  const existingCov = await req('GET', `/api/coverages?productId=${encodeURIComponent(PRODUCT_ID)}`);
  console.log(`  found ${existingCov.length} existing coverage(s)`);
  for (const c of existingCov) {
    await req('DELETE', `/api/coverages/${c.id}`);
    console.log(`  ✓ deleted ${c.name.padEnd(48)} ${c.id}`);
  }
  console.log('');
  console.log('  NOTE: pricing-steps / rules / forms do not support DELETE on this API.');
  console.log('  New entries will be added alongside any previously-seeded records.');
  console.log('');

  // ─── Data Dictionary ─────────────────────────────────────────────────────
  console.log(`→ Data Dictionary — ${DD.length} fields`);
  for (const d of DD) {
    const body = {
      productId: PRODUCT_ID,
      fieldCode: d.fieldCode,
      name: d.fieldCode,
      label: d.label,
      dataType: d.dataType,
      category: d.category,
      description: d.description,
      values: d.values || null,
      createdAt: NOW, updatedAt: NOW,
    };
    const r = await req('POST', '/api/data-dictionary', body);
    console.log(`  • ${d.category.padEnd(11)} ${d.fieldCode.padEnd(36)} ${r.id || 'ok'}`);
  }
  console.log('');

  // ─── Coverages (roots → subs) ─────────────────────────────────────────────
  console.log(`→ Coverages — ${COVERAGES.length} total (PCM hierarchy)`);
  const idByKey = {};
  const roots = COVERAGES.filter(c => !c.parent);
  const subs  = COVERAGES.filter(c =>  c.parent);

  for (const c of roots) {
    const body = {
      productId: PRODUCT_ID,
      name: c.name, coverageCode: c.code,
      category: c.category, description: c.description,
      formIds: [], limits: c.limits, deductibles: c.deductibles,
      states: CO_ONLY, parentCoverageId: null,
      createdAt: NOW, updatedAt: NOW,
    };
    const r = await req('POST', '/api/coverages', body);
    idByKey[c.key] = r.id;
    console.log(`  • ${c.name.padEnd(56)} ${r.id}`);
  }
  for (const c of subs) {
    const parentId = idByKey[c.parent];
    const body = {
      productId: PRODUCT_ID,
      name: c.name, coverageCode: c.code,
      category: c.category, description: c.description,
      formIds: [], limits: c.limits, deductibles: c.deductibles,
      states: CO_ONLY, parentCoverageId: parentId,
      createdAt: NOW, updatedAt: NOW,
    };
    const r = await req('POST', '/api/coverages', body);
    idByKey[c.key] = r.id;
    console.log(`  └─ ${c.name.padEnd(54)} parent=${parentId.slice(0,14)}…`);
  }
  console.log('');

  // ─── Pricing Steps + Dimensions ──────────────────────────────────────────
  console.log(`→ Pricing Steps — ${PRICING_STEPS.length} (Part A + Part C + Part D + Part E)`);
  const stepDimensions = {
    0:  [{ n:'Coverage',              v:'BI, PD, MP, UM/UIM, UM PD, OTC, COLL',   tc:'coverage' }],
    1:  [{ n:'Driver Age',            v:'<=16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90+', tc:'driver_age' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    2:  [{ n:'Driving Record Points', v:'<=1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14+', tc:'points' },
         { n:'Coverage',              v:'BI, PD, MP, COLL',                        tc:'coverage' }],
    5:  [{ n:'Limit',                 v:'25/50, 50/100, 100/300, 250/500, 300/300, 500/500, 5000, 15000, 25000, 50000, 65000, 100000, 250000, 300000, 500000', tc:'limit' },
         { n:'Coverage',              v:'BI, PD, MP, UM/UIM',                      tc:'coverage' }],
    6:  [{ n:'Coverage Variant',      v:'OTC, OTC Full Glass, Collision',          tc:'ded_variant' },
         { n:'Deductible',            v:'0, 100, 250, 500, 1000, 1500, 2500, 5000, 10000, 20000, 50000, 100000', tc:'deductible' },
         { n:'Vehicle Value Band',    v:'0-9999, 10000-19999, 20000-29999, 30000-39999, 40000-49999, 50000-99999, 100000-149999, 150000-199999, 200000+', tc:'value_band' }],
    7:  [{ n:'Guaranteed Value',      v:'1, 500, 1500, 2500, 3500, 4500, 5500, 6500, 7500, 8500, 9500, 10500, 15500, 20500, 25500, 30500, 40500, 50000, 75000, 100000', tc:'guaranteed_value' },
         { n:'Coverage',              v:'UM PD, OTC, COLL',                        tc:'coverage' }],
    8:  [{ n:'Modified/Stock',        v:'Modified, Stock',                         tc:'is_modified' },
         { n:'Model Year Band',       v:'<=1945, 1946-1969, 1970-1983, 1984-1996, 1997-2000, 2001-2010, 2011-2020+', tc:'year_band' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    9:  [{ n:'Vehicle Type',          v:'Auto, Truck, Motorcycle, Trailer',        tc:'vehicle_type' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    10: [{ n:'Vehicle Attribute',     v:'Custom Import, Custom Cruiser, Supercar', tc:'vehicle_attribute' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    11: [{ n:'Vehicle Symbol',        v:'A, B, C, D, E, F',                        tc:'vehicle_symbol' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    12: [{ n:'Annual Mileage',        v:'<=3500, 3501-5000, 5001+',                tc:'annual_mileage' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    13: [{ n:'Usage',                 v:'Pleasure, Commute 0-3, Commute 4-14, Commute 15+, Occasional Business', tc:'vehicle_usage' },
         { n:'Coverage',              v:'BI, PD, MP, UM PD, OTC, COLL',            tc:'coverage' }],
    15: [{ n:'ZIP Code (Colorado)',   v:Object.keys(T_ZIP).slice(0,30).join(', ') + ', …full table in tableData', tc:'garaging_zip' },
         { n:'Coverage',              v:'BI, PD, MP, OTC, COLL',                   tc:'coverage' }],
    16: [{ n:'Insurance Score Band',  v:'<=520, 521-530, ..., 721-730 (neutral), ..., 941-997, No Hit, Thin File', tc:'insurance_score' },
         { n:'Coverage',              v:'BI, PD, MP, UM/UIM, UM PD, OTC, COLL',    tc:'coverage' }],
    17: [{ n:'Vehicles with Surcharge',v:'1, 2, 3, 4+',                            tc:'vehicles_with_surcharge' },
         { n:'At-Fault Accidents',    v:'0, 1, 2, 3, 4, 5',                        tc:'at_fault_accidents_3yr' }],
    18: [{ n:'Number of Drivers',     v:'1, 2, 3, 4, 5, 6+',                       tc:'number_of_drivers' },
         { n:'Number of Vehicles',    v:'1, 2, 3, 4, 5, 6+',                       tc:'number_of_vehicles' },
         { n:'Coverage',              v:'BI, PD, MP, UM/UIM, UM PD, OTC, COLL',    tc:'coverage' }],
    21: [{ n:'Increased Value',       v:'50%, 100%',                               tc:'special_build_tier' },
         { n:'Coverage',              v:'OTC, COLL',                               tc:'coverage' }],
    38: [{ n:'Value-Added Tier',      v:'Plus, Premium, Ultimate',                 tc:'value_added_tier' }],
    40: [{ n:'Motorsports Tier',      v:'Base, +Autocross, +HPDE, +Autocross+HPDE',tc:'motorsports_tier' }],
    41: [{ n:'Rental Tier',           v:'$50/$1500, $125/$3750',                   tc:'rental_reimbursement_tier' }],
  };

  let dimCount = 0;
  for (const s of PRICING_STEPS) {
    const r = await req('POST', '/api/pricing-steps', s);
    const stepId = r.id;
    console.log(`  • #${String(s.order).padStart(2,'0')} ${(s.stepName).padEnd(46)} [${s.section.split('—')[0].trim()}]`);
    const dims = stepDimensions[s.order] || [];
    for (const d of dims) {
      await req('POST', '/api/items/dimension', {
        productId: PRODUCT_ID, stepId,
        name: d.n, values: d.v, technicalCode: d.tc,
      });
      dimCount++;
    }
  }
  console.log(`  (${dimCount} rating-table dimensions populated via /api/items/dimension)`);
  console.log('');

  // ─── Rules ────────────────────────────────────────────────────────────────
  console.log(`→ Rules — ${RULES.length}`);
  for (const r of RULES) {
    const body = {
      productId: PRODUCT_ID,
      name: r.name,
      ruleCategory: r.cat, ruleType: r.cat,  // avoid `type` field (Cosmos discriminator)
      reference: r.ref, condition: r.condition, outcome: r.outcome,
      proprietary: false, status: 'active', states: CO_ONLY,
      createdAt: NOW, updatedAt: NOW,
    };
    const resp = await req('POST', '/api/rules', body);
    console.log(`  • ${r.cat.padEnd(11)} ${r.name.padEnd(50)} ${r.ref}`);
  }
  console.log('');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Complete.');
  console.log(`    coverages:    ${COVERAGES.length} (${roots.length} root + ${subs.length} sub)`);
  console.log(`    data dict:    ${DD.length}`);
  console.log(`    pricing:      ${PRICING_STEPS.length} steps (with inline tableData)`);
  console.log(`    rules:        ${RULES.length}`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  Open in the UI:');
  console.log(`    ${BASE_URL}/coverage/${PRODUCT_ID}`);
  console.log(`    ${BASE_URL}/pricing/${PRODUCT_ID}`);
  console.log(`    ${BASE_URL}/rules/${PRODUCT_ID}`);
}

main().catch(e => { console.error('\nSEED FAILED:', e.message); process.exit(1); });
