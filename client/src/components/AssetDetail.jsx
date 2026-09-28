import React, { useEffect, useState } from "react";
import {
  Layers,
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  Plus,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  ArrowRight,
  Edit2,
  Trash2,
  Check,
  Circle,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function AssetDetail({
  assetId,
  currentUser,
  users = [],
  onClose,
  onOpenAsset,
  onOpenProject,
  onOpenUserProfile,
  onTriggerInspection,
  onTriggerWorkOrder,
  permissions = [],
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Modals inside AssetDetail
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isPeopleModalOpen, setIsPeopleModalOpen] = useState(false);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);

  const { showSuccess, showError } = useToast();

  const isAdmin = currentUser?.role === "admin";
  const canAdvance = permissions.includes("asset.advance") || isAdmin;
  const canEdit = permissions.includes("asset.edit") || isAdmin;
  const canInspect = permissions.includes("inspection.create") || isAdmin;
  const canCreateWO = permissions.includes("maintenance.create") || isAdmin;

  const loadAssetDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getAsset(assetId);
      setData(res);
    } catch (err) {
      console.error("Failed to load asset details:", err);
      showError("Failed to load asset details: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) loadAssetDetails();
  }, [assetId]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", padding: 50 }}>
          <div>Loading central asset repository...</div>
        </div>
      </div>
    );
  }

  if (!data?.asset) return null;

  const { asset, components = [], childAssets = [], inspections = [], workOrders = [], documents = [] } = data;
  const stages = asset.stages || [];
  const curIdx = stages.findIndex((s) => s.key === asset.currentStageKey);
  const curStage = curIdx >= 0 ? stages[curIdx] : null;
  const nextStage = curIdx >= 0 && curIdx < stages.length - 1 ? stages[curIdx + 1] : null;
  const remainingStages = curIdx >= 0 ? stages.slice(curIdx + 1) : [];

  const isRoleAuthorizedForCurrentStage =
    isAdmin ||
    !curStage?.responsibleRoles?.length ||
    curStage.responsibleRoles.includes(currentUser?.role);

  const condClass =
    asset.condition === "Good"
      ? "badge-good"
      : asset.condition === "Fair"
      ? "badge-fair"
      : asset.condition === "Poor"
      ? "badge-poor"
      : "badge-critical";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 960, maxHeight: "94vh", width: "95%" }}
      >
        {/* State Masthead Header */}
        <div className="modal-header" style={{ background: "var(--primary-dark)", color: "#ffffff", padding: "14px 20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-gold" style={{ background: "var(--accent-gold)", color: "#fff", fontSize: 12 }}>
                {asset.assetId}
              </span>
              <span className="badge badge-blue">{asset.type}</span>
              <span className={`badge ${condClass}`}>Condition: {asset.condition}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Jurisdiction: {asset.subDivision?.name || "Gujarat State"}
              </span>
            </div>
            <h2 style={{ fontSize: 20, marginTop: 4, fontWeight: 800 }}>{asset.name}</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ color: "#fff", borderColor: "#475569" }}>
            ✕ Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 12,
            padding: "8px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid var(--border-light)",
            fontSize: 13,
            fontWeight: 700,
            overflowX: "auto",
          }}
        >
          {[
            { id: "overview", label: "Overview & Specs" },
            { id: "lifecycle", label: `Lifecycle Pipeline (${stages.length})` },
            { id: "people", label: "People Associated" },
            { id: "components", label: `Components (${components.length})` },
            { id: "inspections", label: `Inspections (${inspections.length})` },
            { id: "maintenance", label: `Work Orders (${workOrders.length})` },
            { id: "history", label: "Lifecycle History" },
            { id: "documents", label: `Documents (${documents.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "3px solid var(--accent-gold)" : "3px solid transparent",
                color: activeTab === tab.id ? "var(--primary-dark)" : "var(--text-muted)",
                padding: "8px 6px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ minHeight: 460 }}>
          {/* PROMINENT CURRENT LIFECYCLE HERO CARD (Always Visible on Top of Details) */}
          <div className="phase-card-hero">
            <div>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--accent-gold)", fontWeight: 800 }}>
                CURRENT LIFECYCLE PHASE
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2, display: "flex", alignItems: "center", gap: 10 }}>
                <span>🔵 {asset.currentStageName || "Operation & Maintenance"}</span>
                <span className="badge badge-good" style={{ fontSize: 12, background: "rgba(16, 185, 129, 0.25)", color: "#34d399", border: "1px solid #059669" }}>
                  Status: {asset.status}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 4 }}>
                Started: <strong>{curStage?.startedAt ? new Date(curStage.startedAt).toLocaleDateString() : "Active"}</strong> ·
                Responsible Roles: <strong>{curStage?.responsibleRoles?.join(", ") || "All"}</strong>
              </div>
            </div>

            {nextStage && canAdvance && (
              <button
                className="btn btn-gold"
                onClick={() => setIsAdvanceModalOpen(true)}
                disabled={!isRoleAuthorizedForCurrentStage}
                title={!isRoleAuthorizedForCurrentStage ? `Your role '${currentUser?.role}' cannot advance this phase` : ""}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Advance to {nextStage.name} <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* THREE-TIER UPCOMING WORK SUMMARY */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 16,
              background: "var(--bg-alt)",
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              fontSize: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                Current Phase
              </div>
              <div style={{ fontWeight: 800, color: "var(--primary-dark)", marginTop: 2 }}>
                ● {asset.currentStageName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                Next Phase
              </div>
              <div style={{ fontWeight: 700, color: nextStage ? "var(--accent-blue)" : "var(--status-good)", marginTop: 2 }}>
                {nextStage ? `○ ${nextStage.name}` : "✓ Lifecycle Complete"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                Remaining Phases ({remainingStages.length})
              </div>
              <div style={{ color: "var(--text-muted)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {remainingStages.length > 0
                  ? remainingStages.map((s) => s.name).join(" → ")
                  : "All statutory phases completed"}
              </div>
            </div>
          </div>

          {/* TAB 1: OVERVIEW & SPECS */}
          {activeTab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div className="card" style={{ padding: 12, margin: 0 }}>
                  <div className="stat-label">Administrative Jurisdiction</div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>
                    {asset.subDivision?.name || "Gujarat State"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {asset.responsibleOffice}
                  </div>
                </div>

                <div className="card" style={{ padding: 12, margin: 0 }}>
                  <div className="stat-label">Location / Chainage</div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>
                    {asset.location?.chainage || asset.location?.address || "Gujarat R&B Network"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Lat: {asset.location?.lat || 22.3}, Lng: {asset.location?.lng || 72.1}
                  </div>
                </div>

                <div className="card" style={{ padding: 12, margin: 0 }}>
                  <div className="stat-label">Capital Outlay</div>
                  <div style={{ fontWeight: 800, fontSize: 14, marginTop: 4 }}>
                    ₹{asset.sanctionedCost || 0} Crores
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Contractor: {asset.contractorCompany || asset.contractor?.name || "Departmental / EPC"}
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              {asset.attributes && Object.keys(asset.attributes).length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-title" style={{ fontSize: 13, marginBottom: 8 }}>
                    Technical Specifications
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                    {Object.entries(asset.attributes).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #e2e8f0", padding: "4px 0" }}>
                        <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                          {k.replace(/([A-Z])/g, " $1")}
                        </span>
                        <strong>{String(v)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parent Asset Link */}
              {asset.parentAsset && (
                <div className="card" style={{ marginBottom: 16, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="stat-label">Parent Infrastructure Asset</div>
                      <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>
                        {asset.parentAsset.name} ({asset.parentAsset.assetId})
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Type: {asset.parentAsset.type} · Category: {asset.parentAsset.category}
                      </div>
                    </div>
                    {onOpenAsset && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenAsset(asset.parentAsset._id || asset.parentAsset)}
                      >
                        View Parent Asset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Child Infrastructure Assets */}
              {childAssets && childAssets.length > 0 && (
                <div className="card" style={{ marginBottom: 16, padding: 14 }}>
                  <div className="card-title" style={{ fontSize: 13, marginBottom: 10 }}>
                    Child Infrastructure Assets ({childAssets.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                    {childAssets.map((child) => (
                      <div
                        key={child._id}
                        style={{
                          padding: "10px 12px",
                          background: "var(--bg-alt)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-light)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: 13 }}>{child.name}</strong>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {child.assetId} · {child.type}
                          </div>
                        </div>
                        {onOpenAsset && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            onClick={() => onOpenAsset(child._id)}
                          >
                            View Asset
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Originating Project Link */}
              {asset.originatingProject && (
                <div className="card" style={{ marginBottom: 16, padding: 14, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="stat-label">Originating Project</div>
                      <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2 }}>
                        {asset.originatingProject.projectId} · {asset.originatingProject.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Capital project executed by Gujarat R&B
                      </div>
                    </div>
                    {onOpenProject && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onOpenProject(asset.originatingProject._id || asset.originatingProject)}
                      >
                        View Project
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIFECYCLE PIPELINE */}
          {activeTab === "lifecycle" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  End-to-end statutory lifecycle pipeline with assigned roles and completion verification.
                </span>
                {nextStage && canAdvance && (
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => setIsAdvanceModalOpen(true)}
                    disabled={!isRoleAuthorizedForCurrentStage}
                  >
                    Move to {nextStage.name} <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stages.map((stage, idx) => {
                  const isCompleted = idx < curIdx;
                  const isCurrent = idx === curIdx;
                  const isUpcoming = idx > curIdx;

                  let boxClass = "pipeline-step-box pending";
                  if (isCompleted) boxClass = "pipeline-step-box completed";
                  if (isCurrent) boxClass = "pipeline-step-box current";

                  return (
                    <div key={stage.key} className={boxClass}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14 }}>
                              {isCompleted && <span style={{ color: "var(--status-good)", fontWeight: 900 }}>✓</span>}
                              {isCurrent && <span style={{ color: "var(--accent-gold)", fontWeight: 900 }}>●</span>}
                              {isUpcoming && <span style={{ color: "#94a3b8" }}>○</span>}
                            </span>
                            <strong style={{ fontSize: 14, color: isCurrent ? "var(--primary-dark)" : "inherit" }}>
                              Phase {idx + 1}: {stage.name}
                            </strong>
                            {isCompleted && <span className="badge badge-good">Completed</span>}
                            {isCurrent && <span className="badge badge-fair">Active Phase</span>}
                            {isUpcoming && <span className="badge" style={{ background: "#f1f5f9", color: "#64748b" }}>Upcoming</span>}
                          </div>

                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, paddingLeft: 22 }}>
                            {isCompleted && (
                              <span>
                                Completed by:{" "}
                                <strong
                                  style={{
                                    cursor: onOpenUserProfile ? "pointer" : "default",
                                    color: "var(--primary-dark)",
                                    textDecoration: "underline",
                                  }}
                                  onClick={() => onOpenUserProfile && onOpenUserProfile(stage.completedBy)}
                                  title="Click to view officer profile"
                                >
                                  {stage.completedBy || "Authorized Officer"}
                                </strong>{" "}
                                · Date:{" "}
                                {stage.completedAt ? new Date(stage.completedAt).toLocaleDateString() : "–"}
                                {stage.spend > 0 && ` · Spend: ₹${stage.spend} Cr`}
                              </span>
                            )}
                            {isCurrent && (
                              <span>
                                Responsible Roles: <strong>{stage.responsibleRoles?.join(", ") || "Project Team"}</strong> ·
                                Started: {stage.startedAt ? new Date(stage.startedAt).toLocaleDateString() : "Today"}
                              </span>
                            )}
                            {isUpcoming && (
                              <span>
                                Assigned Roles: <strong>{stage.responsibleRoles?.join(", ") || "Designated Officers"}</strong>
                              </span>
                            )}
                          </div>

                          {stage.remarks && (
                            <div style={{ fontSize: 11, fontStyle: "italic", color: "var(--text-muted)", marginTop: 3, paddingLeft: 22 }}>
                              "{stage.remarks}"
                            </div>
                          )}
                        </div>

                        {isCurrent && canAdvance && (
                          <button
                            className="btn btn-gold btn-sm"
                            onClick={() => setIsAdvanceModalOpen(true)}
                            disabled={!isRoleAuthorizedForCurrentStage}
                          >
                            Advance Phase
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PEOPLE ASSOCIATED */}
          {activeTab === "people" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Key officers, field engineers, inspectors, and contractors responsible for this infrastructure asset.
                </span>
                {canEdit && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsPeopleModalOpen(true)}>
                    <UserCheck size={14} /> Assign / Change People
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {/* Project Manager */}
                <div className="card" style={{ margin: 0, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="stat-label">Project Manager</div>
                    {asset.projectManager && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(asset.projectManager)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: asset.projectManager ? "pointer" : "default",
                      color: asset.projectManager ? "var(--primary-dark)" : "inherit",
                    }}
                    onClick={() => asset.projectManager && onOpenUserProfile && onOpenUserProfile(asset.projectManager)}
                    title={asset.projectManager ? "Click to view officer profile" : ""}
                  >
                    <span>👤</span> {asset.projectManager?.name || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {asset.projectManager?.designation || "Project Executive"} · {asset.projectManager?.email || "–"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", marginTop: 6 }}>
                    Associated Phases: Planning, Design, Tender, Handover
                  </div>
                </div>

                {/* Site Engineer */}
                <div className="card" style={{ margin: 0, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="stat-label">Site / Field Engineer</div>
                    {asset.siteEngineer && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(asset.siteEngineer)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: asset.siteEngineer ? "pointer" : "default",
                      color: asset.siteEngineer ? "var(--primary-dark)" : "inherit",
                    }}
                    onClick={() => asset.siteEngineer && onOpenUserProfile && onOpenUserProfile(asset.siteEngineer)}
                    title={asset.siteEngineer ? "Click to view engineer profile" : ""}
                  >
                    <span>👤</span> {asset.siteEngineer?.name || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {asset.siteEngineer?.designation || "Field Supervisor"} · {asset.siteEngineer?.email || "–"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", marginTop: 6 }}>
                    Associated Phases: Construction, Site Inspections
                  </div>
                </div>

                {/* Quality Inspector */}
                <div className="card" style={{ margin: 0, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="stat-label">Quality Inspector</div>
                    {asset.qualityInspector && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(asset.qualityInspector)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: asset.qualityInspector ? "pointer" : "default",
                      color: asset.qualityInspector ? "var(--primary-dark)" : "inherit",
                    }}
                    onClick={() => asset.qualityInspector && onOpenUserProfile && onOpenUserProfile(asset.qualityInspector)}
                    title={asset.qualityInspector ? "Click to view inspector profile" : ""}
                  >
                    <span>👤</span> {asset.qualityInspector?.name || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {asset.qualityInspector?.designation || "State Quality Auditor"} · {asset.qualityInspector?.email || "–"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", marginTop: 6 }}>
                    Associated Phases: Quality Control, Condition Assessment
                  </div>
                </div>

                {/* Maintenance Engineer */}
                <div className="card" style={{ margin: 0, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="stat-label">Maintenance Engineer</div>
                    {asset.maintenanceEngineer && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(asset.maintenanceEngineer)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: asset.maintenanceEngineer ? "pointer" : "default",
                      color: asset.maintenanceEngineer ? "var(--primary-dark)" : "inherit",
                    }}
                    onClick={() => asset.maintenanceEngineer && onOpenUserProfile && onOpenUserProfile(asset.maintenanceEngineer)}
                    title={asset.maintenanceEngineer ? "Click to view engineer profile" : ""}
                  >
                    <span>👤</span> {asset.maintenanceEngineer?.name || "Unassigned"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {asset.maintenanceEngineer?.designation || "Asset Maintenance Officer"} · {asset.maintenanceEngineer?.email || "–"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", marginTop: 6 }}>
                    Associated Phases: Operation & Maintenance, Repairs
                  </div>
                </div>

                {/* Contractor */}
                <div className="card" style={{ margin: 0, padding: 14, gridColumn: "1 / -1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="stat-label">Assigned Contractor / EPC Agency</div>
                    {(asset.contractor || asset.contractorCompany) && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 11, padding: "2px 8px" }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(asset.contractor || asset.contractorCompany)}
                      >
                        View Profile
                      </button>
                    )}
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 15,
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: (asset.contractor || asset.contractorCompany) ? "pointer" : "default",
                      color: (asset.contractor || asset.contractorCompany) ? "var(--primary-dark)" : "inherit",
                    }}
                    onClick={() => (asset.contractor || asset.contractorCompany) && onOpenUserProfile && onOpenUserProfile(asset.contractor || asset.contractorCompany)}
                    title="Click to view contractor profile"
                  >
                    <span>🏢</span> {asset.contractorCompany || asset.contractor?.name || "Unassigned (Open Tender)"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Contract Lead: {asset.contractor?.name || "–"} · {asset.contractor?.email || "–"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--accent-blue)", marginTop: 6 }}>
                    Associated Phases: Construction Execution, Work Order Repairs
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MAINTAINABLE SUB-COMPONENTS */}
          {activeTab === "components" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Major maintainable infrastructure components with independent condition ratings and inspection records.
                </span>
                {canEdit && (
                  <button className="btn btn-gold btn-sm" onClick={() => setIsAddComponentModalOpen(true)}>
                    <Plus size={14} /> Add Component
                  </button>
                )}
              </div>

              {components.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No sub-components registered under this asset yet. Click "+ Add Component" to register pavement, drainage, culverts, HVAC, etc.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {components.map((comp) => {
                    const cCond =
                      comp.condition === "Good"
                        ? "badge-good"
                        : comp.condition === "Fair"
                        ? "badge-fair"
                        : comp.condition === "Poor"
                        ? "badge-poor"
                        : "badge-critical";

                    return (
                      <div
                        key={comp.componentId || comp._id}
                        className="card"
                        style={{
                          margin: 0,
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          borderLeft: comp.maintenanceRequired ? "4px solid var(--status-critical)" : "4px solid var(--primary)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <strong style={{ color: "var(--primary)" }}>{comp.componentId}</strong>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{comp.name}</span>
                            <span className="badge badge-blue">{comp.type}</span>
                            <span className={`badge ${cCond}`}>Condition: {comp.condition}</span>
                            {comp.maintenanceRequired && (
                              <span className="badge badge-critical">Maintenance Required</span>
                            )}
                          </div>

                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                            {comp.chainage && <span>Chainage: {comp.chainage} · </span>}
                            Status: <strong>{comp.status || "Operational"}</strong> · Last Inspected:{" "}
                            {comp.lastInspectionDate ? new Date(comp.lastInspectionDate).toLocaleDateString() : "Never"}
                            {comp.lastMaintenanceDate && (
                              <span> · Last Maintained: {new Date(comp.lastMaintenanceDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 6 }}>
                          {canInspect && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onTriggerInspection(asset._id, comp.componentId, comp.name)}
                              title="Inspect this specific component"
                            >
                              <ShieldCheck size={12} /> Inspect
                            </button>
                          )}
                          {canCreateWO && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onTriggerWorkOrder(asset._id, comp.componentId, comp.name)}
                              title="Issue Work Order for this component"
                            >
                              <Wrench size={12} /> Work Order
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setEditingComponent(comp)}
                              title="Edit Component"
                            >
                              <Edit2 size={12} />
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: "var(--status-critical)" }}
                              onClick={async () => {
                                if (window.confirm(`Remove sub-component '${comp.name}'?`)) {
                                  try {
                                    await api.deleteAssetComponent(asset._id, comp.componentId || comp._id);
                                    showSuccess("Component Removed", `✓ Sub-component '${comp.name}' removed`);
                                    loadAssetDetails();
                                  } catch (err) {
                                    showError("Delete failed: " + err.message);
                                  }
                                }
                              }}
                              title="Remove Component"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INSPECTIONS & DEFECTS */}
          {activeTab === "inspections" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Field quality, safety, and routine inspections recorded on this asset and its sub-components.
                </span>
                {canInspect && (
                  <button className="btn btn-gold btn-sm" onClick={() => onTriggerInspection(asset._id)}>
                    <Plus size={14} /> Start Inspection
                  </button>
                )}
              </div>

              {inspections.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No inspections logged on this asset yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {inspections.map((insp) => (
                    <div key={insp._id} className="card" style={{ margin: 0, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                        <div>
                          <strong>{insp.inspectionId}</strong> · {insp.type} Inspection
                          {insp.componentName && (
                            <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--accent-blue)" }}>
                              [{insp.componentName}]
                            </span>
                          )}
                          <span style={{ marginLeft: 8 }} className="badge badge-blue">
                            {insp.overallCondition}
                          </span>
                          <span
                            style={{ marginLeft: 6 }}
                            className={`badge ${insp.verificationStatus === "Verified" ? "badge-good" : "badge-fair"}`}
                          >
                            {insp.verificationStatus}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {new Date(insp.inspectionDate).toLocaleDateString()} by{" "}
                          <strong
                            style={{
                              cursor: onOpenUserProfile ? "pointer" : "default",
                              color: "var(--primary-dark)",
                              textDecoration: "underline",
                            }}
                            onClick={() => onOpenUserProfile && onOpenUserProfile(insp.inspector || insp.inspectorName)}
                            title="Click to view inspector profile"
                          >
                            {insp.inspectorName}
                          </strong>
                        </span>
                      </div>

                      {insp.notes && (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                          "{insp.notes}"
                        </div>
                      )}

                      {/* Defects List */}
                      {insp.defects?.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                          {insp.defects.map((def, dIdx) => (
                            <div
                              key={dIdx}
                              style={{
                                padding: "8px 10px",
                                background: "#fff1f2",
                                borderLeft: "3px solid var(--status-critical)",
                                borderRadius: "0 4px 4px 0",
                                fontSize: 12,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>{def.description}</strong>
                                <span className="badge badge-critical">{def.severity}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "#881337", marginTop: 2 }}>
                                Location: {def.locationSnippet || "On-site"} · Status: <strong>{def.status}</strong>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: MAINTENANCE WORK ORDERS */}
          {activeTab === "maintenance" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Closed-loop maintenance work orders for defect rectification.
                </span>
                {canCreateWO && (
                  <button className="btn btn-gold btn-sm" onClick={() => onTriggerWorkOrder(asset._id)}>
                    <Plus size={14} /> Issue Work Order
                  </button>
                )}
              </div>

              {workOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No maintenance work orders dispatched for this asset yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {workOrders.map((wo) => (
                    <div key={wo._id} className="card" style={{ margin: 0, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div>
                          <strong>{wo.workOrderId}</strong>: {wo.title}
                          {wo.componentName && (
                            <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--accent-blue)" }}>
                              [{wo.componentName}]
                            </span>
                          )}
                          <span
                            style={{ marginLeft: 8 }}
                            className={`badge ${wo.priority === "Emergency" ? "badge-critical" : "badge-fair"}`}
                          >
                            {wo.priority}
                          </span>
                          <span
                            style={{ marginLeft: 6 }}
                            className={`badge ${wo.status === "Verified & Closed" ? "badge-good" : "badge-blue"}`}
                          >
                            {wo.status}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Issued: {new Date(wo.issuedDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Contractor:{" "}
                        <strong
                          style={{
                            cursor: onOpenUserProfile ? "pointer" : "default",
                            color: "var(--primary-dark)",
                            textDecoration: "underline",
                          }}
                          onClick={() => onOpenUserProfile && onOpenUserProfile(wo.assignedContractor || wo.contractorCompany)}
                          title="Click to view contractor profile"
                        >
                          {wo.contractorCompany || wo.assignedContractor?.name || "Contractor"}
                        </strong>{" "}
                        · Cost: ₹{wo.actualCost || wo.estimatedCost} Lakhs
                      </div>

                      {wo.repairDetails && (
                        <div style={{ marginTop: 6, fontSize: 12, background: "var(--bg-alt)", padding: 8, borderRadius: 4 }}>
                          <strong>Repair Details:</strong> {wo.repairDetails}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: PERMANENT LIFECYCLE HISTORY */}
          {activeTab === "history" && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                Immutable audit timeline of all previous lifecycle transitions for this infrastructure asset.
              </div>
              <div className="timeline-feed">
                {asset.history?.map((h, hIdx) => (
                  <div key={hIdx} className="timeline-item">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <strong>
                        {h.fromStage} → {h.toStage}
                      </strong>
                      <span style={{ color: "var(--text-muted)" }}>
                        {new Date(h.at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      Transition authorized by:{" "}
                      <strong
                        style={{
                          cursor: onOpenUserProfile ? "pointer" : "default",
                          color: "var(--primary-dark)",
                          textDecoration: "underline",
                        }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(h.by)}
                        title="Click to view officer profile"
                      >
                        {h.by}
                      </strong>{" "}
                      ({h.role || "Officer"})
                      {h.spend > 0 && ` · Spend booked: ₹${h.spend} Cr`}
                    </div>
                    {h.remarks && (
                      <div style={{ fontSize: 12, background: "var(--bg-alt)", padding: "4px 8px", borderRadius: 4, marginTop: 4 }}>
                        "{h.remarks}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: CONTEXTUAL DOCUMENTS */}
          {activeTab === "documents" && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
                Statutory and technical documents linked to this physical infrastructure asset:
              </div>
              {documents.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No documents linked to this asset yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {documents.map((doc) => (
                    <div
                      key={doc._id}
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-alt)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>{doc.title}</strong>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Category: {doc.category} · Uploaded by {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="badge badge-blue">
                        <FileText size={12} /> {doc.docId}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: ADVANCE ASSET LIFECYCLE STAGE */}
      {isAdvanceModalOpen && nextStage && (
        <AdvanceAssetModal
          asset={asset}
          currentStage={curStage}
          nextStage={nextStage}
          onClose={() => setIsAdvanceModalOpen(false)}
          onSuccess={(msg) => {
            setIsAdvanceModalOpen(false);
            showSuccess("Lifecycle Updated", msg);
            loadAssetDetails();
          }}
        />
      )}

      {/* PEOPLE ALLOCATION MODAL */}
      {isPeopleModalOpen && (
        <AssignPeopleModal
          asset={asset}
          users={users}
          onClose={() => setIsPeopleModalOpen(false)}
          onSuccess={(msg) => {
            setIsPeopleModalOpen(false);
            showSuccess("Assignments Updated", msg);
            loadAssetDetails();
          }}
        />
      )}

      {/* ADD SUB-COMPONENT MODAL */}
      {isAddComponentModalOpen && (
        <SubComponentModal
          assetId={asset._id}
          onClose={() => setIsAddComponentModalOpen(false)}
          onSuccess={(msg) => {
            setIsAddComponentModalOpen(false);
            showSuccess("Component Added", msg);
            loadAssetDetails();
          }}
        />
      )}

      {/* EDIT SUB-COMPONENT MODAL */}
      {editingComponent && (
        <SubComponentModal
          assetId={asset._id}
          initialComponent={editingComponent}
          onClose={() => setEditingComponent(null)}
          onSuccess={(msg) => {
            setEditingComponent(null);
            showSuccess("Component Updated", msg);
            loadAssetDetails();
          }}
        />
      )}
    </div>
  );
}

// CONFIRMATION MODAL FOR LIFECYCLE TRANSITION
function AdvanceAssetModal({ asset, currentStage, nextStage, onClose, onSuccess }) {
  const [spend, setSpend] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await api.advanceAssetStage(asset._id, {
        spend: Number(spend),
        remarks,
      });
      onSuccess(res.message || `✓ Asset ${asset.assetId} moved to ${nextStage.name}`);
    } catch (err) {
      setError(err.message || "Failed to advance lifecycle stage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Confirm Lifecycle Phase Transition</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleConfirm}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#92400e" }}>
                Move {asset.assetId} to Next Phase?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Current Phase:</span>
                  <div style={{ fontWeight: 800, color: "#92400e" }}>{currentStage?.name}</div>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Next Phase:</span>
                  <div style={{ fontWeight: 800, color: "var(--accent-blue)" }}>{nextStage?.name}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#78350f", marginTop: 8 }}>
                Responsible Roles: <strong>{nextStage?.responsibleRoles?.join(", ") || "Project Team"}</strong>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Phase Expenditure Incurred (₹ Crores)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                style={{ width: "100%" }}
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Transition Remarks & Verification Reason *</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 65 }}
                placeholder="Enter completion reason, technical checks passed, or approval details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Transitioning..." : `Confirm Transition to ${nextStage.name}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ASSIGN / CHANGE PEOPLE MODAL
function AssignPeopleModal({ asset, users = [], onClose, onSuccess }) {
  const [pm, setPm] = useState(asset.projectManager?._id || asset.projectManager || "");
  const [siteEng, setSiteEng] = useState(asset.siteEngineer?._id || asset.siteEngineer || "");
  const [qc, setQc] = useState(asset.qualityInspector?._id || asset.qualityInspector || "");
  const [maint, setMaint] = useState(asset.maintenanceEngineer?._id || asset.maintenanceEngineer || "");
  const [contractor, setContractor] = useState(asset.contractor?._id || asset.contractor || "");
  const [contractorCompany, setContractorCompany] = useState(asset.contractorCompany || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await api.updateAssetPeople(asset._id, {
        projectManager: pm || null,
        siteEngineer: siteEng || null,
        qualityInspector: qc || null,
        maintenanceEngineer: maint || null,
        contractor: contractor || null,
        contractorCompany,
      });
      onSuccess(res.message || `✓ People assignments updated for ${asset.assetId}`);
    } catch (err) {
      setError(err.message || "Failed to update assignments");
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredUsers = (role) => users.filter((u) => u.role === role);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Assign People Associated ({asset.assetId})</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Project Manager</label>
              <select className="form-control" style={{ width: "100%" }} value={pm} onChange={(e) => setPm(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {getFilteredUsers("project_manager").map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.designation || u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Site / Field Engineer</label>
              <select className="form-control" style={{ width: "100%" }} value={siteEng} onChange={(e) => setSiteEng(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {getFilteredUsers("site_engineer").map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.designation || u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Quality Inspector</label>
              <select className="form-control" style={{ width: "100%" }} value={qc} onChange={(e) => setQc(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {getFilteredUsers("quality_inspector").map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.designation || u.email})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Maintenance Engineer</label>
              <select className="form-control" style={{ width: "100%" }} value={maint} onChange={(e) => setMaint(e.target.value)}>
                <option value="">-- Unassigned --</option>
                {getFilteredUsers("maintenance_engineer").map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.designation || u.email})</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor Lead</label>
                <select className="form-control" style={{ width: "100%" }} value={contractor} onChange={(e) => setContractor(e.target.value)}>
                  <option value="">-- Unassigned --</option>
                  {getFilteredUsers("contractor").map((u) => (
                    <option key={u._id} value={u._id}>{u.name} ({u.contractorCompany || "Contractor"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor Company</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="e.g. L&T Infrastructure Ltd"
                  value={contractorCompany}
                  onChange={(e) => setContractorCompany(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Saving..." : "Save People Assignments"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// SUB-COMPONENT ADD / EDIT MODAL
function SubComponentModal({ assetId, initialComponent = null, onClose, onSuccess }) {
  const isEditing = Boolean(initialComponent);
  const [name, setName] = useState(initialComponent?.name || "");
  const [type, setType] = useState(initialComponent?.type || "Pavement");
  const [chainage, setChainage] = useState(initialComponent?.chainage || "");
  const [condition, setCondition] = useState(initialComponent?.condition || "Good");
  const [status, setStatus] = useState(initialComponent?.status || "Operational");
  const [maintenanceRequired, setMaintenanceRequired] = useState(initialComponent?.maintenanceRequired || false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const COMPONENT_TYPES = [
    "Pavement", "Drainage", "Culvert", "Bridge", "Signboards", "Streetlights",
    "Building Block", "HVAC", "Lift System", "Fire Safety", "Electrical System", "Plumbing"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !type) {
      setError("Component name and type are required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isEditing) {
        const res = await api.updateAssetComponent(assetId, initialComponent.componentId || initialComponent._id, {
          name,
          type,
          chainage,
          condition,
          status,
          maintenanceRequired,
        });
        onSuccess(res.message || `✓ Sub-component '${name}' updated`);
      } else {
        const res = await api.addAssetComponent(assetId, {
          name,
          type,
          chainage,
          condition,
          status,
          maintenanceRequired,
        });
        onSuccess(res.message || `✓ Sub-component '${name}' added`);
      }
    } catch (err) {
      setError(err.message || "Failed to save sub-component");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>{isEditing ? "Edit Sub-Component" : "Add Maintainable Sub-Component"}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Component Name *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="e.g. Main Pavement (km 0-15) or Chilled Water Chiller #1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Component Type *</label>
                <select className="form-control" style={{ width: "100%" }} value={type} onChange={(e) => setType(e.target.value)}>
                  {COMPONENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Chainage / Location</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="e.g. km 14+250 or Basement"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Current Condition</label>
                <select className="form-control" style={{ width: "100%" }} value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Operational Status</label>
                <select className="form-control" style={{ width: "100%" }} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Operational">Operational</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="In Progress">In Progress</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={maintenanceRequired}
                  onChange={(e) => setMaintenanceRequired(e.target.checked)}
                />
                Requires Maintenance / Rectification
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Saving..." : isEditing ? "Save Changes" : "Add Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
