import React, { useState, useEffect, useCallback } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AssetInventory from "./components/AssetInventory";
import AssetDetail from "./components/AssetDetail";
import ProjectsView from "./components/ProjectsView";
import ProjectDetail from "./components/ProjectDetail";
import InspectionsView, { AddInspectionModal } from "./components/InspectionsView";
import MaintenanceBoard, { CreateWorkOrderModal } from "./components/MaintenanceBoard";
import GisMap from "./components/GisMap";
import LifecycleBuilder from "./components/LifecycleBuilder";
import UserManagement from "./components/UserManagement";
import AuditView from "./components/AuditView";
import UserProfileModal from "./components/UserProfileModal";
import { api } from "./services/api";
import { ToastProvider, useToast } from "./context/ToastContext";

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}

function AppShell() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [assets, setAssets] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [reseedLoading, setReseedLoading] = useState(false);

  // Modals & Target Selectors
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [inspectionTarget, setInspectionTarget] = useState(null); // { assetId, componentId, componentName }
  const [workOrderTarget, setWorkOrderTarget] = useState(null);   // { assetId, componentId, componentName }

  const { showSuccess, showError } = useToast();

  const handleOpenUserProfile = (userOrId) => {
    if (!userOrId) return;
    if (typeof userOrId === "object" && userOrId._id) {
      setProfileUserId(userOrId._id);
    } else if (typeof userOrId === "string") {
      const cleaned = userOrId.replace(/\s*\([^)]*\)/g, "").trim();
      const match = users.find(
        (u) =>
          u._id === userOrId ||
          u.name.toLowerCase() === cleaned.toLowerCase() ||
          u.email.toLowerCase() === cleaned.toLowerCase() ||
          cleaned.toLowerCase().includes(u.name.toLowerCase())
      );
      setProfileUserId(match ? match._id : userOrId);
    }
  };

  const bootstrap = useCallback(async () => {
    try {
      const [uList, nList] = await Promise.all([
        api.getUsers(),
        api.getHierarchy(),
      ]);
      setUsers(uList);
      setNodes(nList);

      const savedUserId = localStorage.getItem("iams_active_user_id");
      const matched = (uList && uList.find((u) => u._id === savedUserId)) || uList?.[0];
      if (matched) {
        localStorage.setItem("iams_active_user_id", matched._id);
        selectUser(matched._id, false);
      }
    } catch (err) {
      console.error("Bootstrap error:", err);
      showError("Connection Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const selectUser = async (userId, notify = true) => {
    localStorage.setItem("iams_active_user_id", userId);
    try {
      const curData = await api.getCurrentUser();
      setCurrentUser(curData.user);
      setPermissions(curData.permissions || []);

      const aList = await api.getAssets();
      setAssets(aList);

      if (notify && curData.user) {
        showSuccess(
          "User Context Switched",
          `✓ Logged in as ${curData.user.name} (${curData.user.role.replace("_", " ")})`
        );
      }
    } catch (err) {
      console.error("Failed to set user context:", err);
      showError("User Switch Error: " + err.message);
    }
  };

  const handleReseed = async () => {
    if (!window.confirm("Reset database to baseline Gujarat R&B demo dataset?")) return;
    setReseedLoading(true);
    try {
      const res = await api.reseedDatabase();
      showSuccess("Database Reset", res.message || "✓ Dataset reseeded successfully");
      bootstrap();
    } catch (err) {
      showError("Reset Failed: " + err.message);
    } finally {
      setReseedLoading(false);
    }
  };

  const hasPerm = (perm) => {
    if (currentUser?.role === "admin") return true;
    return permissions.includes(perm);
  };

  if (loading && !users.length) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
        <div>Loading Gujarat R&B Infrastructure Asset Management System...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* State Masthead with Prototype User Switcher */}
      <Header
        users={users}
        currentUser={currentUser}
        onSelectUser={(uId) => selectUser(uId, true)}
        onReseed={handleReseed}
        loadingReseed={reseedLoading}
      />

      <div className="app-container">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          permissions={permissions}
          currentUser={currentUser}
        />

        {/* Main Content Area */}
        <main className="app-content">
          {activeTab === "dashboard" && (
            <Dashboard
              currentUser={currentUser}
              onNavigate={setActiveTab}
              onOpenAsset={setSelectedAssetId}
              onOpenProject={setSelectedProjectId}
              onOpenUserProfile={handleOpenUserProfile}
            />
          )}

          {activeTab === "assets" && (
            <AssetInventory
              currentUser={currentUser}
              nodes={nodes}
              onOpenAsset={setSelectedAssetId}
              canCreateAsset={hasPerm("asset.create")}
            />
          )}

          {activeTab === "projects" && (
            <ProjectsView
              currentUser={currentUser}
              nodes={nodes}
              onOpenProject={setSelectedProjectId}
              onOpenAsset={setSelectedAssetId}
              onOpenUserProfile={handleOpenUserProfile}
              canCreateProject={hasPerm("project.create")}
            />
          )}

          {activeTab === "inspections" && (
            <InspectionsView
              currentUser={currentUser}
              assets={assets}
              onOpenAsset={setSelectedAssetId}
              onOpenUserProfile={handleOpenUserProfile}
              canInspect={hasPerm("inspection.create")}
              canVerifyInspection={hasPerm("inspection.verify")}
            />
          )}

          {activeTab === "maintenance" && (
            <MaintenanceBoard
              currentUser={currentUser}
              assets={assets}
              users={users}
              onOpenAsset={setSelectedAssetId}
              onOpenUserProfile={handleOpenUserProfile}
              canCreateWO={hasPerm("maintenance.create")}
              canUpdateWO={hasPerm("maintenance.update")}
              canVerifyWO={hasPerm("maintenance.verify")}
            />
          )}

          {activeTab === "map" && (
            <GisMap
              assets={assets}
              onOpenAsset={setSelectedAssetId}
            />
          )}

          {activeTab === "lifecycle_builder" && (
            <LifecycleBuilder
              currentUser={currentUser}
              canEditLifecycle={hasPerm("lifecycle.edit")}
            />
          )}

          {activeTab === "user_mgmt" && (
            <UserManagement
              currentUser={currentUser}
              nodes={nodes}
              onRefreshUsers={bootstrap}
              onOpenUserProfile={handleOpenUserProfile}
            />
          )}

          {activeTab === "audit" && (
            <AuditView
              currentUser={currentUser}
              onOpenAsset={setSelectedAssetId}
              onOpenUserProfile={handleOpenUserProfile}
            />
          )}
        </main>
      </div>

      {/* GLOBAL MODALS */}

      {/* Central Asset Detail Repository */}
      {selectedAssetId && (
        <AssetDetail
          assetId={selectedAssetId}
          currentUser={currentUser}
          users={users}
          permissions={permissions}
          onClose={() => setSelectedAssetId(null)}
          onOpenAsset={setSelectedAssetId}
          onOpenProject={setSelectedProjectId}
          onOpenUserProfile={handleOpenUserProfile}
          onTriggerInspection={(aId, cId, cName) =>
            setInspectionTarget({ assetId: aId, componentId: cId || "", componentName: cName || "" })
          }
          onTriggerWorkOrder={(aId, cId, cName) =>
            setWorkOrderTarget({ assetId: aId, componentId: cId || "", componentName: cName || "" })
          }
        />
      )}

      {/* Project Detail & Lifecycle Navigator */}
      {selectedProjectId && (
        <ProjectDetail
          projectId={selectedProjectId}
          currentUser={currentUser}
          permissions={permissions}
          onClose={() => setSelectedProjectId(null)}
          onOpenAsset={setSelectedAssetId}
          onOpenUserProfile={handleOpenUserProfile}
          onViewCreatedAsset={(aId) => {
            setSelectedProjectId(null);
            setSelectedAssetId(aId);
          }}
        />
      )}

      {/* Read-Only Official User Profile Modal */}
      {profileUserId && (
        <UserProfileModal
          userId={profileUserId}
          fallbackUser={users.find((u) => u._id === profileUserId || u.name === profileUserId)}
          onClose={() => setProfileUserId(null)}
          onOpenAsset={setSelectedAssetId}
          onOpenProject={setSelectedProjectId}
        />
      )}

      {/* Triggered Field Inspection Modal */}
      {inspectionTarget && (
        <AddInspectionModal
          assets={assets}
          defaultAssetId={inspectionTarget.assetId}
          defaultComponentId={inspectionTarget.componentId}
          defaultComponentName={inspectionTarget.componentName}
          onClose={() => setInspectionTarget(null)}
          onSuccess={(msg) => {
            setInspectionTarget(null);
            showSuccess("Inspection Logged", msg || "✓ Inspection recorded successfully");
            api.getAssets().then(setAssets);
          }}
        />
      )}

      {/* Triggered Work Order Modal */}
      {workOrderTarget && (
        <CreateWorkOrderModal
          assets={assets}
          contractors={users.filter((u) => u.role === "contractor")}
          defaultAssetId={workOrderTarget.assetId}
          defaultComponentId={workOrderTarget.componentId}
          defaultComponentName={workOrderTarget.componentName}
          onClose={() => setWorkOrderTarget(null)}
          onSuccess={(msg) => {
            setWorkOrderTarget(null);
            showSuccess("Work Order Dispatched", msg || "✓ Work order created successfully");
            api.getAssets().then(setAssets);
          }}
        />
      )}
    </div>
  );
}
