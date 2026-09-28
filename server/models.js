import mongoose from "mongoose";

const { Schema, model } = mongoose;
const ref = (m) => ({ type: Schema.Types.ObjectId, ref: m });

export const ROLES = [
  "admin",
  "department_officer",
  "project_manager",
  "site_engineer",
  "quality_inspector",
  "maintenance_engineer",
  "contractor",
  "management",
];

export const ROLE_LABELS = {
  admin: "System Administrator",
  department_officer: "Department Officer",
  project_manager: "Project Manager",
  site_engineer: "Site / Field Engineer",
  quality_inspector: "Quality Inspector",
  maintenance_engineer: "Maintenance Engineer",
  contractor: "Contractor",
  management: "Management / Viewer",
};

export const DEFAULT_PERMISSIONS = {
  admin: [
    "asset.view", "asset.create", "asset.edit", "asset.delete", "asset.advance",
    "project.view", "project.create", "project.edit", "project.delete", "project.advance",
    "lifecycle.view", "lifecycle.create", "lifecycle.edit",
    "inspection.view", "inspection.create", "inspection.edit", "inspection.verify",
    "maintenance.view", "maintenance.create", "maintenance.edit", "maintenance.update", "maintenance.verify", "maintenance.close",
    "document.view", "document.upload", "document.delete",
    "report.view", "user.manage", "role.manage", "audit.view"
  ],
  department_officer: [
    "asset.view", "asset.create", "asset.edit", "asset.advance",
    "project.view", "project.create", "project.edit", "project.advance",
    "lifecycle.view",
    "inspection.view",
    "maintenance.view", "maintenance.create",
    "document.view", "document.upload",
    "report.view", "audit.view"
  ],
  project_manager: [
    "asset.view", "asset.create", "asset.edit", "asset.advance",
    "project.view", "project.edit", "project.advance",
    "lifecycle.view",
    "inspection.view", "inspection.create",
    "maintenance.view", "maintenance.create",
    "document.view", "document.upload",
    "report.view"
  ],
  site_engineer: [
    "asset.view", "asset.edit", "asset.advance",
    "project.view", "project.edit", "project.advance",
    "inspection.view", "inspection.create", "inspection.edit",
    "maintenance.view", "maintenance.create", "maintenance.edit",
    "document.view", "document.upload"
  ],
  quality_inspector: [
    "asset.view",
    "project.view",
    "inspection.view", "inspection.create", "inspection.edit", "inspection.verify",
    "maintenance.view",
    "document.view", "document.upload"
  ],
  maintenance_engineer: [
    "asset.view", "asset.edit", "asset.advance",
    "inspection.view", "inspection.create",
    "maintenance.view", "maintenance.create", "maintenance.edit", "maintenance.verify", "maintenance.close",
    "document.view", "document.upload",
    "report.view"
  ],
  contractor: [
    "asset.view",
    "project.view", "project.edit", "project.advance",
    "maintenance.view", "maintenance.update",
    "document.view", "document.upload"
  ],
  management: [
    "asset.view",
    "project.view",
    "inspection.view",
    "maintenance.view",
    "document.view",
    "report.view", "audit.view"
  ]
};

export const ASSET_TYPES = [
  "Road",
  "Road Section",
  "Pavement",
  "Bridge",
  "Culvert",
  "Drainage",
  "Signboards",
  "Streetlights",
  "Government Building",
  "Building Block",
  "Electrical System",
  "Plumbing",
  "HVAC",
  "Lift System",
  "Fire Safety"
];

export const ASSET_CATEGORIES = ["Road", "Building"];
export const ASSET_CONDITIONS = ["Good", "Fair", "Poor", "Critical"];
export const ASSET_STATUSES = ["Planning", "Design", "Under Construction", "Operational", "Under Maintenance", "Decommissioned"];

// 1. Administrative Jurisdiction Node: State > Circle > Division > SubDivision
export const Node = model("Node", new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  level: { type: String, enum: ["State", "Circle", "Division", "SubDivision"], required: true },
  parent: ref("Node"),
  state: { type: String, default: "Gujarat" }
}, { timestamps: true }));

// 2. User Model with exact requested roles
export const User = model("User", new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ROLES,
    required: true
  },
  designation: { type: String, default: "" },
  jurisdictionNode: ref("Node"), // Geographical administrative scope restriction
  assignedProjects: [ref("Project")], // Explicitly allocated projects
  contractorCompany: { type: String, default: "" },
  phone: { type: String, default: "" },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" }
}, { timestamps: true }));

