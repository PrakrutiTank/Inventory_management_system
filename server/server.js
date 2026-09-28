import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import {
  User, Node, RolePermission, LifecycleTemplate,
  Project, Asset, Inspection, WorkOrder, Document,
  Counter, Audit, DEFAULT_PERMISSIONS, ROLES
} from "./models.js";
import { runSeed } from "./seed.js";

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"]
}));
app.use(express.json());

// Normalizer: ensure req.url has /api prefix for Express routes when invoked via Vercel serverless rewrites
app.use((req, res, next) => {
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});

// Deployment Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    system: "Gujarat R&B Infrastructure Asset Management System",
    version: "2.0.0",
    environment: process.env.VERCEL ? "vercel-serverless" : "standalone-node",
    timestamp: new Date().toISOString()
  });
});

// Helper for unique ID generation
async function getNextId(prefix, counterKey, pad = 5) {
  const counter = await Counter.findByIdAndUpdate(
    counterKey,
    { $inc: { n: 1 } },
    { upsert: true, new: true }
  );
  return `${prefix}-${String(counter.n).padStart(pad, "0")}`;
}

// Audit logger helper
async function logAudit(req, action, entityType, entityId, details = {}) {
  try {
    await Audit.create({
      userId: req.user?._id,
      userName: req.user?.name || "System",
      userRole: req.user?.role || "System",
      action,
      entityType,
      entityId,
      details
    });
  } catch (err) {
    console.error("Audit log failed:", err.message);
  }
}

// Error handling wrapper
const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("API Error:", err);
    res.status(err.status || 400).json({ error: err.message || "An error occurred" });
  });
};

// -------------------------------------------------------------
// USER CONTEXT & ACCESS CONTROL MIDDLEWARE
// -------------------------------------------------------------

async function extractUser(req, res, next) {
  try {
    await connectDB();

    // Auto-seed if database is empty (e.g. freshly connected MongoDB Atlas cluster on Vercel)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Empty database detected. Auto-seeding Gujarat R&B baseline dataset...");
      await runSeed();
    }

    const userId = req.headers["x-user-id"] || req.query.userId;
    
    let user = null;
    if (userId) {
      try {
        user = await User.findById(userId).populate("jurisdictionNode");
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      // Fallback gracefully to admin if no user specified or if client ID is stale (e.g. post-reseed)
      user = await User.findOne({ role: "admin" }).populate("jurisdictionNode");
      if (!user) {
        user = await User.findOne().populate("jurisdictionNode");
      }
    }

    if (!user) {
      return res.status(401).json({ error: "No users found in database. Please run seed." });
    }

    req.user = user;

    const rolePerm = await RolePermission.findOne({ role: req.user.role });
    req.permissions = rolePerm ? rolePerm.permissions : (DEFAULT_PERMISSIONS[req.user.role] || []);
    next();
  } catch (err) {
    res.status(500).json({ error: "Database authentication error: " + err.message });
  }
}

function requirePerm(...neededPermissions) {
  return (req, res, next) => {
    if (req.user?.role === "admin") return next(); // Administrator has full access

    const hasPerm = neededPermissions.some((p) => req.permissions.includes(p));
    if (!hasPerm) {
      return res.status(403).json({
        error: `Permission Denied: Your role '${req.user.role}' lacks required permission: [${neededPermissions.join(", ")}]`
      });
    }
    next();
  };
}

async function getDescendantNodeIds(nodeId) {
  if (!nodeId) return null;
  const targetNode = await Node.findById(nodeId);
  if (!targetNode || targetNode.level === "State") {
    return null; // State level has access to all nodes
  }

  const allNodes = await Node.find().lean();
  const queue = [String(nodeId)];
  const result = [String(nodeId)];

  while (queue.length > 0) {
    const cur = queue.shift();
    const children = allNodes.filter((n) => String(n.parent) === cur);
    for (const child of children) {
      queue.push(String(child._id));
      result.push(String(child._id));
    }
  }

  return result;
}

async function verifyJurisdictionScope(user, subDivisionId) {
  if (user.role === "admin" || user.role === "management") return true;
  if (!user.jurisdictionNode) return true;

  const allowedNodeIds = await getDescendantNodeIds(user.jurisdictionNode._id || user.jurisdictionNode);
  if (!allowedNodeIds) return true;

  return allowedNodeIds.includes(String(subDivisionId));
}

// -------------------------------------------------------------
// ROUTES
// -------------------------------------------------------------

// 1. Prototype User Switcher & User Management
app.get("/api/users", extractUser, wrap(async (req, res) => {
  const users = await User.find()
    .populate("jurisdictionNode", "name level code")
    .populate("assignedProjects", "projectId name")
    .sort({ role: 1, name: 1 })
    .lean();
  res.json(users);
}));

app.get("/api/users/current", extractUser, wrap(async (req, res) => {
  res.json({
    user: req.user,
    permissions: req.permissions
  });
}));

app.get("/api/users/:id", extractUser, wrap(async (req, res) => {
  let user = null;
  // Support both ObjectId and email/name query
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    user = await User.findById(req.params.id)
      .populate("jurisdictionNode", "name level code parent")
      .populate("assignedProjects", "projectId name category currentStageName progressPercentage sanctionedBudget")
      .lean();
  }
  
  if (!user) {
    user = await User.findOne({
      $or: [
        { email: new RegExp("^" + req.params.id + "$", "i") },
        { name: new RegExp("^" + req.params.id + "$", "i") }
      ]
    })
      .populate("jurisdictionNode", "name level code parent")
      .populate("assignedProjects", "projectId name category currentStageName progressPercentage sanctionedBudget")
      .lean();
  }

  if (!user) return res.status(404).json({ error: "User not found" });

  const workOrders = await WorkOrder.find({
    $or: [{ assignedContractor: user._id }, { assignedEngineer: user._id }]
  })
    .populate("asset", "assetId name condition")
    .sort({ issuedDate: -1 })
    .lean();

  const associatedAssets = await Asset.find({
    $or: [
      { projectManager: user._id },
      { siteEngineer: user._id },
      { qualityInspector: user._id },
      { maintenanceEngineer: user._id },
      { contractor: user._id }
    ]
  })
    .select("assetId name type condition status currentStageName")
    .lean();

  res.json({
    user,
    workOrders,
    associatedAssets
  });
}));

