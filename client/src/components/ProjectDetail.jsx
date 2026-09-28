import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  FileText,
  DollarSign,
  UserCheck,
  Building,
  Layers,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ProjectDetail({
  projectId,
  currentUser,
  onClose,
  onViewCreatedAsset,
  onOpenAsset,
  onOpenUserProfile,
  permissions = [],
}) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  const canAdvance = permissions.includes("project.advance") || currentUser?.role === "admin";

  const loadProject = async () => {
    setLoading(true);
    try {
      const data = await api.getProject(projectId);
      setProject(data);
    } catch (err) {
      console.error("Failed to load project details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", padding: 40 }}>
          <div>Loading project lifecycle...</div>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const template = project.lifecycleTemplate;
  const stages = template?.stages || [];
  const curIdx = stages.findIndex((s) => s.key === project.currentStageKey);
  const curStageDef = stages[curIdx];
  const nextStageDef = curIdx < stages.length - 1 ? stages[curIdx + 1] : null;

  // Check if current user role is authorized to complete the current stage
  const isRoleAuthorizedForStage =
    currentUser?.role === "admin" ||
    (curStageDef?.responsibleRoles && curStageDef.responsibleRoles.includes(currentUser?.role));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 900, maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: "var(--primary-dark)", color: "#ffffff" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="badge badge-gold" style={{ background: "var(--accent-gold)", color: "#fff" }}>
                {project.projectId}
              </span>
              <span className="badge badge-blue">{project.category}</span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                Sub-Division: {project.subDivision?.name}
              </span>
            </div>
            <h2 style={{ fontSize: 18, marginTop: 4, fontWeight: 700 }}>{project.name}</h2>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ color: "#fff", borderColor: "#475569" }}>
            ✕ Close
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: 400 }}>
          {/* Key Metrics Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div className="card" style={{ padding: 10, margin: 0 }}>
              <div className="stat-label">Sanctioned Budget</div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>₹{project.sanctionedBudget} Cr</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Spent: ₹{project.spentAmount} Cr
              </div>
            </div>

            <div className="card" style={{ padding: 10, margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="stat-label">Project Manager</div>
                {project.projectManager && onOpenUserProfile && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: "1px 6px" }}
                    onClick={() => onOpenUserProfile(project.projectManager)}
                  >
                    Profile
                  </button>
                )}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginTop: 2,
                  cursor: project.projectManager && onOpenUserProfile ? "pointer" : "default",
                  color: project.projectManager && onOpenUserProfile ? "var(--primary-dark)" : "inherit",
                  textDecoration: project.projectManager && onOpenUserProfile ? "underline" : "none",
                }}
                onClick={() => project.projectManager && onOpenUserProfile && onOpenUserProfile(project.projectManager)}
                title={project.projectManager ? "Click to view officer profile" : ""}
              >
                {project.projectManager?.name || "Unassigned"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {project.projectManager?.designation || "Project Lead"}
              </div>
            </div>

            <div className="card" style={{ padding: 10, margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="stat-label">Contractor</div>
                {(project.contractor || project.contractorCompany) && onOpenUserProfile && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 10, padding: "1px 6px" }}
                    onClick={() => onOpenUserProfile(project.contractor || project.contractorCompany)}
                  >
                    Profile
                  </button>
                )}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginTop: 2,
                  cursor: (project.contractor || project.contractorCompany) && onOpenUserProfile ? "pointer" : "default",
                  color: (project.contractor || project.contractorCompany) && onOpenUserProfile ? "var(--primary-dark)" : "inherit",
                  textDecoration: (project.contractor || project.contractorCompany) && onOpenUserProfile ? "underline" : "none",
                }}
                onClick={() => (project.contractor || project.contractorCompany) && onOpenUserProfile && onOpenUserProfile(project.contractor || project.contractorCompany)}
                title="Click to view contractor profile"
              >
                {project.contractorCompany || project.contractor?.name || "Pending Award"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Execution Agency
              </div>
            </div>

            <div className="card" style={{ padding: 10, margin: 0 }}>
              <div className="stat-label">Lifecycle Progress</div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--accent-blue)" }}>
                {project.progressPercentage}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Stage: {project.currentStageName}
              </div>
            </div>
          </div>

          {/* Handover Notice / Created Asset Link */}
          {project.createdAsset && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong style={{ color: "#065f46", display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} /> Handover Completed: Physical Asset Operational
                </strong>
                <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>
                  Physical Asset ID: <strong>{project.createdAsset.assetId}</strong> ({project.createdAsset.name})
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onViewCreatedAsset(project.createdAsset._id)}
              >
                <Layers size={12} /> Open Asset Inventory Profile
              </button>
            </div>
          )}

          {/* Interactive Lifecycle Stages Pipeline */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header" style={{ marginBottom: 10, paddingBottom: 6 }}>
              <div className="card-title" style={{ fontSize: 14 }}>
                <FolderKanban size={16} /> Configurable Lifecycle Pipeline ({stages.length} Stages)
              </div>
              {nextStageDef && canAdvance && (
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => setIsAdvanceModalOpen(true)}
                  disabled={!isRoleAuthorizedForStage}
                  title={
                    !isRoleAuthorizedForStage
                      ? `Role '${currentUser?.role}' cannot complete this stage. Required: ${curStageDef?.responsibleRoles?.join(", ")}`
                      : ""
                  }
                >
                  <ArrowRight size={14} /> Advance to {nextStageDef.name}
                </button>
              )}
            </div>

            {/* Stepper Grid */}
            <div className="lifecycle-stepper">
              {stages.map((st, idx) => {
                const isCompleted = idx < curIdx;
                const isCurrent = idx === curIdx;
                const stageInst = project.stages.find((s) => s.key === st.key);

                return (
                  <div
                    key={st.key}
                    className={`step-node ${isCompleted ? "completed" : isCurrent ? "current" : "pending"}`}
                  >
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>
                      Stage {idx + 1}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                      {st.name}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>
                      {isCompleted ? (
                        <span style={{ color: "var(--status-good)", fontWeight: 600 }}>✓ Done</span>
                      ) : isCurrent ? (
                        <span style={{ color: "var(--accent-gold)", fontWeight: 700 }}>● Active</span>
                      ) : (
                        <span style={{ color: "var(--text-light)" }}>○ Pending</span>
                      )}
                    </div>
                    {stageInst?.completedAt && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                        {new Date(stageInst.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current Active Stage Description & Requirements */}
            {curStageDef && (
              <div
                style={{
                  background: "var(--bg-alt)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>Current Stage Requirements: {curStageDef.name}</strong>
                  <span style={{ color: "var(--text-muted)" }}>
                    Authorized Roles: <strong>{curStageDef.responsibleRoles?.join(", ") || "All"}</strong>
                  </span>
                </div>
                <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
                  {curStageDef.description || "Execution and technical compliance phase."}
                </div>
                {curStageDef.requiredDocuments?.length > 0 && (
                  <div style={{ marginTop: 4, color: "var(--accent-blue)" }}>
                    Required Documents: {curStageDef.requiredDocuments.join(", ")}
                  </div>
                )}
                {!isRoleAuthorizedForStage && (
                  <div style={{ color: "var(--status-critical)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <ShieldAlert size={14} /> You cannot advance this stage. Your role '{currentUser?.role}' does not match permitted roles.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Immutable Project History Timeline */}
          <div className="card">
            <div className="card-title" style={{ fontSize: 14, marginBottom: 12 }}>
              Immutable Lifecycle Audit Timeline
            </div>
            <div className="timeline-feed">
              {project.history?.map((h, hIdx) => (
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
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Advance Stage Modal */}
      {isAdvanceModalOpen && nextStageDef && (
        <AdvanceStageModal
          project={project}
          currentStageDef={curStageDef}
          nextStageDef={nextStageDef}
          onClose={() => setIsAdvanceModalOpen(false)}
          onSuccess={() => {
            setIsAdvanceModalOpen(false);
            loadProject();
          }}
        />
      )}
    </div>
  );
}

function AdvanceStageModal({ project, currentStageDef, nextStageDef, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [spend, setSpend] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isHandover = currentStageDef.allowsHandoverToAsset || currentStageDef.key === "handover";

  const handleAdvance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await api.advanceProjectStage(project._id, {
        spend: Number(spend),
        remarks,
        docTitle,
      });
      showSuccess(
        "Project Lifecycle Updated",
        res?.message || `Stage '${currentStageDef.name}' completed. Advanced to next phase.`
      );
      onSuccess(res);
    } catch (err) {
      const errMsg = err.message || "Failed to advance stage";
      setError(errMsg);
      showError("Stage Advancement Failed", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>
            Complete Stage: {currentStageDef.name}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleAdvance}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ background: "var(--bg-alt)", padding: 10, borderRadius: 4, fontSize: 12 }}>
              <div>
                Moving lifecycle from <strong>{currentStageDef.name}</strong> →{" "}
                <strong style={{ color: "var(--accent-blue)" }}>{nextStageDef.name}</strong>
              </div>
            </div>

            {isHandover && (
              <div
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: 10,
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#065f46",
                }}
              >
                <strong>Handover & Commissioning Event:</strong> Advancing this stage will automatically create
                and activate the official physical <strong>Asset</strong> record in the state inventory!
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Stage Expenditure Incurred (₹ Crores)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="0.00"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Remarks & Verification Notes *</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 70 }}
                placeholder="Enter completion reason, technical checks, or approval resolutions..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Statutory Document Reference (Optional)</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="e.g. As-Built Drawing #R&B-2026-09 or Quality Certificate"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Advancing..." : `Confirm & Move to ${nextStageDef.name}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
