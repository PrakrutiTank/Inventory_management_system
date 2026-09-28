import "dotenv/config";
import mongoose from "mongoose";
import {
  User, Node, RolePermission, LifecycleTemplate,
  Project, Asset, Inspection, WorkOrder, Document,
  Counter, DEFAULT_PERMISSIONS, ROLES
} from "./models.js";
import { connectDB } from "./db.js";

export async function runSeed() {
  await connectDB();
  console.log("Connected to DB, clearing existing collections...");

  await Promise.all([
    User.deleteMany({}),
    Node.deleteMany({}),
    RolePermission.deleteMany({}),
    LifecycleTemplate.deleteMany({}),
    Project.deleteMany({}),
    Asset.deleteMany({}),
    Inspection.deleteMany({}),
    WorkOrder.deleteMany({}),
    Document.deleteMany({}),
    Counter.deleteMany({})
  ]);

  // 1. Role Permissions
  console.log("Seeding Role Permissions...");
  for (const role of ROLES) {
    await RolePermission.create({
      role,
      permissions: DEFAULT_PERMISSIONS[role] || []
    });
  }

  // 2. Hierarchy Nodes
  console.log("Seeding Administrative Hierarchy (Gujarat R&B)...");
  const state = await Node.create({ name: "Gujarat State", code: "GUJ", level: "State" });

  const nodes = {};

  // Surat Circle
  const cSurat = await Node.create({ name: "Surat Circle", code: "SUR", level: "Circle", parent: state._id });
  const dSuratCity = await Node.create({ name: "Surat City Division", code: "SUR-C", level: "Division", parent: cSurat._id });
  const dBardoli = await Node.create({ name: "Bardoli Division", code: "BAR", level: "Division", parent: cSurat._id });
  nodes["Adajan"] = await Node.create({ name: "Adajan Sub-Division", code: "ADJ", level: "SubDivision", parent: dSuratCity._id });
  nodes["Varachha"] = await Node.create({ name: "Varachha Sub-Division", code: "VAR", level: "SubDivision", parent: dSuratCity._id });
  nodes["Bardoli"] = await Node.create({ name: "Bardoli Sub-Division", code: "BARD", level: "SubDivision", parent: dBardoli._id });
  nodes["Mahuva"] = await Node.create({ name: "Mahuva Sub-Division", code: "MAH", level: "SubDivision", parent: dBardoli._id });

  // Vadodara Circle
  const cVadodara = await Node.create({ name: "Vadodara Circle", code: "VAD", level: "Circle", parent: state._id });
  const dVadodara = await Node.create({ name: "Vadodara Division", code: "VAD-D", level: "Division", parent: cVadodara._id });
  nodes["Alkapuri"] = await Node.create({ name: "Alkapuri Sub-Division", code: "ALK", level: "SubDivision", parent: dVadodara._id });
  nodes["Karelibaug"] = await Node.create({ name: "Karelibaug Sub-Division", code: "KAR", level: "SubDivision", parent: dVadodara._id });

  // Ahmedabad Circle
  const cAhmedabad = await Node.create({ name: "Ahmedabad Circle", code: "AHM", level: "Circle", parent: state._id });
  const dAhdCity = await Node.create({ name: "Ahmedabad City Division", code: "AHM-C", level: "Division", parent: cAhmedabad._id });
  const dAhdRural = await Node.create({ name: "Ahmedabad Rural Division", code: "AHM-R", level: "Division", parent: cAhmedabad._id });
  nodes["Sabarmati"] = await Node.create({ name: "Sabarmati Sub-Division", code: "SAB", level: "SubDivision", parent: dAhdCity._id });
  nodes["Maninagar"] = await Node.create({ name: "Maninagar Sub-Division", code: "MAN", level: "SubDivision", parent: dAhdCity._id });
  nodes["Sanand"] = await Node.create({ name: "Sanand Sub-Division", code: "SAN", level: "SubDivision", parent: dAhdRural._id });
  nodes["Dholera"] = await Node.create({ name: "Dholera Sub-Division", code: "DHO", level: "SubDivision", parent: dAhdRural._id });

  // 3. Seed Users
  console.log("Seeding Users...");
  const users = {};

  users["admin"] = await User.create({
    name: "Rajesh Mehta",
    email: "rajesh.mehta@rnb.gujarat.gov.in",
    role: "admin",
    designation: "Chief Engineer & System Administrator",
    jurisdictionNode: state._id,
    phone: "+91 98250 11001"
  });

  users["officer"] = await User.create({
    name: "Anita Sharma",
    email: "anita.sharma@rnb.gujarat.gov.in",
    role: "department_officer",
    designation: "Superintending Engineer, Surat Circle",
    jurisdictionNode: cSurat._id,
    phone: "+91 98250 22002"
  });

  users["pm"] = await User.create({
    name: "Vikram Desai",
    email: "vikram.desai@rnb.gujarat.gov.in",
    role: "project_manager",
    designation: "Executive Engineer (Projects), Ahmedabad",
    jurisdictionNode: cAhmedabad._id,
    phone: "+91 98250 33003"
  });

  users["site_eng"] = await User.create({
    name: "Prakash Patel",
    email: "prakash.patel@rnb.gujarat.gov.in",
    role: "site_engineer",
    designation: "Deputy Executive Engineer, Sanand & Dholera",
    jurisdictionNode: dAhdRural._id,
    phone: "+91 98250 44004"
  });

  users["inspector"] = await User.create({
    name: "Kirit Solanki",
    email: "kirit.solanki@rnb.gujarat.gov.in",
    role: "quality_inspector",
    designation: "Executive Quality Auditor, State Vigilance",
    jurisdictionNode: state._id,
    phone: "+91 98250 55005"
  });

  users["maint_eng"] = await User.create({
    name: "Snehal Joshi",
    email: "snehal.joshi@rnb.gujarat.gov.in",
    role: "maintenance_engineer",
    designation: "Assistant Executive Engineer (Asset Maintenance)",
    jurisdictionNode: cAhmedabad._id,
    phone: "+91 98250 66006"
  });

  users["contractor_lnt"] = await User.create({
    name: "Ajay Patel",
    email: "ajay.patel@lntinfra.com",
    role: "contractor",
    designation: "Project Director, L&T Infrastructure Ltd",
    contractorCompany: "L&T Infrastructure Ltd",
    phone: "+91 98980 77007"
  });

  users["contractor_shree"] = await User.create({
    name: "Dharmesh Shah",
    email: "dharmesh@shreeinfra.in",
    role: "contractor",
    designation: "Managing Director, Shree Infra Projects",
    contractorCompany: "Shree Infra Projects Ltd",
    phone: "+91 98980 88008"
  });

  users["mgmt"] = await User.create({
    name: "Hasmukh Shah, IAS",
    email: "hasmukh.shah@rnb.gujarat.gov.in",
    role: "management",
    designation: "Principal Secretary, R&B Dept, Gandhinagar",
    jurisdictionNode: state._id,
    phone: "+91 98250 99009"
  });

  // 4. Baseline 11-Stage Configurable Lifecycle Templates
  console.log("Seeding Baseline Lifecycle Templates...");
  const BASELINE_STAGES = [
    {
      key: "planning",
      name: "Planning",
      description: "Reconnaissance survey, feasibility study, traffic census & DPR preparation",
      order: 1,
      responsibleRoles: ["admin", "department_officer", "project_manager"],
      requiredDocuments: ["DPR"],
      allowsHandoverToAsset: false
    },
    {
      key: "design",
      name: "Design & Estimation",
      description: "Geometric design, structural calculations, BOQ and detailed rate analysis",
      order: 2,
      responsibleRoles: ["project_manager", "department_officer"],
      requiredDocuments: ["Design Drawing", "Technical Sanction"],
      allowsHandoverToAsset: false
    },
    {
      key: "approval",
      name: "Approval / Sanction",
      description: "Administrative approval, budget code allocation & financial sanction",
      order: 3,
      responsibleRoles: ["department_officer", "admin"],
      requiredDocuments: ["Technical Sanction"],
      allowsHandoverToAsset: false
    },
    {
      key: "tender",
      name: "Tender / Contract",
      description: "E-tendering on n-Procure, commercial bidding and contract award",
      order: 4,
      responsibleRoles: ["department_officer", "project_manager"],
      requiredDocuments: ["Tender / BOQ", "Contract Agreement"],
      allowsHandoverToAsset: false
    },
    {
      key: "construction",
      name: "Construction",
      description: "Execution of earthwork, base courses, structural and civil components",
      order: 5,
      responsibleRoles: ["project_manager", "site_engineer", "contractor"],
      requiredDocuments: ["Site Photo"],
      allowsHandoverToAsset: false
    },
    {
      key: "inspection",
      name: "Inspection / Quality Control",
      description: "Quality assurance tests, core cutter, non-destructive testing & safety audit",
      order: 6,
      responsibleRoles: ["quality_inspector", "site_engineer"],
      requiredDocuments: ["Inspection Report"],
      allowsHandoverToAsset: false
    },
    {
      key: "handover",
      name: "Completion / Handover",
      description: "As-built verification, completion certificate issuance and commissioning",
      order: 7,
      responsibleRoles: ["project_manager", "department_officer"],
      requiredDocuments: ["Handover Certificate", "As-Built Drawing"],
      allowsHandoverToAsset: true
    },
    {
      key: "operation_maintenance",
      name: "Operation & Maintenance",
      description: "Routine patrolling, continuous monitoring and defect liability maintenance",
      order: 8,
      responsibleRoles: ["maintenance_engineer", "site_engineer", "contractor"],
      requiredDocuments: ["Work Order"],
      allowsHandoverToAsset: false
    },
    {
      key: "condition_assessment",
      name: "Condition Assessment",
      description: "Pavement distress survey, bridge structural audit and roughness rating",
      order: 9,
      responsibleRoles: ["quality_inspector", "maintenance_engineer"],
      requiredDocuments: ["Inspection Report"],
      allowsHandoverToAsset: false
    },
    {
      key: "repair_rehabilitation",
      name: "Repair / Rehabilitation",
      description: "Bituminous overlay, structural strengthening and major defect repairs",
      order: 10,
      responsibleRoles: ["maintenance_engineer", "site_engineer", "contractor"],
      requiredDocuments: ["Work Order"],
      allowsHandoverToAsset: false
    },
    {
      key: "renewal_replacement",
      name: "Renewal / Replacement",
      description: "Full surface renewal, structural replacement or capacity expansion",
      order: 11,
      responsibleRoles: ["department_officer", "project_manager"],
      requiredDocuments: ["DPR"],
      allowsHandoverToAsset: false
    }
  ];

  const tplRoad = await LifecycleTemplate.create({
    name: "Road Lifecycle Standard (11 Phases)",
    category: "Road",
    description: "End-to-end statutory lifecycle for State Highways and Major District Roads",
    isDefault: true,
    stages: BASELINE_STAGES
  });

  const tplBuilding = await LifecycleTemplate.create({
    name: "Government Building Lifecycle Standard",
    category: "Building",
    description: "Statutory lifecycle for Administrative Offices and Health Complexes",
    isDefault: true,
    stages: BASELINE_STAGES
  });

  // Helper to generate full stage instances for an asset/project
  function buildStageInstances(currentKey, peopleMap = {}) {
    const curIdx = BASELINE_STAGES.findIndex((s) => s.key === currentKey);
    return BASELINE_STAGES.map((st, idx) => ({
      key: st.key,
      name: st.name,
      status: idx < curIdx ? "Completed" : idx === curIdx ? "In Progress" : "Pending",
      startedAt: idx <= curIdx ? new Date(2025, idx, 10) : null,
      completedAt: idx < curIdx ? new Date(2025, idx + 1, 5) : null,
      completedBy: idx < curIdx ? (idx % 2 === 0 ? "Anita Sharma (Dept Officer)" : "Vikram Desai (Project Manager)") : "",
      spend: idx < curIdx ? +(12.5 + idx * 3.2).toFixed(2) : idx === curIdx ? 4.5 : 0,
      remarks: idx < curIdx ? "Formal technical sign-off and milestone achieved" : idx === curIdx ? "Currently in active execution" : "",
      responsibleRoles: st.responsibleRoles || [],
      assignedUserName: peopleMap[st.key] || ""
    }));
  }

  // 5. Seed Standalone Physical Assets with Components and Complete Lifecycle
  console.log("Seeding Standalone Physical Assets with Full Lifecycle & Sub-components...");

  // Asset 1: SH-41 Ahmedabad-Mehsana Highway (Under Construction phase)
  const sh41Stages = buildStageInstances("construction", {
    planning: "Anita Sharma (Dept Officer)",
    design: "Vikram Desai (Project Manager)",
    approval: "Anita Sharma (Dept Officer)",
    tender: "Vikram Desai (Project Manager)",
    construction: "Vikram Desai (PM) & Prakash Patel (Site Eng)",
    inspection: "Kirit Solanki (Quality Inspector)",
    handover: "Anita Sharma (Dept Officer)",
    operation_maintenance: "Snehal Joshi (Maintenance Engineer)"
  });

  const roadSH41 = await Asset.create({
    assetId: "ROAD-001",
    name: "Ahmedabad–Mehsana State Highway (SH-41)",
    type: "Road",
    category: "Road",
    subDivision: nodes["Sanand"]._id,
    location: {
      address: "Sanand - Kadi - Mehsana Highway Corridor",
      chainage: "km 0+000 to 45+200",
      lat: 23.0125,
      lng: 72.3789
    },
    status: "Under Construction",
    condition: "Fair",
    sanctionedCost: 145.0,
    constructionDate: new Date(2024, 8, 1),
    contractorCompany: "L&T Infrastructure Ltd",
    responsibleOffice: "Ahmedabad Rural R&B Division",
    attributes: {
      laneCount: 4,
      carriagewayWidthMeters: 14.5,
      pavementType: "Flexible Bituminous",
      lengthKm: 45.2,
      trafficDensityPCU: 28500
    },

    // People Associated
    projectManager: users["pm"]._id,
    siteEngineer: users["site_eng"]._id,
    qualityInspector: users["inspector"]._id,
    maintenanceEngineer: users["maint_eng"]._id,
    contractor: users["contractor_lnt"]._id,

    // Direct Lifecycle
    currentStageKey: "construction",
    currentStageName: "Construction",
    lifecycleTemplate: tplRoad._id,
    stages: sh41Stages,
    history: [
      { at: new Date(2025, 0, 15), by: "Rajesh Mehta", role: "admin", fromStage: "–", toStage: "Planning", remarks: "Feasibility and traffic count approved", spend: 0 },
      { at: new Date(2025, 2, 10), by: "Anita Sharma", role: "department_officer", fromStage: "Planning", toStage: "Design & Estimation", remarks: "Detailed geometric design vetted", spend: 2.5 },
      { at: new Date(2025, 4, 18), by: "Anita Sharma", role: "department_officer", fromStage: "Design & Estimation", toStage: "Approval / Sanction", remarks: "State Finance sanction granted", spend: 5.0 },
      { at: new Date(2025, 6, 25), by: "Vikram Desai", role: "project_manager", fromStage: "Approval / Sanction", toStage: "Tender / Contract", remarks: "EPC contract awarded to L&T Infra", spend: 15.0 },
      { at: new Date(2025, 9, 5), by: "Vikram Desai", role: "project_manager", fromStage: "Tender / Contract", toStage: "Construction", remarks: "Mobilization advance and site handover complete", spend: 32.0 }
    ],

    // Sub-components with independent conditions & maintenance tracking
    components: [
      {
        componentId: "CMP-001",
        name: "Main Pavement (km 0-20)",
        type: "Pavement",
        chainage: "km 0+000 to 20+000",
        condition: "Fair",
        status: "In Progress",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 15),
        specs: { layer: "DBM 50mm + BC 40mm", width: 14.5 }
      },
      {
        componentId: "CMP-002",
        name: "Northbound Storm Drainage Network",
        type: "Drainage",
        chainage: "km 5+000 to 18+000",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 12),
        specs: { type: "Precast Trapezoidal RCC", capacityCusecs: 12 }
      },
      {
        componentId: "CMP-003",
        name: "Sanand Agricultural Box Culvert #4",
        type: "Culvert",
        chainage: "km 14+250",
        condition: "Poor",
        status: "Under Maintenance",
        maintenanceRequired: true,
        lastInspectionDate: new Date(2026, 8, 20),
        specs: { span: "3m x 2.5m double cell", dischargePeak: 35 }
      },
      {
        componentId: "CMP-004",
        name: "Sanand Canal PSC Girder Bridge",
        type: "Bridge",
        chainage: "km 22+800",
        condition: "Good",
        status: "In Progress",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 7, 28),
        specs: { spans: 4, totalLengthMeters: 120 }
      },
      {
        componentId: "CMP-005",
        name: "Sanand Junction LED Streetlights Array",
        type: "Streetlights",
        chainage: "km 10+000 to 14+000",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 5),
        specs: { fixtureCount: 140, wattage: "120W LED" }
      }
    ]
  });

  // Asset 2: Gujarat R&B Sachivalaya Block 3 (Operation & Maintenance phase)
  const bldgStages = buildStageInstances("operation_maintenance", {
    planning: "Rajesh Mehta (Admin)",
    design: "Anita Sharma (Dept Officer)",
    approval: "Anita Sharma (Dept Officer)",
    tender: "Vikram Desai (PM)",
    construction: "Vikram Desai (PM) & Prakash Patel (Site Eng)",
    inspection: "Kirit Solanki (Quality Inspector)",
    handover: "Anita Sharma (Dept Officer)",
    operation_maintenance: "Snehal Joshi (Maintenance Engineer)",
    condition_assessment: "Kirit Solanki (Quality Inspector)",
    repair_rehabilitation: "Snehal Joshi (Maintenance Engineer)"
  });

  const bldgSachivalaya = await Asset.create({
    assetId: "BLDG-003",
    name: "Gujarat R&B Sachivalaya Administrative Block 3",
    type: "Government Building",
    category: "Building",
    subDivision: nodes["Sabarmati"]._id,
    location: {
      address: "Sector 10, Sachivalaya Complex, Gandhinagar",
      lat: 23.2156,
      lng: 72.6369
    },
    status: "Operational",
    condition: "Good",
    sanctionedCost: 64.0,
    constructionDate: new Date(2021, 10, 1),
    contractorCompany: "L&T Infrastructure Ltd",
    responsibleOffice: "Capital Project Division 1",
    attributes: {
      floors: 8,
      builtUpAreaSqFt: 185000,
      occupancyCapacity: 1200,
      fireNocValidUpto: "2027-12-31"
    },

    // People Associated
    projectManager: users["pm"]._id,
    siteEngineer: users["site_eng"]._id,
    qualityInspector: users["inspector"]._id,
    maintenanceEngineer: users["maint_eng"]._id,
    contractor: users["contractor_lnt"]._id,

    // Direct Lifecycle
    currentStageKey: "operation_maintenance",
    currentStageName: "Operation & Maintenance",
    lifecycleTemplate: tplBuilding._id,
    stages: bldgStages,
    history: [
      { at: new Date(2021, 2, 10), by: "Rajesh Mehta", role: "admin", fromStage: "–", toStage: "Planning", remarks: "Administrative complex sanctioned", spend: 0 },
      { at: new Date(2021, 6, 20), by: "Anita Sharma", role: "department_officer", fromStage: "Planning", toStage: "Tender / Contract", remarks: "Tender finalized", spend: 18.0 },
      { at: new Date(2023, 8, 15), by: "Vikram Desai", role: "project_manager", fromStage: "Construction", toStage: "Inspection / Quality Control", remarks: "Fire NOC & Structural stability cleared", spend: 38.0 },
      { at: new Date(2023, 10, 1), by: "Anita Sharma", role: "department_officer", fromStage: "Inspection / Quality Control", toStage: "Completion / Handover", remarks: "Keys and occupancy certificate handed to General Admin", spend: 6.0 },
      { at: new Date(2024, 0, 15), by: "Snehal Joshi", role: "maintenance_engineer", fromStage: "Completion / Handover", toStage: "Operation & Maintenance", remarks: "Entered operational warranty and maintenance phase", spend: 2.0 }
    ],

    // Sub-components with independent conditions & maintenance tracking
    components: [
      {
        componentId: "CMP-101",
        name: "Central Chilled Water HVAC Plant (300 TR)",
        type: "HVAC",
        condition: "Fair",
        status: "Under Maintenance",
        maintenanceRequired: true,
        lastInspectionDate: new Date(2026, 8, 22),
        specs: { chillers: 3, coolingTowerTR: 350, vendor: "Voltas Commercial" }
      },
      {
        componentId: "CMP-102",
        name: "High-Speed Passenger Elevator Bank (4 Units)",
        type: "Lift System",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 10),
        specs: { make: "Schindler 5500", capacityPersons: 13, speedMPS: 2.0 }
      },
      {
        componentId: "CMP-103",
        name: "Automatic Fire Sprinkler & Hydrant Network",
        type: "Fire Safety",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 7, 18),
        specs: { pumpHeadBar: 12, storageLiters: 250000, fireNOC: "Valid 2027" }
      },
      {
        componentId: "CMP-104",
        name: "11kV / 433V Primary Substation & DG Backup",
        type: "Electrical System",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 1),
        specs: { transformerKVA: 1000, dgKVA: 650 }
      }
    ]
  });

  // Asset 3: Surat Civil Hospital Trauma Centre
  const bldgSuratHosp = await Asset.create({
    assetId: "BLDG-007",
    name: "Surat District Civil Hospital Trauma Centre",
    type: "Government Building",
    category: "Building",
    subDivision: nodes["Adajan"]._id,
    location: { address: "Majura Gate, Surat", lat: 21.1755, lng: 72.8122 },
    status: "Operational",
    condition: "Good",
    sanctionedCost: 92.0,
    constructionDate: new Date(2023, 1, 10),
    contractorCompany: "Shree Infra Projects Ltd",
    responsibleOffice: "Surat R&B Division 2",
    attributes: { floors: 6, bedCapacity: 450, builtUpAreaSqFt: 220000 },
    projectManager: users["pm"]._id,
    siteEngineer: users["site_eng"]._id,
    qualityInspector: users["inspector"]._id,
    maintenanceEngineer: users["maint_eng"]._id,
    contractor: users["contractor_shree"]._id,
    currentStageKey: "operation_maintenance",
    currentStageName: "Operation & Maintenance",
    lifecycleTemplate: tplBuilding._id,
    stages: buildStageInstances("operation_maintenance", {
      planning: "Anita Sharma",
      design: "Vikram Desai",
      approval: "Anita Sharma",
      tender: "Vikram Desai",
      construction: "Prakash Patel & Dharmesh Shah",
      inspection: "Kirit Solanki",
      handover: "Anita Sharma",
      operation_maintenance: "Snehal Joshi"
    }),
    components: [
      {
        componentId: "CMP-201",
        name: "Emergency Power & 11kV Substation",
        type: "Electrical System",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 5)
      },
      {
        componentId: "CMP-202",
        name: "Medical Gas Pipeline & Oxygen Plant",
        type: "Plumbing",
        condition: "Good",
        status: "Operational",
        maintenanceRequired: false,
        lastInspectionDate: new Date(2026, 8, 14)
      }
    ]
  });

  // 6. Seed Projects
  console.log("Seeding Active Infrastructure Projects...");
  const prj1 = await Project.create({
    projectId: "PRJ-AHM-2025-001",
    name: "Ahmedabad–Mehsana Expressway Widening Ph-2",
    category: "Road",
    subDivision: nodes["Sanand"]._id,
    projectManager: users["pm"]._id,
    siteEngineer: users["site_eng"]._id,
    qualityInspector: users["inspector"]._id,
    maintenanceEngineer: users["maint_eng"]._id,
    contractor: users["contractor_lnt"]._id,
    contractorCompany: "L&T Infrastructure Ltd",
    sanctionedBudget: 145.0,
    spentAmount: 82.5,
    targetCompletionDate: new Date(2027, 2, 31),
    currentStageKey: "construction",
    currentStageName: "Construction",
    progressPercentage: 55,
    lifecycleTemplate: tplRoad._id,
    stages: sh41Stages,
    history: roadSH41.history,
    createdAsset: roadSH41._id,
    attributes: { lengthKm: 32.4, targetLanes: 6 }
  });

  await User.findByIdAndUpdate(users["pm"]._id, { $addToSet: { assignedProjects: prj1._id } });
  await User.findByIdAndUpdate(users["site_eng"]._id, { $addToSet: { assignedProjects: prj1._id } });
  await User.findByIdAndUpdate(users["contractor_lnt"]._id, { $addToSet: { assignedProjects: prj1._id } });

  // 7. Seed Inspections with Component Linkages
  console.log("Seeding Inspections with Component Defects...");
  const insp1 = await Inspection.create({
    inspectionId: "INSP-0042",
    asset: roadSH41._id,
    componentId: "CMP-003",
    componentName: "Sanand Agricultural Box Culvert #4",
    inspector: users["inspector"]._id,
    inspectorName: "Kirit Solanki (Quality Inspector)",
    inspectionDate: new Date(2026, 8, 20),
    type: "Routine",
    overallCondition: "Poor",
    defects: [
      {
        description: "Severe Spalling of Concrete on Wing Wall & Edge Cracking (Depth 85mm)",
        severity: "Critical",
        locationSnippet: "km 14+250 Inflow Barrel",
        componentId: "CMP-003",
        componentName: "Sanand Agricultural Box Culvert #4",
        photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop",
        status: "Work Order Issued"
      }
    ],
    notes: "Erosion of foundation noticed. Immediate structural patching and re-decking required before monsoon.",
    verificationStatus: "Verified",
    verifiedBy: "Kirit Solanki (Quality Inspector)"
  });

  const insp2 = await Inspection.create({
    inspectionId: "INSP-0055",
    asset: bldgSachivalaya._id,
    componentId: "CMP-101",
    componentName: "Central Chilled Water HVAC Plant (300 TR)",
    inspector: users["inspector"]._id,
    inspectorName: "Kirit Solanki (Quality Inspector)",
    inspectionDate: new Date(2026, 8, 22),
    type: "Safety",
    overallCondition: "Fair",
    defects: [
      {
        description: "Chiller #2 Compressor high pressure trip & refrigerant line leakage",
        severity: "High",
        locationSnippet: "Basement HVAC Plant Room",
        componentId: "CMP-101",
        componentName: "Central Chilled Water HVAC Plant",
        photoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop",
        status: "Work Order Issued"
      }
    ],
    notes: "HVAC redundancy reduced; temperatures fluctuating on upper floors.",
    verificationStatus: "Verified",
    verifiedBy: "Kirit Solanki"
  });

  // 8. Seed Maintenance Work Orders Linked to Component
  console.log("Seeding Maintenance Work Orders...");
  const wo1 = await WorkOrder.create({
    workOrderId: "WO-001",
    asset: roadSH41._id,
    componentId: "CMP-003",
    componentName: "Sanand Agricultural Box Culvert #4",
    inspection: insp1._id,
    defectIndex: 0,
    title: "Structural Grouting & Wing Wall RCC Patching at Culvert #4",
    description: "Chipping distressed concrete, applying anti-rust zinc primer to exposed rebar, and pressure grouting with polymer-modified mortar.",
    priority: "Urgent",
    status: "In Progress",
    assignedContractor: users["contractor_lnt"]._id,
    contractorCompany: "L&T Infrastructure Ltd",
    assignedEngineer: users["maint_eng"]._id,
    estimatedCost: 2.45,
    actualCost: 0,
    issuedDate: new Date(2026, 8, 21),
    targetCompletionDate: new Date(2026, 9, 10),
    repairDetails: "Equipment mobilized; high-pressure grout pump stationed at km 14+250.",
    beforePhotoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=500&auto=format&fit=crop"
  });

  const wo2 = await WorkOrder.create({
    workOrderId: "WO-002",
    asset: bldgSachivalaya._id,
    componentId: "CMP-101",
    componentName: "Central Chilled Water HVAC Plant (300 TR)",
    inspection: insp2._id,
    defectIndex: 0,
    title: "Chiller #2 Pressure Switch Replacement & 45kg R-134a Gas Recharge",
    description: "Replace faulty high-pressure safety switch, nitrogen leak test circuit, and recharge 45kg refrigerant.",
    priority: "Routine",
    status: "Completed",
    assignedContractor: users["contractor_lnt"]._id,
    contractorCompany: "L&T Infrastructure Ltd",
    assignedEngineer: users["maint_eng"]._id,
    estimatedCost: 1.15,
    actualCost: 1.12,
    issuedDate: new Date(2026, 8, 23),
    completionDate: new Date(2026, 8, 27),
    repairDetails: "Replaced safety sensor, brazed joint, vacuumed down to 500 microns, charged refrigerant. Unit running normally at 42 PSI suction.",
    beforePhotoUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop",
    afterPhotoUrl: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500&auto=format&fit=crop"
  });

  // 9. Documents
  console.log("Seeding Statutory Documents...");
  await Document.insertMany([
    {
      docId: "DOC-0101",
      title: "Detailed Project Report (DPR) - Ahmedabad-Mehsana SH-41",
      category: "DPR",
      fileUrl: "/docs/dpr-sh41.pdf",
      relatedTo: { entityType: "Asset", entityId: roadSH41._id },
      stageKey: "planning",
      uploadedBy: "Vikram Desai (Project Manager)"
    },
    {
      docId: "DOC-0102",
      title: "Administrative Sanction GR No. RNB-2025-788-G",
      category: "Technical Sanction",
      fileUrl: "/docs/technical-sanction-gr788.pdf",
      relatedTo: { entityType: "Asset", entityId: roadSH41._id },
      stageKey: "approval",
      uploadedBy: "Anita Sharma (Superintending Engineer)"
    },
    {
      docId: "DOC-0103",
      title: "L&T EPC Contract Agreement Executed Copy",
      category: "Contract Agreement",
      fileUrl: "/docs/contract-agreement-lnt.pdf",
      relatedTo: { entityType: "Asset", entityId: roadSH41._id },
      stageKey: "tender",
      uploadedBy: "Vikram Desai (Project Manager)"
    },
    {
      docId: "DOC-0201",
      title: "Quality Audit Report - Culvert #4 Structural Condition",
      category: "Inspection Report",
      fileUrl: "/docs/quality-audit-culvert4.pdf",
      relatedTo: { entityType: "Asset", entityId: roadSH41._id },
      stageKey: "inspection",
      uploadedBy: "Kirit Solanki (Quality Inspector)"
    }
  ]);

  // 10. Counters
  console.log("Setting Sequence Counters...");
  await Counter.create({ _id: "asset", n: 10 });
  await Counter.create({ _id: "project", n: 10 });
  await Counter.create({ _id: "inspection", n: 50 });
  await Counter.create({ _id: "workorder", n: 10 });
  await Counter.create({ _id: "document", n: 200 });

  console.log("Database Seed Completed Successfully!");
}

if (process.argv[1]?.endsWith("seed.js")) {
  runSeed().then(() => {
    console.log("Done.");
    process.exit(0);
  }).catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