app.post("/api/users", extractUser, requirePerm("user.manage"), wrap(async (req, res) => {
  const { name, email, role, designation, jurisdictionNode, contractorCompany, phone } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ error: "Name, email, and role are required." });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  const newUser = await User.create({
    name,
    email,
    role,
    designation,
    jurisdictionNode: jurisdictionNode || null,
    contractorCompany: contractorCompany || "",
    phone: phone || ""
  });

  await logAudit(req, "User Created", "User", newUser._id.toString(), { name, email, role });
  res.status(201).json({ user: newUser, message: `✓ User '${name}' registered successfully as ${role}` });
}));

app.put("/api/users/:id", extractUser, requirePerm("user.manage"), wrap(async (req, res) => {
  const { role, designation, jurisdictionNode, assignedProjects, contractorCompany, phone, status } = req.body;
  
  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      ...(role && { role }),
      ...(designation !== undefined && { designation }),
      ...(jurisdictionNode !== undefined && { jurisdictionNode: jurisdictionNode || null }),
      ...(assignedProjects && { assignedProjects }),
      ...(contractorCompany !== undefined && { contractorCompany }),
      ...(phone !== undefined && { phone }),
      ...(status && { status })
    },
    { new: true }
  ).populate("jurisdictionNode", "name level code").populate("assignedProjects", "projectId name");

  await logAudit(req, "User Updated / Allocated", "User", req.params.id, { role, jurisdictionNode, assignedProjects });
  res.json({ user: updated, message: `✓ User allocation updated for ${updated.name}` });
}));

// 2. Role Permissions Management
app.get("/api/roles/permissions", extractUser, wrap(async (req, res) => {
  const perms = await RolePermission.find().lean();
  res.json(perms);
}));

app.put("/api/roles/permissions/:role", extractUser, requirePerm("role.manage"), wrap(async (req, res) => {
  const { role } = req.params;
  const { permissions } = req.body;
  
  const updated = await RolePermission.findOneAndUpdate(
    { role },
    { permissions },
    { upsert: true, new: true }
  );

  await logAudit(req, "Role Permissions Updated", "RolePermission", role, { permissions });
  res.json({ rolePermission: updated, message: `✓ Permissions for role '${role}' updated successfully` });
}));

// 3. Administrative Hierarchy Nodes
app.get("/api/hierarchy", extractUser, wrap(async (req, res) => {
  const nodes = await Node.find().sort({ level: 1, name: 1 }).lean();
  res.json(nodes);
}));

// 4. Configurable Lifecycle Templates
app.get("/api/lifecycle-templates", extractUser, wrap(async (req, res) => {
  const templates = await LifecycleTemplate.find().sort({ category: 1, name: 1 }).lean();
  res.json(templates);
}));

app.post("/api/lifecycle-templates", extractUser, requirePerm("lifecycle.create"), wrap(async (req, res) => {
  const tpl = await LifecycleTemplate.create(req.body);
  await logAudit(req, "Lifecycle Template Created", "LifecycleTemplate", tpl._id.toString(), { name: tpl.name });
  res.status(201).json({ template: tpl, message: `✓ Lifecycle template '${tpl.name}' created successfully` });
}));

app.put("/api/lifecycle-templates/:id", extractUser, requirePerm("lifecycle.edit"), wrap(async (req, res) => {
  const { name, category, description, stages } = req.body;
  const before = await LifecycleTemplate.findById(req.params.id);
  
  const updated = await LifecycleTemplate.findByIdAndUpdate(
    req.params.id,
    { name, category, description, stages },
    { new: true }
  );

  await logAudit(req, "Lifecycle Template Modified", "LifecycleTemplate", req.params.id, {
    beforeStages: before?.stages?.map((s) => s.name),
    afterStages: updated.stages?.map((s) => s.name)
  });
  res.json({ template: updated, message: `✓ Lifecycle template '${updated.name}' updated successfully` });
}));

// 5. Projects
app.get("/api/projects", extractUser, requirePerm("project.view"), wrap(async (req, res) => {
  const query = {};
  
  if (req.user.role !== "admin" && req.user.role !== "management" && req.user.jurisdictionNode) {
    const allowedNodeIds = await getDescendantNodeIds(req.user.jurisdictionNode._id || req.user.jurisdictionNode);
    if (allowedNodeIds) query.subDivision = { $in: allowedNodeIds };
  }

  if (req.user.role === "contractor") {
    query.$or = [
      { contractor: req.user._id },
      { _id: { $in: req.user.assignedProjects || [] } }
    ];
  }

  if (req.query.category) query.category = req.query.category;
  if (req.query.stage) query.currentStageKey = req.query.stage;
  if (req.query.q) {
    query.$or = [
      { name: new RegExp(req.query.q, "i") },
      { projectId: new RegExp(req.query.q, "i") }
    ];
  }

  const projects = await Project.find(query)
    .populate("subDivision", "name level code")
    .populate("projectManager", "name email phone designation")
    .populate("siteEngineer", "name email phone designation")
    .populate("qualityInspector", "name email phone designation")
    .populate("maintenanceEngineer", "name email phone designation")
    .populate("contractor", "name email contractorCompany phone")
    .populate("lifecycleTemplate", "name stages")
    .sort({ createdAt: -1 })
    .lean();

  res.json(projects);
}));

