# Gujarat Roads & Buildings Department · Infrastructure Asset Management System (IAMS)

An enterprise-grade, responsive Infrastructure Asset Management System (IAMS) built with the **MERN (MongoDB, Express, React, Node.js)** stack for a State Government Roads & Buildings Department (Gujarat R&B).

Designed for physical infrastructure assets (Roads, Bridges, Culverts, Drainage, Streetlights, Government Buildings, Electrical Substations, HVAC, Elevator Banks, Fire Safety Networks) across their complete life cycle.

---

## 🏛️ Key Capabilities & Architectural Pillars

### 1. Prototype User Switcher (No Passwords Required)
Per prototype specifications, the username/password login screen is replaced with an instantaneous **Prototype User Switcher** in the top navigation header:
- **Rajesh Mehta** — Chief Engineer & System Administrator (`admin`)
- **Anita Sharma** — Superintending Engineer, Surat Circle (`department_officer`)
- **Vikram Desai** — Executive Engineer (Projects), Ahmedabad (`project_manager`)
- **Prakash Patel** — Deputy Executive Engineer, Sanand & Dholera (`site_engineer`)
- **Kirit Solanki** — Executive Quality Auditor, State Vigilance (`quality_inspector`)
- **Snehal Joshi** — Assistant Executive Engineer (Asset Maintenance) (`maintenance_engineer`)
- **Ajay Patel** — Project Director, L&T Infrastructure Ltd (`contractor`)
- **Dharmesh Shah** — Managing Director, Shree Infra Projects Ltd (`contractor`)
- **Hasmukh Shah, IAS** — Principal Secretary, R&B Dept, Gandhinagar (`management`)

Switching the user dynamically updates:
- Role & designation badges
- Action-based permissions
- Administrative jurisdiction scope (State → Circle → Division → SubDivision)
- Assigned projects & work orders
- Tailored dashboard metrics

---

### 2. Triple-Layer Access Control (RBAC + Scope + Assignment)
Access is enforced at both Frontend UI and Backend APIs:
1. **Action-Based Permission**: `asset.view`, `asset.create`, `project.advance`, `inspection.create`, `maintenance.verify`, `user.manage`, etc.
2. **Administrative Scope / Jurisdiction**: Users only access records within their permitted Circle, Division, or SubDivision (unless State-level authority).
3. **Explicit Assignment**: Contractors only access projects and work orders specifically allocated to their company.

---

### 3. Clear Distinction: Project vs. Asset
- **Project**: Work planned/executed to construct or rehabilitate infrastructure with its own budget, contractor, and configurable lifecycle.
- **Physical Asset**: First-class, standalone physical infrastructure managed post-commissioning.
  - **Standalone Access**: Assets are accessible directly from the top-level **Asset Inventory** without needing to enter a project!
  - **Component Hierarchy**:
    - **Roads**: Road → Road Section → Pavement / Bridges / Culverts / Drainage / Streetlights.
    - **Buildings**: Government Building → Building Block → HVAC / Lifts / Fire Safety / Electrical.
- **Handover Transition**: When a project completes its Handover stage, the system automatically activates and links the official physical **Asset** record in the state inventory.

---

### 4. Configurable Lifecycle Engine & Lifecycle Builder
- Baseline lifecycle templates stored as data in MongoDB:
  - Standard Road Project Lifecycle
  - Standard Government Building Lifecycle
  - Bridge & Flyover Standard
  - Maintenance & Rehabilitation Standard
- **Lifecycle Builder**:
  - Authorized officers (Admin, Officer) can add, remove, rename, and reorder stages.
  - Configure responsible roles, required actions, documents, and handover triggers per stage.
  - Read-only protection for normal users (e.g. Contractor or Site Engineer cannot edit lifecycle definitions).
- **Immutable Lifecycle History**:
  - Every stage transition records: Actor, Role, Timestamp, Spend (₹ Cr), Remarks, and Document Attachments.

---

### 5. Closed-Loop Maintenance Workflow
1. **Inspection Audit**: Field Engineer / Quality Inspector logs an inspection on an asset and tags specific defects with severity (Critical, High, Medium, Low) and location.
2. **Work Order Dispatch**: Maintenance Engineer creates a Work Order linked to the asset & defect, assigning an EPC Contractor.
3. **Contractor Progress**: Contractor updates repair progress, actual cost, before/after photos.
4. **Engineer Verification**: Maintenance Engineer inspects the site, signs off, and closes the work order.
5. **Automatic Asset Update**: The system automatically restores the Asset's condition (e.g., from Poor to Good) and logs the repair in the permanent maintenance ledger.

---

### 6. Interactive GIS Asset Map
- Interactive Leaflet mapping centered on Gujarat.
- Markers for roads, bridges, and buildings with color-coded condition indicators (Green: Good, Amber: Fair, Red: Poor/Critical).
- Clickable popup with asset specs and one-click navigation to the asset profile.

---

### 7. Admin User & Role Management
- Admin module to create new departmental users.
- Allocate administrative jurisdiction (Circle / Division / SubDivision).
- Explicitly allocate projects to contractors and project managers.
- Interactive Role Permissions Matrix editor allowing granular action adjustments.

---

## 🚀 Running Locally

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017/iams` (or set `MONGO_URI` in `.env`)

### 1. Seed Database
Populate Gujarat R&B baseline dataset (hierarchy, users, projects, standalone assets, defects, work orders):
```bash
cd server
node seed.js
```

### 2. Start Backend API
```bash
cd server
npm start
# Server runs on http://localhost:5000
```

### 3. Start Frontend Client
```bash
cd client
npm run dev
# Client runs on http://localhost:5173
```

### 4. Run Automated Backend Acceptance Tests
```bash
cd server
node test-flow.js
```

---

## ☁️ Vercel Deployment

This repository is pre-configured for one-click deployment on **Vercel**:
- `vercel.json` routes `/api/*` to the serverless Express handler in `api/index.js` and serves the static Vite client build from `client/dist`.
- `server/db.js` caches MongoDB connections across serverless function invocations.

### Deployment Steps:
1. Push repository to GitHub.
2. Import project in Vercel.
3. Set Environment Variable in Vercel Project Settings:
   - `MONGO_URI`: Your MongoDB Atlas connection string (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/iams?retryWrites=true&w=majority`)
4. Deploy!
5. After deployment, trigger the seed endpoint or click **"Reset Data"** in the top header to initialize the baseline Gujarat R&B dataset.
