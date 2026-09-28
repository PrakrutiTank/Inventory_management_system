import React, { useState, useEffect } from "react";
import {
  Sliders,
  Plus,
  ArrowDown,
  ArrowUp,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldAlert,
  Save,
  HelpCircle,
} from "lucide-react";
import { api } from "../services/api";

const AVAILABLE_ROLES = [
  { id: "admin", label: "System Administrator" },
  { id: "department_officer", label: "Department Officer" },
  { id: "project_manager", label: "Project Manager" },
  { id: "site_engineer", label: "Site / Field Engineer" },
  { id: "quality_inspector", label: "Quality Inspector" },
  { id: "maintenance_engineer", label: "Maintenance Engineer" },
  { id: "contractor", label: "Contractor" },
];

export default function LifecycleBuilder({ currentUser, canEditLifecycle }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTplId, setSelectedTplId] = useState("");
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState(null);
  const [isNewStage, setIsNewStage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getLifecycleTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTplId) {
        setSelectedTplId(data[0]._id);
        setActiveTemplate(JSON.parse(JSON.stringify(data[0])));
      } else if (selectedTplId) {
        const found = data.find((t) => t._id === selectedTplId);
        if (found) setActiveTemplate(JSON.parse(JSON.stringify(found)));
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentUser]);

  const handleSelectTemplate = (id) => {
    setSelectedTplId(id);
    const found = templates.find((t) => t._id === id);
    if (found) {
      setActiveTemplate(JSON.parse(JSON.stringify(found)));
      setMsg({ text: "", type: "" });
    }
  };

  const moveStage = (index, direction) => {
    if (!canEditLifecycle) return;
    const stages = [...activeTemplate.stages];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const temp = stages[index];
    stages[index] = stages[targetIdx];
    stages[targetIdx] = temp;

    // update orders
    stages.forEach((s, idx) => (s.order = idx + 1));
    setActiveTemplate({ ...activeTemplate, stages });
  };

  const deleteStage = (index) => {
    if (!canEditLifecycle) return;
    if (activeTemplate.stages.length <= 2) {
      alert("A lifecycle template must have at least 2 stages.");
      return;
    }
    const stages = activeTemplate.stages.filter((_, i) => i !== index);
    stages.forEach((s, idx) => (s.order = idx + 1));
    setActiveTemplate({ ...activeTemplate, stages });
  };

  const openAddStage = () => {
    setEditingStage({
      key: `custom_${Date.now()}`,
      name: "New Stage",
      description: "Description of stage responsibilities",
      order: activeTemplate.stages.length + 1,
      responsibleRoles: ["project_manager", "site_engineer"],
      requiredActions: [],
      requiredDocuments: [],
      allowsHandoverToAsset: false,
    });
    setIsNewStage(true);
  };

  const saveStageModal = (stageData) => {
    let stages = [...activeTemplate.stages];
    if (isNewStage) {
      stages.push(stageData);
    } else {
      stages = stages.map((s) => (s.key === stageData.key ? stageData : s));
    }
    stages.forEach((s, idx) => (s.order = idx + 1));
    setActiveTemplate({ ...activeTemplate, stages });
    setEditingStage(null);
  };

  const handleSaveTemplate = async () => {
    if (!canEditLifecycle) return;
    setSaving(true);
    setMsg({ text: "", type: "" });
    try {
      const updated = await api.updateLifecycleTemplate(activeTemplate._id, activeTemplate);
      setMsg({ text: "Lifecycle process template updated and audited successfully!", type: "success" });
      fetchTemplates();
    } catch (err) {
      setMsg({ text: err.message || "Failed to update lifecycle template", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Configurable Lifecycle Process Builder
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Define, reorder, add, and configure responsible roles, documents, and handover conditions for infrastructure projects.
          </p>
        </div>
        {canEditLifecycle && (
          <button className="btn btn-gold" onClick={handleSaveTemplate} disabled={saving}>
            <Save size={14} /> {saving ? "Saving..." : "Save Process Changes"}
          </button>
        )}
      </div>

      {!canEditLifecycle && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 10, borderRadius: 4, marginBottom: 14, fontSize: 12, display: "flex", alignItems: "center", gap: 6, color: "#92400e" }}>
          <ShieldAlert size={16} /> Read-Only Mode: Your role '{currentUser?.role}' cannot modify system-wide lifecycle templates.
        </div>
      )}

      {msg.text && (
        <div
          style={{
            padding: 10,
            borderRadius: 4,
            marginBottom: 14,
            fontSize: 12,
            background: msg.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: msg.type === "success" ? "#065f46" : "#991b1b",
            border: `1px solid ${msg.type === "success" ? "#a7f3d0" : "#fca5a5"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Template Selector Bar */}
      <div className="filter-bar">
        <label style={{ fontSize: 12, fontWeight: 700 }}>Select Project Template:</label>
        <select
          className="form-control"
          style={{ minWidth: 260 }}
          value={selectedTplId}
          onChange={(e) => handleSelectTemplate(e.target.value)}
        >
          {templates.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name} ({t.category})
            </option>
          ))}
        </select>
        {activeTemplate && (
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
            {activeTemplate.description}
          </span>
        )}
      </div>

      {/* Interactive Process Pipeline */}
      {activeTemplate && (
        <div className="card" style={{ maxWidth: 800, margin: "0 auto 20px" }}>
          <div className="card-header" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ fontSize: 15 }}>
              Process Workflow ({activeTemplate.stages?.length} Sequential Stages)
            </div>
            {canEditLifecycle && (
              <button className="btn btn-secondary btn-sm" onClick={openAddStage}>
                <Plus size={12} /> Add Stage
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeTemplate.stages?.map((stage, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === activeTemplate.stages.length - 1;

              return (
                <React.Fragment key={stage.key || idx}>
                  <div
                    style={{
                      border: "1px solid var(--border-light)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 16px",
                      background: stage.allowsHandoverToAsset ? "#f0fdf4" : "var(--bg-alt)",
                      borderLeft: stage.allowsHandoverToAsset
                        ? "4px solid var(--status-good)"
                        : "4px solid var(--primary)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)" }}>
                          STAGE {idx + 1}
                        </span>
                        <strong style={{ fontSize: 14 }}>{stage.name}</strong>
                        {stage.allowsHandoverToAsset && (
                          <span className="badge badge-good">✓ Asset Handover Point</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {stage.description || "Stage execution details"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-light)", marginTop: 4 }}>
                        Authorized Roles: <strong>{stage.responsibleRoles?.join(", ") || "All"}</strong>
                        {stage.requiredDocuments?.length > 0 && ` · Required Docs: ${stage.requiredDocuments.join(", ")}`}
                      </div>
                    </div>

                    {canEditLifecycle && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isFirst}
                          onClick={() => moveStage(idx, -1)}
                          title="Move Stage Up"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={isLast}
                          onClick={() => moveStage(idx, 1)}
                          title="Move Stage Down"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingStage(stage);
                            setIsNewStage(false);
                          }}
                          title="Configure Stage Details"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: "var(--status-critical)" }}
                          onClick={() => deleteStage(idx)}
                          title="Remove Stage"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {!isLast && (
                    <div style={{ textAlign: "center", color: "var(--text-light)", margin: "-4px 0" }}>
                      ↓
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {canEditLifecycle && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={openAddStage}>
                <Plus size={14} /> Add Another Stage
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit Stage Modal */}
      {editingStage && (
        <StageEditorModal
          stage={editingStage}
          onClose={() => setEditingStage(null)}
          onSave={saveStageModal}
        />
      )}
    </div>
  );
}

function StageEditorModal({ stage, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...stage });

  const toggleRole = (roleId) => {
    const roles = formData.responsibleRoles || [];
    if (roles.includes(roleId)) {
      setFormData({ ...formData, responsibleRoles: roles.filter((r) => r !== roleId) });
    } else {
      setFormData({ ...formData, responsibleRoles: [...roles, roleId] });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Configure Stage Parameters</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSave}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Stage Name *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Stage Description</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 60 }}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
                Authorized Responsible Roles
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                {AVAILABLE_ROLES.map((r) => (
                  <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="checkbox"
                      checked={(formData.responsibleRoles || []).includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={formData.allowsHandoverToAsset || false}
                  onChange={(e) => setFormData({ ...formData, allowsHandoverToAsset: e.target.checked })}
                />
                Triggers Handover & Physical Asset Activation
              </label>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 24, marginTop: 2 }}>
                When this stage is completed, the system will automatically create/link the physical Asset record.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold">
              Apply to Stage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