app.get("/api/projects/:id", extractUser, requirePerm("project.view"), wrap(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("subDivision", "name level code")
    .populate("projectManager", "name email phone designation")
    .populate("siteEngineer", "name email phone designation")
    .populate("qualityInspector", "name email phone designation")
    .populate("maintenanceEngineer", "name email phone designation")
    .populate("contractor", "name email contractorCompany phone")
    .populate("lifecycleTemplate")
    .populate("createdAsset", "assetId name condition status");

  if (!project) return res.status(404).json({ error: "Project not found" });

  if (req.user.role === "contractor") {
    const isAssigned = String(project.contractor?._id) === String(req.user._id) ||
      (req.user.assignedProjects || []).some((p) => String(p) === String(project._id));
    if (!isAssigned) {
      return res.status(403).json({ error: "Access Denied: You are not assigned to this project." });
    }
  }

  res.json(project);
}));

app.post("/api/projects", extractUser, requirePerm("project.create"), wrap(async (req, res) => {
  const { name, category, subDivision, projectManager, contractor, sanctionedBudget, targetCompletionDate, templateId } = req.body;
  
  if (!name || !category || !subDivision) {
    return res.status(400).json({ error: "Project name, category, and sub-division are required." });
  }

  const inScope = await verifyJurisdictionScope(req.user, subDivision);
  if (!inScope) {
    return res.status(403).json({ error: "Access Denied: Sub-Division is outside your administrative jurisdiction." });
  }

  const subDiv = await Node.findById(subDivision);
  const template = templateId 
    ? await LifecycleTemplate.findById(templateId)
    : await LifecycleTemplate.findOne({ category, isDefault: true }) || await LifecycleTemplate.findOne();

  if (!template || !template.stages.length) {
    return res.status(400).json({ error: "Valid lifecycle template with stages is required." });
  }

  const projectId = await getNextId(`PRJ-${subDiv?.code || "GUJ"}`, "project", 4);
  const firstStage = template.stages[0];

  const stages = template.stages.map((st, idx) => ({
    key: st.key,
    name: st.name,
    status: idx === 0 ? "In Progress" : "Pending",
    startedAt: idx === 0 ? new Date() : null,
    spend: 0,
    remarks: idx === 0 ? "Project initiated" : "",
    documents: [],
    responsibleRoles: st.responsibleRoles || [],
    assignedUserName: ""
  }));

  const project = await Project.create({
    projectId,
    name,
    category,
    subDivision,
    projectManager: projectManager || req.user._id,
    contractor: contractor || null,
    contractorCompany: req.body.contractorCompany || "",
    sanctionedBudget: Number(sanctionedBudget) || 0,
    spentAmount: 0,
    targetCompletionDate: targetCompletionDate || null,
    currentStageKey: firstStage.key,
    currentStageName: firstStage.name,
    progressPercentage: 5,
    lifecycleTemplate: template._id,
    stages,
    history: [{
      at: new Date(),
      by: req.user.name,
      role: req.user.role,
      fromStage: "–",
      toStage: firstStage.name,
      remarks: "Project created and lifecycle initiated",
      spend: 0
    }]
  });

  if (projectManager) {
    await User.findByIdAndUpdate(projectManager, { $addToSet: { assignedProjects: project._id } });
  }
  if (contractor) {
    await User.findByIdAndUpdate(contractor, { $addToSet: { assignedProjects: project._id } });
  }

  await logAudit(req, "Project Created", "Project", project.projectId, { name, budget: sanctionedBudget });
  res.status(201).json({ project, message: `✓ Project ${project.projectId} created successfully` });
}));

