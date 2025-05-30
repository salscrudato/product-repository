# 🚀 Cover Cloud – Developer / Co‑Founder Onboarding

Welcome aboard!  This document gives any engineer or product‑minded co‑founder **everything needed to understand, run, and evolve Cover Cloud in less than 15 minutes.**

---

## 0. Why This Exists  

**Cover Cloud** is a P&C‑insurance product management workbench.  Under the hood it:

| Layer | What We Use | Purpose |
|-------|-------------|---------|
| Front‑end | React 18 (Create‑React‑App) + React‑Router v6 + ✍︎ styled‑components | SPA that admins live in all day |
| Back‑end | Firebase ★ Firestore (NoSQL) ★ Storage ★ Auth  | Zero‑ops data & file layer |
| AI | OpenAI GPT‑4o (via `chat/completions`) | Summaries, chat, rules extraction, coverage diff |
| Parsing | pdf.js in‑browser worker | Turns PDFs → raw text |
| Bundling | CRA + Webpack code‑split | Instant dev boot, automatic chunking |

---

## 1. Local Setup

```bash
# 1. Clone
git clone git@github.com:<org>/cover‑cloud.git
cd cover‑cloud

# 2. Install deps
npm i

# 3. Create local env
cp .env.sample .env.local          # fill in the blanks ✍︎
#   REACT_APP_FIREBASE_API_KEY=...
#   REACT_APP_OPENAI_KEY=...

# 4. Run
npm start                          # http://localhost:3000
```

*Need the Firebase dev project keys? → ping @Sal.*

---

## 2. High‑Level Data Model (Firestore)

```
products (collection)
└─ {productId}
   ├─ name, formNumber, productCode, effectiveDate, formDownloadUrl
   ├─ coverages (sub‑collection)          1‑‑‑n
   │   └─ {coverageId}
   │      • name, coverageCode, category, limits[], deductibles[], states[], parentCoverageId?, formIds[]
   ├─ steps (sub‑collection)              1‑‑‑n
   │   └─ {stepId}
   │      • stepName, coverages[], states[], value, rounding, order, stepType("factor"|"operand")
   └─ versionHistory (sub‑collection)     audit log
forms (collection)                        m‑to‑n with products & coverages                    
└─ {formId}
   • formName, formNumber, productIds[], coverageIds[], downloadUrl
formCoverages (collection)                join table
└─ {linkId}
   • productId, coverageId, formId
```

> **Rules of thumb:**  
> • Coverage names are human‑friendly; *coverageCode* is the immutable identifier.  
> • `formCoverages` is the source‑of‑truth link – the arrays on Coverage/Form are denormalised for speed.  
> • Every destructive action must also write to `versionHistory`.

---

## 3. Codebase Tour

| Path                                    | What lives here                                        |
|-----------------------------------------|--------------------------------------------------------|
| `src/components/`                       | Re‑usable UI atoms (Button, Input, Table…)             |
| `src/ProductHub.js` (≈1.6 kLOC)         | Primary dashboard (search, AI actions, product CRUD)   |
| `src/CoverageScreen.js`                 | Coverage list & hierarchy, limits/deductibles modal    |
| `src/PricingScreen.js`                  | Step builder + Excel import/export                     |
| `src/TableScreen.js`                    | Rating table editor (2‑D dimensions)                   |
| `src/FormsScreen.js`                    | Form repository (PDF upload, link wizard)              |
| `src/ProductBuilder.js`                 | “Wizard” to clone/compose new products                 |
| `functions/` (optional)                 | Cloud Functions (cascade deletes, heavy AI jobs)       |

---

## 4. AI Workflow Cheatsheet

| Feature          | Prompt file / system role                        | API model | Notes |
|------------------|--------------------------------------------------|-----------|-------|
| **Form summary** | `SYSTEM_INSTRUCTIONS` in _ProductHub.js_         | `gpt-4o`  | First 100 k tokens of PDF |
| **Product chat** | Same as above (+ conversational wrapper)         | `gpt-4o`  | Persists per‑product chat log |
| **Rules extract**| `RULES_SYSTEM_PROMPT`                            | `gpt-4o`  | Returns JSON of Product & Rating rules |
| **Form diff**    | `COMPARE_SYSTEM_PROMPT`                          | `gpt-4o`  | Local diff via coverage lists |

All responses are parsed client‑side.  **Store** summaries & rules in Firestore once generated to avoid burning tokens.

---

## 5. Bulk Operations

| Entity      | Export → Excel | Import ← Excel | Key points |
|-------------|----------------|----------------|------------|
| Coverages   | ✔ (`Export XLSX`) | ✔ (merge by `coverageCode`) | Handles hierarchy, 50‑state matrix |
| Pricing Steps| ✔ | ✔ (append) | Rows = factors, “CALCULATION” column holds next operand |
| Forms       | ☐ (TBD) | ✔ (multifile uploader) | Linking to coverages done post‑upload |
| States      | Covered in coverage sheet columns | — | Product‑level state list managed in UI |

---

## 6. Dev Practices

1. **Branch naming**: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.  
2. **Commit msg** *(Conventional Commits)*:  
   ```
   feat(pricing): allow % rounding
   ```
3. **PR checklist**: tests passing, ESLint clean, screenshots for UI.  
4. **Version bump**: update `CHANGELOG` section below via PR.  
5. **Env vars** live in `.env.local` – never commit secrets.

---

## 7. Deploy / Hosting

| Environment | Firebase Project | URL |
|-------------|-----------------|-----|
| **dev**     | `cover‑cloud‑dev` | Automatic on every push to `develop` |
| **prod**    | `cover‑cloud‑prod`| Manual via `npm run deploy` |

CI is GitHub Actions → Firebase Hosting.  See `.github/workflows/deploy.yml`.

---

## 8. Troubleshooting FAQ

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| ⛔ **CORS 403** on PDF GET | Missing storage rules in dev | `firebase deploy --only storage` |
| AI call 400 “context length” | PDF too big | Chunk size & retry in `ProductHub.handleSummary` |
| Duplicate coverage in import | `coverageCode` not unique | Deduplicate in sheet or rename code |

---

## 9. CHANGE LOG (append at top)

| Version | Date (YYYY‑MM‑DD) | Author | Highlights |
|---------|------------------|--------|------------|
| **0.1.0** | 2025‑05‑26 | Sal + ElonBot | Initial onboarding doc, data‑model audit |
| _next_   | — | — | — |

---

Happy shipping! 💜  
_For questions: @Sal (Slack) · `sal@covercloud.ai`_