// 3. Dynamic Role Permissions (Configurable by Admin)
export const RolePermission = model("RolePermission", new Schema({
  role: { type: String, enum: ROLES, unique: true, required: true },
  permissions: [{ type: String }]
}, { timestamps: true }));

// 4. Configurable Lifecycle Template
const stageDefinitionSchema = new Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  order: { type: Number, required: true },
  responsibleRoles: [{ type: String, enum: ROLES }],
  requiredActions: [{ type: String }],
  requiredDocuments: [{ type: String }],
  requiresInspectionVerification: { type: Boolean, default: false },
  allowsHandoverToAsset: { type: Boolean, default: false }
}, { _id: false });

export const LifecycleTemplate = model("LifecycleTemplate", new Schema({
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: ["Road", "Building", "Bridge", "Maintenance"], required: true },
  description: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
  stages: [stageDefinitionSchema]
}, { timestamps: true }));

// Stage Instance Schema for Projects & Assets
const stageInstanceSchema = new Schema({
  key: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
  startedAt: Date,
  completedAt: Date,
  completedBy: String,
  spend: { type: Number, default: 0 },
  remarks: { type: String, default: "" },
  documents: [{ type: String }],
  responsibleRoles: [{ type: String }],
  assignedUserName: { type: String, default: "" }
}, { _id: false });

const historyItemSchema = new Schema({
  at: { type: Date, default: Date.now },
  by: String,
  role: String,
  fromStage: String,
  toStage: String,
  remarks: String,
  spend: Number
}, { _id: false });

// Maintainable Sub-Component Schema
const subComponentSchema = new Schema({
  componentId: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // Pavement, Drainage, Culvert, Bridge, Streetlights, HVAC, Lifts, Fire Safety, etc.
  chainage: { type: String, default: "" },
  condition: { type: String, enum: ASSET_CONDITIONS, default: "Good" },
  status: { type: String, default: "Operational" },
  maintenanceRequired: { type: Boolean, default: false },
  lastInspectionDate: Date,
  lastMaintenanceDate: Date,
  specs: { type: Schema.Types.Mixed, default: {} }
}, { _id: true, timestamps: true });

// 5. Project (Work planned/executed to create or modify infrastructure)
export const Project = model("Project", new Schema({
  projectId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ["Road", "Building", "Bridge", "Maintenance"], required: true },
  subDivision: { ...ref("Node"), required: true },
  projectManager: ref("User"),
  siteEngineer: ref("User"),
  qualityInspector: ref("User"),
  maintenanceEngineer: ref("User"),
  contractor: ref("User"),
  contractorCompany: { type: String, default: "" },
  sanctionedBudget: { type: Number, default: 0 }, // In ₹ Crores
  spentAmount: { type: Number, default: 0 },
  targetCompletionDate: Date,
  currentStageKey: { type: String, required: true },
  currentStageName: { type: String, required: true },
  progressPercentage: { type: Number, default: 0 },
  lifecycleTemplate: ref("LifecycleTemplate"),
  stages: [stageInstanceSchema],
  history: [historyItemSchema],
  createdAsset: ref("Asset"), // Linked when Handover stage is completed
  attributes: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true }));

// 6. Physical Asset (Standalone physical infrastructure managed post-handover/operational)
export const Asset = model("Asset", new Schema({
  assetId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ASSET_TYPES, required: true },
  category: { type: String, enum: ASSET_CATEGORIES, required: true },
  parentAsset: ref("Asset"), // Hierarchy link for child assets
  subDivision: { ...ref("Node"), required: true },
  location: {
    address: { type: String, default: "" },
    chainage: { type: String, default: "" }, // e.g. "km 12+400 to 28+600"
    lat: { type: Number, default: 22.3094 },
    lng: { type: Number, default: 72.1362 }
  },
  status: { type: String, enum: ASSET_STATUSES, default: "Operational" },
  condition: { type: String, enum: ASSET_CONDITIONS, default: "Good" },
  sanctionedCost: { type: Number, default: 0 }, // In ₹ Crores
  constructionDate: Date,
  originatingProject: ref("Project"),
  responsibleOffice: { type: String, default: "Roads & Buildings Dept, Gujarat" },
  attributes: { type: Schema.Types.Mixed, default: {} },

  // People Associated
  projectManager: ref("User"),
  siteEngineer: ref("User"),
  qualityInspector: ref("User"),
  maintenanceEngineer: ref("User"),
  contractor: ref("User"),
  contractorCompany: { type: String, default: "" },

  // Direct Configurable Lifecycle Engine for Assets
  currentStageKey: { type: String, default: "operation_maintenance" },
  currentStageName: { type: String, default: "Operation & Maintenance" },
  lifecycleTemplate: ref("LifecycleTemplate"),
  stages: [stageInstanceSchema],
  history: [historyItemSchema],

  // Maintainable Sub-components with independent conditions & maintenance records
  components: [subComponentSchema],

  lastInspectionDate: Date,
  lastInspectedBy: String,
  maintenanceHistory: [{
    at: { type: Date, default: Date.now },
    workOrderId: String,
    componentId: String,
    componentName: String,
    title: String,
    cost: Number,
    repairedBy: String,
    verifiedBy: String,
    summary: String
  }]
}, { timestamps: true }));