app.post("/api/projects/:id/advance", extractUser, requirePerm("project.advance"), wrap(async (req, res) => {
  const { spend = 0, remarks = "", docTitle = "" } = req.body;
  const project = await Project.findById(req.params.id).populate("lifecycleTemplate");
  if (!project) return res.status(404).json({ error: "Project not found" });

  const template = project.lifecycleTemplate;
  const curIdx = template.stages.findIndex((s) => s.key === project.currentStageKey);
  const curStageDef = template.stages[curIdx];

  if (req.user.role !== "admin") {
    if (curStageDef?.responsibleRoles?.length && !curStageDef.responsibleRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Role '${req.user.role}' is not authorized to complete '${curStageDef.name}'. Authorized: [${curStageDef.responsibleRoles.join(", ")}]`
      });
    }
  }

  if (curIdx >= template.stages.length - 1) {
    return res.status(400).json({ error: "Project lifecycle has already reached the final stage." });
  }

  const nextStageDef = template.stages[curIdx + 1];

  const currentStageInst = project.stages.find((s) => s.key === project.currentStageKey);
  if (currentStageInst) {
    currentStageInst.status = "Completed";
    currentStageInst.completedAt = new Date();
    currentStageInst.completedBy = `${req.user.name} (${req.user.role})`;
    currentStageInst.spend = (currentStageInst.spend || 0) + Number(spend || 0);
    currentStageInst.remarks = remarks || currentStageInst.remarks;
    if (docTitle) currentStageInst.documents.push(docTitle);
  }

  const nextStageInst = project.stages.find((s) => s.key === nextStageDef.key);
  if (nextStageInst) {
    nextStageInst.status = "In Progress";
    nextStageInst.startedAt = new Date();
  }

  const prevStageName = project.currentStageName;
  project.currentStageKey = nextStageDef.key;
  project.currentStageName = nextStageDef.name;
  project.spentAmount = (project.spentAmount || 0) + Number(spend || 0);
  project.progressPercentage = Math.min(100, Math.round(((curIdx + 1) / template.stages.length) * 100));

  project.history.unshift({
    at: new Date(),
    by: req.user.name,
    role: req.user.role,
    fromStage: prevStageName,
    toStage: nextStageDef.name,
    remarks: remarks || "Stage successfully completed",
    spend: Number(spend || 0)
  });

  if (curStageDef.allowsHandoverToAsset || curStageDef.key === "handover") {
    if (!project.createdAsset) {
      const subDiv = await Node.findById(project.subDivision);
      const prefix = project.category === "Road" ? "RD" : project.category === "Building" ? "BL" : "BR";
      const assetId = await getNextId(`${prefix}-${subDiv?.code || "GUJ"}`, "asset", 5);

      const newAsset = await Asset.create({
        assetId,
        name: project.name,
        type: project.category === "Road" ? "Road" : project.category === "Building" ? "Government Building" : "Bridge",
        category: project.category === "Building" ? "Building" : "Road",
        subDivision: project.subDivision,
        sanctionedCost: project.sanctionedBudget,
        status: "Operational",
        condition: "Good",
        constructionDate: new Date(),
        contractor: project.contractor,
        contractorCompany: project.contractorCompany || "",
        projectManager: project.projectManager,
        siteEngineer: project.siteEngineer,
        originatingProject: project._id,
        currentStageKey: "operation_maintenance",
        currentStageName: "Operation & Maintenance",
        stages: template.stages.map((st, i) => ({
          key: st.key,
          name: st.name,
          status: i <= curIdx + 1 ? "Completed" : "Pending",
          startedAt: new Date(),
          completedAt: i <= curIdx ? new Date() : null,
          completedBy: req.user.name,
          responsibleRoles: st.responsibleRoles || []
        })),
        history: [{
          at: new Date(),
          by: req.user.name,
          role: req.user.role,
          fromStage: "Handover",
          toStage: "Operation & Maintenance",
          remarks: "Commissioned as operational physical infrastructure"
        }]
      });

      project.createdAsset = newAsset._id;
      await logAudit(req, "Physical Asset Activated via Handover", "Asset", newAsset.assetId, { projectId: project.projectId });
    }
  }

  await project.save();
  await logAudit(req, "Project Stage Advanced", "Project", project.projectId, { from: prevStageName, to: nextStageDef.name, spend });
  
  res.json({
    project,
    message: `✓ Project ${project.projectId} moved from ${prevStageName} → ${nextStageDef.name}`
  });
}));

// 6. STANDALONE PHYSICAL ASSETS INVENTORY & LIFECYCLE
app.get("/api/assets", extractUser, requirePerm("asset.view"), wrap(async (req, res) => {
  const query = {};

  if (req.user.role !== "admin" && req.user.role !== "management" && req.user.jurisdictionNode) {
    const allowedNodeIds = await getDescendantNodeIds(req.user.jurisdictionNode._id || req.user.jurisdictionNode);
    if (allowedNodeIds) query.subDivision = { $in: allowedNodeIds };
  }

  if (req.query.category) query.category = req.query.category;
  if (req.query.type) query.type = req.query.type;
  if (req.query.condition) query.condition = req.query.condition;
  if (req.query.status) query.status = req.query.status;
  if (req.query.node) {
    const nodeDescendants = await getDescendantNodeIds(req.query.node);
    if (nodeDescendants) query.subDivision = { $in: nodeDescendants };
  }
  if (req.query.q) {
    query.$or = [
      { name: new RegExp(req.query.q, "i") },
      { assetId: new RegExp(req.query.q, "i") },
      { "location.address": new RegExp(req.query.q, "i") }
    ];
  }

  const assets = await Asset.find(query)
    .populate("subDivision", "name level code parent")
    .populate("parentAsset", "assetId name type")
    .populate("projectManager", "name email phone designation")
    .populate("siteEngineer", "name email phone designation")
    .populate("qualityInspector", "name email phone designation")
    .populate("maintenanceEngineer", "name email phone designation")
    .populate("contractor", "name email contractorCompany phone")
    .populate("originatingProject", "projectId name")
    .sort({ assetId: 1 })
    .lean();

  res.json(assets);
}));

app.get("/api/assets/:id", extractUser, requirePerm("asset.view"), wrap(async (req, res) => {
  const asset = await Asset.findById(req.params.id)
    .populate("subDivision", "name level code")
    .populate("parentAsset", "assetId name type category")
    .populate("projectManager", "name email phone designation")
    .populate("siteEngineer", "name email phone designation")
    .populate("qualityInspector", "name email phone designation")
    .populate("maintenanceEngineer", "name email phone designation")
    .populate("contractor", "name email contractorCompany phone")
    .populate("lifecycleTemplate")
    .populate("originatingProject", "projectId name targetCompletionDate");

  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const childAssets = await Asset.find({ parentAsset: asset._id }).lean();
  const inspections = await Inspection.find({ asset: asset._id }).sort({ inspectionDate: -1 }).lean();
  const workOrders = await WorkOrder.find({ asset: asset._id })
    .populate("assignedContractor", "name email contractorCompany")
    .populate("assignedEngineer", "name email")
    .sort({ issuedDate: -1 })
    .lean();
  const documents = await Document.find({
    "relatedTo.entityType": "Asset",
    "relatedTo.entityId": asset._id
  }).lean();

  res.json({
    asset,
    components: asset.components || [],
    childAssets,
    inspections,
    workOrders,
    documents
  });
}));

// DIRECT ASSET LIFECYCLE TRANSITION
app.post("/api/assets/:id/advance", extractUser, requirePerm("asset.advance"), wrap(async (req, res) => {
  const { spend = 0, remarks = "", docTitle = "" } = req.body;
  const asset = await Asset.findById(req.params.id).populate("lifecycleTemplate");
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  if (!asset.stages || !asset.stages.length) {
    return res.status(400).json({ error: "No lifecycle stages defined for this asset." });
  }

  const curIdx = asset.stages.findIndex((s) => s.key === asset.currentStageKey);
  if (curIdx < 0) {
    return res.status(400).json({ error: `Current stage '${asset.currentStageKey}' not found in asset stages.` });
  }

  const curStage = asset.stages[curIdx];

  // Role validation
  if (req.user.role !== "admin") {
    if (curStage.responsibleRoles?.length && !curStage.responsibleRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Role '${req.user.role}' is not authorized to complete '${curStage.name}'. Authorized: [${curStage.responsibleRoles.join(", ")}]`
      });
    }
  }

  if (curIdx >= asset.stages.length - 1) {
    return res.status(400).json({ error: "Asset lifecycle has reached the final stage." });
  }

  const nextStage = asset.stages[curIdx + 1];

  // Complete current stage
  curStage.status = "Completed";
  curStage.completedAt = new Date();
  curStage.completedBy = `${req.user.name} (${req.user.role})`;
  curStage.spend = (curStage.spend || 0) + Number(spend || 0);
  curStage.remarks = remarks || curStage.remarks;
  if (docTitle) curStage.documents.push(docTitle);

  // Start next stage
  nextStage.status = "In Progress";
  nextStage.startedAt = new Date();

  const prevStageName = asset.currentStageName;
  asset.currentStageKey = nextStage.key;
  asset.currentStageName = nextStage.name;

  // Derive status from lifecycle
  if (nextStage.key === "construction") asset.status = "Under Construction";
  else if (nextStage.key === "handover" || nextStage.key === "operation_maintenance") asset.status = "Operational";
  else if (nextStage.key === "repair_rehabilitation") asset.status = "Under Maintenance";

  // Append to permanent history
  asset.history.unshift({
    at: new Date(),
    by: req.user.name,
    role: req.user.role,
    fromStage: prevStageName,
    toStage: nextStage.name,
    remarks: remarks || "Lifecycle stage completed",
    spend: Number(spend || 0)
  });

  await asset.save();
  await logAudit(req, "Asset Lifecycle Advanced", "Asset", asset.assetId, { from: prevStageName, to: nextStage.name, spend });

  res.json({
    asset,
    message: `✓ Asset ${asset.assetId} moved from ${prevStageName} → ${nextStage.name}`
  });
}));

