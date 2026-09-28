process.env.NODE_ENV = "test";
import "dotenv/config";
import { connectDB } from "./db.js";
import { User, Asset, Project, LifecycleTemplate, WorkOrder, Inspection } from "./models.js";
import app from "./server.js";

async function testBackend() {
  await connectDB();
  console.log("==================================================================");
  console.log("--- Starting Gujarat R&B Asset Management Backend Verification ---");
  console.log("==================================================================");

  // Retrieve test users
  const admin = await User.findOne({ role: "admin" });
  const pm = await User.findOne({ role: "project_manager" });
  const siteEng = await User.findOne({ role: "site_engineer" });
  const inspector = await User.findOne({ role: "quality_inspector" });
  const maintEng = await User.findOne({ role: "maintenance_engineer" });
  const contractor = await User.findOne({ role: "contractor" });
  const mgmt = await User.findOne({ role: "management" });

  console.log(`[PASS] Loaded prototype personas:`);
  console.log(`  - Admin: ${admin.name} (${admin.role})`);
  console.log(`  - PM: ${pm.name} (${pm.role})`);
  console.log(`  - Site Engineer: ${siteEng.name} (${siteEng.role})`);
  console.log(`  - Inspector: ${inspector.name} (${inspector.role})`);
  console.log(`  - Maintenance: ${maintEng.name} (${maintEng.role})`);
  console.log(`  - Contractor: ${contractor.name} (${contractor.role})`);
  console.log(`  - Management: ${mgmt.name} (${mgmt.role})`);

  // Start local server for testing
  const server = app.listen(5099);
  const baseUrl = "http://127.0.0.1:5099/api";

  const request = async (url, method = "GET", user = admin, body = null) => {
    const res = await fetch(`${baseUrl}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": user._id.toString()
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };

  try {
    // -------------------------------------------------------------
    // TEST 1: Accessing Standalone Assets Inventory directly
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Accessing Assets Inventory directly without project context...");
    const resAssets = await request("/assets", "GET", mgmt);
    console.log(`  Status: ${resAssets.status}, Total Assets: ${resAssets.data.length}`);
    if (resAssets.status !== 200 || !resAssets.data.length) throw new Error("Failed to fetch assets directly");
    console.log(`  [PASS] Assets directly accessible: Found "${resAssets.data[0].name}" (${resAssets.data[0].assetId})`);

    // -------------------------------------------------------------
    // TEST 2: Asset Hierarchy & Sub-components
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Testing Asset Hierarchy & Sub-components...");
    const roadAsset = resAssets.data.find((a) => a.type === "Road") || resAssets.data[0];
    const resDetail = await request(`/assets/${roadAsset._id}`, "GET", siteEng);
    console.log(`  Status: ${resDetail.status}, Found ${resDetail.data.components?.length || 0} sub-components`);
    if (resDetail.data.components?.length > 0) {
      console.log(`  [PASS] Component hierarchy verified: Sub-component "${resDetail.data.components[0].name}" (${resDetail.data.components[0].type})`);
    }

    // -------------------------------------------------------------
    // TEST 3: RBAC Security Checks
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Testing RBAC Security: Contractor attempting unauthorized edits...");
    const tpl = await LifecycleTemplate.findOne();
    const resTplEdit = await request(`/lifecycle-templates/${tpl._id}`, "PUT", contractor, {
      name: "Malicious Edit",
      stages: []
    });
    console.log(`  Status: ${resTplEdit.status}, Error: ${resTplEdit.data?.error}`);
    if (resTplEdit.status === 403) {
      console.log("  [PASS] Blocked unauthorized edit with 403 Forbidden!");
    } else {
      throw new Error("Security failure: Contractor was allowed to edit lifecycle template");
    }

    const resUserCreate = await request("/users", "POST", siteEng, {
      name: "Fake User",
      email: "fake@fake.com",
      role: "admin"
    });
    if (resUserCreate.status === 403) {
      console.log("  [PASS] Blocked unauthorized user creation with 403 Forbidden!");
    } else {
      throw new Error("Security failure: Site Engineer was allowed to create user");
    }

    // -------------------------------------------------------------
    // TEST 4: Direct Asset Lifecycle Movement (POST /api/assets/:id/advance)
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Testing Direct Asset Lifecycle Stage Advance...");
    const assetToAdvance = await Asset.findOne({
      "stages.1": { $exists: true },
      currentStageKey: { $ne: "renewal_replacement" }
    });
    
    if (assetToAdvance) {
      const initialStage = assetToAdvance.currentStageName;
      const initialStageKey = assetToAdvance.currentStageKey;
      console.log(`  Advancing Asset '${assetToAdvance.name}' (${assetToAdvance.assetId}) from '${initialStage}'...`);
      
      // Attempt unauthorized advance as Contractor (should fail with 403)
      const resBadAdv = await request(`/assets/${assetToAdvance._id}/advance`, "POST", contractor, {
        spend: 5.0,
        remarks: "Unauthorized advancement"
      });
      if (resBadAdv.status === 403) {
        console.log("  [PASS] Contractor forbidden from advancing asset lifecycle (403).");
      } else {
        throw new Error("Security failure: Contractor was allowed to advance asset lifecycle");
      }

      // Authorized advance using Admin
      const resAdv = await request(`/assets/${assetToAdvance._id}/advance`, "POST", admin, {
        spend: 2.5,
        remarks: "Acceptance test verified milestone completion"
      });
      if (resAdv.status !== 200) {
        throw new Error(`Failed to advance asset stage: ${resAdv.data?.error || resAdv.status}`);
      }
      console.log(`  Advance response message: "${resAdv.data.message}"`);
      console.log(`  New Stage: ${resAdv.data.asset.currentStageName}`);
      
      // Verify persistence in MongoDB
      const reloadedAsset = await Asset.findById(assetToAdvance._id);
      if (reloadedAsset.currentStageKey === initialStageKey) {
        throw new Error("Persistence error: Asset currentStageKey did not change in DB");
      }
      if (!reloadedAsset.history.length || reloadedAsset.history[0].toStage !== reloadedAsset.currentStageName) {
        throw new Error("Audit error: Asset history was not prepended with latest transition");
      }
      console.log(`  [PASS] Direct Asset Lifecycle successfully advanced to '${reloadedAsset.currentStageName}' and verified in DB!`);
    } else {
      console.log("  [SKIP] No multi-stage asset available to advance");
    }

    // -------------------------------------------------------------
    // TEST 5: People Allocation on Asset (PUT /api/assets/:id/people)
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Testing People Allocation on Asset...");
    const resPeople = await request(`/assets/${roadAsset._id}/people`, "PUT", admin, {
      projectManager: pm._id,
      siteEngineer: siteEng._id,
      qualityInspector: inspector._id,
      maintenanceEngineer: maintEng._id,
      contractor: contractor._id,
      contractorCompany: "Gujarat State Infra Projects Ltd"
    });
    if (resPeople.status !== 200) throw new Error("Failed to allocate people on asset");
    console.log(`  Response message: "${resPeople.data.message}"`);
    console.log(`  Allocated PM: ${resPeople.data.asset.projectManager?.name}`);
    console.log(`  Allocated Maintenance Engineer: ${resPeople.data.asset.maintenanceEngineer?.name}`);
    if (resPeople.data.asset.maintenanceEngineer?.email !== maintEng.email) {
      throw new Error("People allocation did not properly populate in DB");
    }
    console.log("  [PASS] People allocation successfully updated and verified!");

    // -------------------------------------------------------------
    // TEST 6: Sub-Component CRUD Operations & Closed-Loop Maintenance
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Testing Sub-Component CRUD Lifecycle...");
    // 6a. Add new sub-component
    const resAddComp = await request(`/assets/${roadAsset._id}/components`, "POST", siteEng, {
      name: "Solar High-Mast Lighting",
      type: "Electrical",
      chainage: "km 12+800",
      condition: "Good",
      status: "Operational",
      specs: { wattage: "400W", poleCount: 4 }
    });
    if (resAddComp.status !== 201) throw new Error("Failed to add sub-component");
    const createdComp = resAddComp.data.component;
    console.log(`  Step 6a (Add Component): Created "${createdComp.name}" with ID: ${createdComp.componentId} (_id: ${createdComp._id})`);

    // 6b. Update sub-component condition
    const resUpdComp = await request(`/assets/${roadAsset._id}/components/${createdComp._id}`, "PUT", siteEng, {
      condition: "Poor",
      maintenanceRequired: true
    });
    if (resUpdComp.status !== 200 || resUpdComp.data.component.condition !== "Poor") {
      throw new Error("Failed to update sub-component condition to Poor");
    }
    console.log(`  Step 6b (Update Component): Updated condition to '${resUpdComp.data.component.condition}', maintenanceRequired: ${resUpdComp.data.component.maintenanceRequired}`);

    // 6c. Component-level Inspection
    const resCompInsp = await request("/inspections", "POST", inspector, {
      assetId: roadAsset._id,
      componentId: createdComp._id.toString(),
      componentName: createdComp.name,
      type: "Safety",
      overallCondition: "Critical",
      defects: [
        {
          description: "Inverter failure and blown surge protector",
          severity: "Critical",
          locationSnippet: "Pole #2 km 12+800",
          status: "Open"
        }
      ],
      notes: "Dark zone on curve. Needs urgent component replacement."
    });
    if (resCompInsp.status !== 201) throw new Error("Failed to record component inspection");
    console.log(`  Step 6c (Component Inspection): Recorded inspection ${resCompInsp.data.inspection.inspectionId}`);

    // Verify component condition in DB became Critical
    const assetAfterInsp = await Asset.findById(roadAsset._id);
    const inspectedComp = assetAfterInsp.components.id(createdComp._id);
    if (inspectedComp.condition !== "Critical") {
      throw new Error(`Expected component condition to be 'Critical', found '${inspectedComp.condition}'`);
    }
    console.log(`  Component condition in asset verified as: '${inspectedComp.condition}'`);

    // 6d. Component-level Work Order & Closed Loop Repair
    const resCompWO = await request("/work-orders", "POST", maintEng, {
      assetId: roadAsset._id,
      componentId: createdComp._id.toString(),
      componentName: createdComp.name,
      inspectionId: resCompInsp.data.inspection._id,
      defectIndex: 0,
      title: "Replace High-Mast Inverter & Surge Module",
      description: "Supply and install industrial 400W solar inverter with warranty",
      priority: "Emergency",
      assignedContractorId: contractor._id,
      estimatedCost: 0.85
    });
    if (resCompWO.status !== 201) throw new Error("Failed to create work order for component");
    const compWO = resCompWO.data.workOrder;
    console.log(`  Step 6d (Component Work Order): Created ${compWO.workOrderId}`);

    // Contractor completes repair
    const resCompProg = await request(`/work-orders/${compWO._id}/progress`, "PUT", contractor, {
      status: "Completed",
      repairDetails: "Replaced inverter with Siemens module. All 4 luminaires tested and operational.",
      actualCost: 0.80
    });
    if (resCompProg.status !== 200) throw new Error("Failed to submit contractor repair progress");

    // Maintenance Engineer verifies and closes work order
    const resCompVerify = await request(`/work-orders/${compWO._id}/verify`, "POST", maintEng, {
      engineerRemarks: "Tested lux output at night. Meets IRC standards. System fully restored.",
      newCondition: "Good"
    });
    if (resCompVerify.status !== 200) throw new Error("Failed to verify component work order");
    console.log(`  Step 6e (Component Verification): Closed work order ${compWO.workOrderId}`);

    // Verify component condition restored to 'Good' and maintenanceRequired is cleared
    const assetAfterFix = await Asset.findById(roadAsset._id);
    const restoredComp = assetAfterFix.components.id(createdComp._id);
    if (restoredComp.condition !== "Good" || restoredComp.maintenanceRequired !== false) {
      throw new Error(`Component condition not restored to Good! Current: condition=${restoredComp.condition}, maintenanceRequired=${restoredComp.maintenanceRequired}`);
    }
    console.log(`  [PASS] Component condition successfully restored to '${restoredComp.condition}', maintenanceRequired: false`);

    // 6f. Delete test sub-component
    const resDelComp = await request(`/assets/${roadAsset._id}/components/${createdComp._id}`, "DELETE", siteEng);
    if (resDelComp.status !== 200) throw new Error("Failed to delete test sub-component");
    const assetAfterDel = await Asset.findById(roadAsset._id);
    if (assetAfterDel.components.id(createdComp._id)) {
      throw new Error("Persistence error: Sub-component was not deleted from DB");
    }
    console.log(`  Step 6f (Delete Component): [PASS] Successfully removed test component from asset!`);

    // -------------------------------------------------------------
    // TEST 7: Dashboard Aggregations
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Testing Role-Appropriate Dashboard Aggregations...");
    const resStats = await request("/dashboard/stats", "GET", mgmt);
    console.log(`  Status: ${resStats.status}, Total Assets: ${resStats.data.totalAssets}, Total Projects: ${resStats.data.totalProjects}`);
    if (resStats.status !== 200 || resStats.data.totalAssets === undefined) throw new Error("Dashboard stats failed");
    console.log("  [PASS] Dashboard metrics computed properly!");

    console.log("\n==================================================================");
    console.log("ALL 7/7 BACKEND ACCEPTANCE AND INTEGRATION TESTS PASSED!");
    console.log("==================================================================");

  } finally {
    server.close();
  }
}

testBackend().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