// 7. Inspection & Defect Subsystem
const defectSchema = new Schema({
  description: { type: String, required: true },
  severity: { type: String, enum: ["Low", "Medium", "High", "Critical"], default: "Medium" },
  locationSnippet: { type: String, default: "" },
  photoUrl: { type: String, default: "" },
  componentId: { type: String, default: "" },
  componentName: { type: String, default: "" },
  status: { type: String, enum: ["Open", "Work Order Issued", "Resolved"], default: "Open" }
}, { _id: false });

export const Inspection = model("Inspection", new Schema({
  inspectionId: { type: String, unique: true, required: true },
  asset: { ...ref("Asset"), required: true },
  componentId: { type: String, default: "" },
  componentName: { type: String, default: "" },
  project: ref("Project"),
  inspector: ref("User"),
  inspectorName: { type: String, required: true },
  inspectionDate: { type: Date, default: Date.now },
  type: {
    type: String,
    enum: ["Routine", "Quality Control", "Safety", "Post-Monsoon", "Handover", "Maintenance Verification"],
    default: "Routine"
  },
  overallCondition: { type: String, enum: ASSET_CONDITIONS, required: true },
  defects: [defectSchema],
  notes: { type: String, default: "" },
  verificationStatus: {
    type: String,
    enum: ["Submitted", "Verified", "Rejected"],
    default: "Submitted"
  },
  verifiedBy: String,
  verificationRemarks: String
}, { timestamps: true }));

// 8. Maintenance Requests & Work Orders
export const WorkOrder = model("WorkOrder", new Schema({
  workOrderId: { type: String, unique: true, required: true },
  asset: { ...ref("Asset"), required: true },
  componentId: { type: String, default: "" },
  componentName: { type: String, default: "" },
  inspection: ref("Inspection"),
  defectIndex: { type: Number, default: -1 },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  priority: { type: String, enum: ["Routine", "Urgent", "Emergency"], default: "Routine" },
  status: {
    type: String,
    enum: ["Issued", "In Progress", "Completed", "Verified & Closed"],
    default: "Issued"
  },
  assignedContractor: ref("User"),
  contractorCompany: { type: String, default: "" },
  assignedEngineer: ref("User"),
  estimatedCost: { type: Number, default: 0 }, // In ₹ Lakhs
  actualCost: { type: Number, default: 0 },
  issuedDate: { type: Date, default: Date.now },
  targetCompletionDate: Date,
  completionDate: Date,
  repairDetails: { type: String, default: "" },
  beforePhotoUrl: { type: String, default: "" },
  afterPhotoUrl: { type: String, default: "" },
  verifiedBy: String,
  verifiedDate: Date,
  engineerRemarks: { type: String, default: "" }
}, { timestamps: true }));

// 9. Contextual Documents
export const Document = model("Document", new Schema({
  docId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  category: {
    type: String,
    enum: [
      "DPR", "Design Drawing", "Technical Sanction", "Tender / BOQ",
      "Contract Agreement", "Inspection Report", "Handover Certificate",
      "Work Order", "As-Built Drawing", "Site Photo"
    ],
    required: true
  },
  fileUrl: { type: String, default: "" },
  relatedTo: {
    entityType: { type: String, enum: ["Project", "Asset", "Inspection", "WorkOrder"], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true }
  },
  stageKey: { type: String, default: "" },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true }));

// 10. Audit Trail
export const Audit = model("Audit", new Schema({
  at: { type: Date, default: Date.now },
  userId: ref("User"),
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  details: { type: Schema.Types.Mixed }
}, { timestamps: true }));

// 11. Counters for sequence generation
export const Counter = model("Counter", new Schema({
  _id: { type: String, required: true },
  n: { type: Number, default: 0 }
}));