// UPDATE ASSET PEOPLE ASSIGNMENT
app.put("/api/assets/:id/people", extractUser, requirePerm("asset.edit"), wrap(async (req, res) => {
  const { projectManager, siteEngineer, qualityInspector, maintenanceEngineer, contractor, contractorCompany } = req.body;
  
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  if (projectManager !== undefined) asset.projectManager = projectManager || null;
  if (siteEngineer !== undefined) asset.siteEngineer = siteEngineer || null;
  if (qualityInspector !== undefined) asset.qualityInspector = qualityInspector || null;
  if (maintenanceEngineer !== undefined) asset.maintenanceEngineer = maintenanceEngineer || null;
  if (contractor !== undefined) asset.contractor = contractor || null;
  if (contractorCompany !== undefined) asset.contractorCompany = contractorCompany;

  await asset.save();
  await logAudit(req, "Asset People Allocated", "Asset", asset.assetId, { projectManager, siteEngineer, qualityInspector, maintenanceEngineer, contractor });

  const populated = await Asset.findById(asset._id)
    .populate("projectManager", "name email phone designation")
    .populate("siteEngineer", "name email phone designation")
    .populate("qualityInspector", "name email phone designation")
    .populate("maintenanceEngineer", "name email phone designation")
    .populate("contractor", "name email contractorCompany phone");

  res.json({
    asset: populated,
    message: `✓ People assignments updated for ${asset.assetId}`
  });
}));

// SUB-COMPONENTS CRUD
app.post("/api/assets/:id/components", extractUser, requirePerm("asset.edit"), wrap(async (req, res) => {
  const { name, type, chainage, condition = "Good", status = "Operational", maintenanceRequired = false, specs = {} } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Component name and type are required." });

  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const nextSeq = (asset.components?.length || 0) + 1;
  const componentId = `CMP-${String(nextSeq).padStart(3, "0")}`;

  const newComponent = {
    componentId,
    name,
    type,
    chainage: chainage || "",
    condition,
    status,
    maintenanceRequired,
    specs,
    lastInspectionDate: new Date()
  };

  asset.components.push(newComponent);
  await asset.save();

  await logAudit(req, "Sub-component Added", "AssetComponent", `${asset.assetId}:${componentId}`, { name, type });

  res.status(201).json({
    component: asset.components[asset.components.length - 1],
    asset,
    message: `✓ Sub-component '${name}' added to ${asset.assetId}`
  });
}));

app.put("/api/assets/:id/components/:compId", extractUser, requirePerm("asset.edit"), wrap(async (req, res) => {
  const { name, type, chainage, condition, status, maintenanceRequired, specs } = req.body;
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const comp = asset.components.id(req.params.compId) || asset.components.find((c) => c.componentId === req.params.compId);
  if (!comp) return res.status(404).json({ error: "Component not found" });

  if (name) comp.name = name;
  if (type) comp.type = type;
  if (chainage !== undefined) comp.chainage = chainage;
  if (condition) comp.condition = condition;
  if (status) comp.status = status;
  if (maintenanceRequired !== undefined) comp.maintenanceRequired = maintenanceRequired;
  if (specs) comp.specs = specs;

  await asset.save();
  await logAudit(req, "Sub-component Updated", "AssetComponent", `${asset.assetId}:${comp.componentId}`, { name: comp.name, condition });

  res.json({
    component: comp,
    asset,
    message: `✓ Sub-component '${comp.name}' updated successfully`
  });
}));

app.delete("/api/assets/:id/components/:compId", extractUser, requirePerm("asset.edit"), wrap(async (req, res) => {
  const asset = await Asset.findById(req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const comp = asset.components.id(req.params.compId) || asset.components.find((c) => c.componentId === req.params.compId);
  if (!comp) return res.status(404).json({ error: "Component not found" });

  const compName = comp.name;
  asset.components.pull({ _id: comp._id });
  await asset.save();

  await logAudit(req, "Sub-component Removed", "AssetComponent", `${asset.assetId}:${req.params.compId}`, { name: compName });

  res.json({
    asset,
    message: `✓ Sub-component '${compName}' removed from ${asset.assetId}`
  });
}));

// Direct Physical Asset Registration
app.post("/api/assets", extractUser, requirePerm("asset.create"), wrap(async (req, res) => {
  const { name, type, category, subDivision, sanctionedCost, location, parentAsset, attributes, contractorCompany } = req.body;

  if (!name || !type || !category || !subDivision) {
    return res.status(400).json({ error: "Asset name, type, category, and sub-division are required." });
  }

  const inScope = await verifyJurisdictionScope(req.user, subDivision);
  if (!inScope) {
    return res.status(403).json({ error: "Access Denied: Sub-Division is outside your administrative jurisdiction." });
  }

  const subDiv = await Node.findById(subDivision);
  const prefixMap = {
    Road: "RD", "Road Section": "RS", Pavement: "PV", Bridge: "BR", Culvert: "CV", Drainage: "DR",
    Signboards: "SB", Streetlights: "SL", "Government Building": "BL", "Building Block": "BB",
    "Electrical System": "EL", Plumbing: "PL", HVAC: "HV", "Lift System": "LF", "Fire Safety": "FS"
  };
  const prefix = prefixMap[type] || "AST";
  const assetId = await getNextId(`${prefix}-${subDiv?.code || "GUJ"}`, "asset", 5);

  const tpl = await LifecycleTemplate.findOne({ category, isDefault: true }) || await LifecycleTemplate.findOne();
  const stages = tpl?.stages?.map((st, i) => ({
    key: st.key,
    name: st.name,
    status: i === 0 ? "In Progress" : "Pending",
    startedAt: i === 0 ? new Date() : null,
    responsibleRoles: st.responsibleRoles || []
  })) || [];

  const asset = await Asset.create({
    assetId,
    name,
    type,
    category,
    parentAsset: parentAsset || null,
    subDivision,
    sanctionedCost: Number(sanctionedCost) || 0,
    location: location || {},
    contractorCompany: contractorCompany || "",
    currentStageKey: stages[0]?.key || "planning",
    currentStageName: stages[0]?.name || "Planning",
    lifecycleTemplate: tpl?._id,
    stages,
    history: [{
      at: new Date(),
      by: req.user.name,
      role: req.user.role,
      fromStage: "–",
      toStage: stages[0]?.name || "Planning",
      remarks: "Physical asset registered in government inventory"
    }],
    attributes: attributes || {}
  });

  await logAudit(req, "Direct Asset Created", "Asset", asset.assetId, { name, type, subDivision });
  res.status(201).json({ asset, message: `✓ Asset ${asset.assetId} registered successfully` });
}));

// 7. Inspections & Defect Logging
app.get("/api/inspections", extractUser, requirePerm("inspection.view"), wrap(async (req, res) => {
  const query = {};
  if (req.query.assetId) query.asset = req.query.assetId;
  const list = await Inspection.find(query)
    .populate("asset", "assetId name type condition")
    .sort({ inspectionDate: -1 })
    .lean();
  res.json(list);
}));

app.post("/api/inspections", extractUser, requirePerm("inspection.create"), wrap(async (req, res) => {
  const { assetId, componentId, componentName, type, overallCondition, defects = [], notes } = req.body;
  
  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const inspectionId = await getNextId("INSP", "inspection", 4);
  const inspection = await Inspection.create({
    inspectionId,
    asset: asset._id,
    componentId: componentId || "",
    componentName: componentName || "",
    inspector: req.user._id,
    inspectorName: `${req.user.name} (${req.user.role})`,
    type: type || "Routine",
    overallCondition,
    defects,
    notes,
    verificationStatus: req.user.role === "quality_inspector" ? "Verified" : "Submitted",
    verifiedBy: req.user.role === "quality_inspector" ? req.user.name : null
  });

  const prevCondition = asset.condition;
  asset.condition = overallCondition;
  asset.lastInspectionDate = new Date();
  asset.lastInspectedBy = `${req.user.name} (${req.user.role})`;

  if (componentId && asset.components?.length) {
    const comp = asset.components.id(componentId) || asset.components.find((c) => c.componentId === componentId);
    if (comp) {
      comp.condition = overallCondition;
      comp.lastInspectionDate = new Date();
      comp.maintenanceRequired = (overallCondition === "Poor" || overallCondition === "Critical" || defects.length > 0);
    }
  }

  await asset.save();

  await logAudit(req, "Inspection Recorded", "Inspection", inspection.inspectionId, {
    assetId: asset.assetId,
    conditionChange: `${prevCondition} → ${overallCondition}`,
    defectCount: defects.length
  });

  const targetLabel = componentName ? `${asset.name} – ${componentName}` : asset.name;
  res.status(201).json({
    inspection,
    message: `✓ Inspection completed successfully for ${targetLabel}`
  });
}));

app.post("/api/inspections/:id/verify", extractUser, requirePerm("inspection.verify"), wrap(async (req, res) => {
  const { status, remarks } = req.body;
  const inspection = await Inspection.findByIdAndUpdate(
    req.params.id,
    {
      verificationStatus: status || "Verified",
      verifiedBy: req.user.name,
      verificationRemarks: remarks || "Verified in compliance with quality standards"
    },
    { new: true }
  );

  await logAudit(req, "Inspection Verified", "Inspection", inspection.inspectionId, { status, remarks });
  res.json({
    inspection,
    message: `✓ Inspection ${inspection.inspectionId} ${status?.toLowerCase() || "verified"} by ${req.user.name}`
  });
}));

// 8. Maintenance Requests & Work Orders
app.get("/api/work-orders", extractUser, requirePerm("maintenance.view"), wrap(async (req, res) => {
  const query = {};
  
  if (req.user.role === "contractor") {
    query.assignedContractor = req.user._id;
  }

  if (req.query.status) query.status = req.query.status;
  if (req.query.priority) query.priority = req.query.priority;
  if (req.query.assetId) query.asset = req.query.assetId;

  const orders = await WorkOrder.find(query)
    .populate("asset", "assetId name type condition location")
    .populate("assignedContractor", "name email contractorCompany phone")
    .populate("assignedEngineer", "name email phone")
    .sort({ issuedDate: -1 })
    .lean();

  res.json(orders);
}));

app.post("/api/work-orders", extractUser, requirePerm("maintenance.create"), wrap(async (req, res) => {
  const { assetId, componentId, componentName, inspectionId, defectIndex = -1, title, description, priority, assignedContractorId, estimatedCost, targetCompletionDate } = req.body;

  const asset = await Asset.findById(assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found" });

  const contractor = assignedContractorId ? await User.findById(assignedContractorId) : null;
  const workOrderId = await getNextId("WO", "workorder", 4);

  const workOrder = await WorkOrder.create({
    workOrderId,
    asset: asset._id,
    componentId: componentId || "",
    componentName: componentName || "",
    inspection: inspectionId || null,
    defectIndex,
    title,
    description,
    priority: priority || "Routine",
    status: "Issued",
    assignedContractor: contractor?._id || null,
    contractorCompany: contractor?.contractorCompany || "",
    assignedEngineer: req.user._id,
    estimatedCost: Number(estimatedCost) || 0,
    targetCompletionDate: targetCompletionDate || null
  });

  if (inspectionId && defectIndex >= 0) {
    const insp = await Inspection.findById(inspectionId);
    if (insp?.defects?.[defectIndex]) {
      insp.defects[defectIndex].status = "Work Order Issued";
      await insp.save();
    }
  }

  asset.status = "Under Maintenance";
  if (componentId && asset.components?.length) {
    const comp = asset.components.id(componentId) || asset.components.find((c) => c.componentId === componentId);
    if (comp) {
      comp.status = "Under Maintenance";
      comp.maintenanceRequired = true;
    }
  }
  await asset.save();

  await logAudit(req, "Maintenance Work Order Issued", "WorkOrder", workOrder.workOrderId, {
    assetId: asset.assetId,
    title,
    contractor: contractor?.name
  });

  res.status(201).json({
    workOrder,
    message: `✓ Maintenance work order ${workOrder.workOrderId} created successfully`
  });
}));

app.put("/api/work-orders/:id/progress", extractUser, requirePerm("maintenance.update"), wrap(async (req, res) => {
  const { status, repairDetails, actualCost, beforePhotoUrl, afterPhotoUrl } = req.body;
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found" });

  if (req.user.role === "contractor" && String(wo.assignedContractor) !== String(req.user._id)) {
    return res.status(403).json({ error: "Access Denied: You are not the assigned contractor for this work order." });
  }

  wo.status = status || wo.status;
  if (repairDetails !== undefined) wo.repairDetails = repairDetails;
  if (actualCost !== undefined) wo.actualCost = Number(actualCost);
  if (beforePhotoUrl) wo.beforePhotoUrl = beforePhotoUrl;
  if (afterPhotoUrl) wo.afterPhotoUrl = afterPhotoUrl;
  if (status === "Completed") wo.completionDate = new Date();

  await wo.save();
  await logAudit(req, "Work Order Progress Updated", "WorkOrder", wo.workOrderId, { status, repairDetails });

  res.json({
    workOrder: wo,
    message: `✓ Work order ${wo.workOrderId} updated to status '${wo.status}'`
  });
}));

app.post("/api/work-orders/:id/verify", extractUser, requirePerm("maintenance.verify"), wrap(async (req, res) => {
  const { engineerRemarks, newCondition = "Good" } = req.body;
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ error: "Work order not found" });

  wo.status = "Verified & Closed";
  wo.verifiedBy = req.user.name;
  wo.verifiedDate = new Date();
  wo.engineerRemarks = engineerRemarks || "Repair verified on-site in compliance with R&B specifications.";
  await wo.save();

  if (wo.inspection && wo.defectIndex >= 0) {
    const insp = await Inspection.findById(wo.inspection);
    if (insp?.defects?.[wo.defectIndex]) {
      insp.defects[wo.defectIndex].status = "Resolved";
      await insp.save();
    }
  }

  const asset = await Asset.findById(wo.asset);
  if (asset) {
    asset.status = "Operational";
    asset.condition = newCondition;

    if (wo.componentId && asset.components?.length) {
      const comp = asset.components.id(wo.componentId) || asset.components.find((c) => c.componentId === wo.componentId);
      if (comp) {
        comp.condition = newCondition;
        comp.status = "Operational";
        comp.maintenanceRequired = false;
        comp.lastMaintenanceDate = new Date();
      }
    }

    asset.maintenanceHistory.unshift({
      at: new Date(),
      workOrderId: wo.workOrderId,
      componentId: wo.componentId || "",
      componentName: wo.componentName || "",
      title: wo.title,
      cost: wo.actualCost || wo.estimatedCost,
      repairedBy: wo.contractorCompany || "Contractor",
      verifiedBy: req.user.name,
      summary: wo.repairDetails || "Maintenance repair completed and verified"
    });
    await asset.save();
  }

  await logAudit(req, "Work Order Verified & Closed", "WorkOrder", wo.workOrderId, {
    assetId: asset?.assetId,
    newCondition
  });

  res.json({
    workOrder: wo,
    asset,
    message: `✓ Work order ${wo.workOrderId} verified and asset condition restored to ${newCondition}`
  });
}));

// 9. Documents
app.get("/api/documents", extractUser, wrap(async (req, res) => {
  const query = {};
  if (req.query.entityType && req.query.entityId) {
    query["relatedTo.entityType"] = req.query.entityType;
    query["relatedTo.entityId"] = req.query.entityId;
  }
  const docs = await Document.find(query).sort({ uploadedAt: -1 }).lean();
  res.json(docs);
}));

app.post("/api/documents", extractUser, requirePerm("document.upload"), wrap(async (req, res) => {
  const { title, category, fileUrl, entityType, entityId, stageKey } = req.body;
  const docId = await getNextId("DOC", "document", 4);
  const doc = await Document.create({
    docId,
    title,
    category,
    fileUrl: fileUrl || "",
    relatedTo: { entityType, entityId },
    stageKey: stageKey || "",
    uploadedBy: req.user.name
  });
  await logAudit(req, "Document Uploaded", "Document", doc.docId, { title, entityType });
  res.status(201).json({ doc, message: `✓ Document '${title}' uploaded successfully` });
}));

// 10. Audit Trail
app.get("/api/audit", extractUser, requirePerm("audit.view"), wrap(async (req, res) => {
  const logs = await Audit.find().sort({ at: -1 }).limit(200).lean();
  res.json(logs);
}));

// 11. Role-Tailored Dashboard Aggregations
app.get("/api/dashboard/stats", extractUser, wrap(async (req, res) => {
  const user = req.user;
  const assetQuery = {};
  const projectQuery = {};
  
  if (user.role !== "admin" && user.role !== "management" && user.jurisdictionNode) {
    const allowedNodeIds = await getDescendantNodeIds(user.jurisdictionNode._id || user.jurisdictionNode);
    if (allowedNodeIds) {
      assetQuery.subDivision = { $in: allowedNodeIds };
      projectQuery.subDivision = { $in: allowedNodeIds };
    }
  }

  if (user.role === "contractor") {
    projectQuery.$or = [
      { contractor: user._id },
      { _id: { $in: user.assignedProjects || [] } }
    ];
  }

  const [
    totalAssets,
    assetsByCondition,
    assetsByCategory,
    totalProjects,
    projectsByStage,
    totalWorkOrders,
    openDefectsCount
  ] = await Promise.all([
    Asset.countDocuments(assetQuery),
    Asset.aggregate([
      { $match: assetQuery },
      { $group: { _id: "$condition", count: { $sum: 1 }, totalCost: { $sum: "$sanctionedCost" } } }
    ]),
    Asset.aggregate([
      { $match: assetQuery },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]),
    Project.countDocuments(projectQuery),
    Project.aggregate([
      { $match: projectQuery },
      { $group: { _id: "$currentStageName", count: { $sum: 1 } } }
    ]),
    WorkOrder.countDocuments(user.role === "contractor" ? { assignedContractor: user._id } : {}),
    Inspection.aggregate([
      { $unwind: "$defects" },
      { $match: { "defects.status": { $ne: "Resolved" } } },
      { $count: "open" }
    ])
  ]);

  const totalSanctionedCost = (await Asset.aggregate([
    { $match: assetQuery },
    { $group: { _id: null, total: { $sum: "$sanctionedCost" } } }
  ]))[0]?.total || 0;

  const totalProjectBudget = (await Project.aggregate([
    { $match: projectQuery },
    { $group: { _id: null, budget: { $sum: "$sanctionedBudget" }, spend: { $sum: "$spentAmount" } } }
  ]))[0] || { budget: 0, spend: 0 };

  res.json({
    totalAssets,
    totalSanctionedCost: +totalSanctionedCost.toFixed(2),
    assetsByCondition,
    assetsByCategory,
    totalProjects,
    totalProjectBudget: +totalProjectBudget.budget.toFixed(2),
    totalProjectSpend: +totalProjectBudget.spend.toFixed(2),
    projectsByStage,
    totalWorkOrders,
    openDefects: openDefectsCount[0]?.open || 0
  });
}));

// 12. Database Seed / Reset Endpoint
app.post("/api/seed", extractUser, requirePerm("user.manage"), wrap(async (req, res) => {
  await runSeed();
  res.json({ message: "✓ Database reseeded successfully with full Gujarat R&B baseline dataset." });
}));

export default app;

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL && !process.argv.some(arg => arg.includes("test"))) {
  const port = process.env.PORT || 5000;
  await connectDB();
  app.listen(port, () => console.log(`Gujarat R&B IAMS Backend running on port ${port}`));
}
