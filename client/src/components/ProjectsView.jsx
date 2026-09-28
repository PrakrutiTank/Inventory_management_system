import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  ArrowRight,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function ProjectsView({
  currentUser,
  nodes = [],
  onOpenProject,
  onOpenAsset,
  onOpenUserProfile,
  canCreateProject,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects({
        category: categoryFilter,
        q: search,
      });
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    api.getLifecycleTemplates().then(setTemplates).catch(console.error);
  }, [categoryFilter, search, currentUser]);

  const subDivs = nodes.filter((n) => n.level === "SubDivision");

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Infrastructure Projects & Lifecycle Pipeline
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Track planned and ongoing infrastructure creation works through configurable stages to handover.
          </p>
        </div>
        {canCreateProject && (
          <button className="btn btn-gold" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> New Infrastructure Project
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="form-control"
            style={{ width: "100%" }}
            placeholder="Search projects by ID, Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Category: All Categories</option>
          <option value="Road">Road Projects</option>
          <option value="Building">Building Projects</option>
          <option value="Bridge">Bridge Projects</option>
          <option value="Maintenance">Major Rehabilitation</option>
        </select>
      </div>

      {/* Projects Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project ID</th>
                <th>Project Name</th>
                <th>Category</th>
                <th>Sub-Division</th>
                <th>Current Lifecycle Stage</th>
                <th>Sanctioned Budget</th>
                <th>Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30 }}>
                    Loading projects...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No infrastructure projects found matching your permitted scope.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr
                    key={p._id}
                    className="clickable"
                    onClick={() => onOpenProject(p._id)}
                  >
                    <td>
                      <strong style={{ color: "var(--primary)" }}>{p.projectId}</strong>
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        PM:{" "}
                        {p.projectManager?.name ? (
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              color: "var(--primary)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontSize: 10,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenUserProfile) onOpenUserProfile(p.projectManager?._id || p.projectManager?.name);
                            }}
                          >
                            {p.projectManager.name}
                          </button>
                        ) : (
                          "Unassigned"
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Contractor:{" "}
                        {(p.contractorCompany || p.contractor?.name) ? (
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              color: "var(--primary)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontSize: 11,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenUserProfile) onOpenUserProfile(p.contractor?._id || p.contractor?.name || p.contractorCompany);
                            }}
                          >
                            {p.contractorCompany || p.contractor?.name}
                          </button>
                        ) : (
                          "Tender Pending"
                        )}
                      </div>
                      {p.createdAsset && (
                        <div style={{ marginTop: 4 }}>
                          <button
                            type="button"
                            className="badge badge-good"
                            style={{
                              cursor: "pointer",
                              border: "none",
                              fontSize: 10,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const assetId = p.createdAsset?._id || p.createdAsset;
                              if (onOpenAsset && assetId) onOpenAsset(assetId);
                            }}
                          >
                            <span>🏛️ View Handover Asset</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-blue">{p.category}</span>
                    </td>
                    <td>{p.subDivision?.name || "–"}</td>
                    <td>
                      <span className="badge badge-gold" style={{ background: "var(--accent-gold-light)", color: "#b45309" }}>
                        ● {p.currentStageName}
                      </span>
                    </td>
                    <td>
                      ₹{p.sanctionedBudget} Cr
                      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        Spent: ₹{p.spentAmount} Cr
                      </div>
                    </td>
                    <td style={{ minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${p.progressPercentage}%`,
                              height: "100%",
                              background: p.progressPercentage >= 100 ? "var(--status-good)" : "var(--primary)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{p.progressPercentage}%</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject(p._id);
                          }}
                        >
                          Lifecycle <ChevronRight size={12} />
                        </button>
                        {p.createdAsset && (
                          <button
                            className="btn btn-gold btn-sm"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            title="Open Central Asset Details"
                            onClick={(e) => {
                              e.stopPropagation();
                              const assetId = p.createdAsset?._id || p.createdAsset;
                              if (onOpenAsset && assetId) onOpenAsset(assetId);
                            }}
                          >
                            Asset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Project Modal */}
      {isAddModalOpen && (
        <AddProjectModal
          subDivs={subDivs}
          templates={templates}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

function AddProjectModal({ subDivs, templates, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    category: "Road",
    subDivision: subDivs[0]?._id || "",
    sanctionedBudget: 25.0,
    contractorCompany: "",
    templateId: templates[0]?._id || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subDivision) {
      setError("Please provide project name and select sub-division.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.createProject({
        name: formData.name,
        category: formData.category,
        subDivision: formData.subDivision,
        sanctionedBudget: Number(formData.sanctionedBudget),
        contractorCompany: formData.contractorCompany,
        templateId: formData.templateId || undefined,
      });
      showSuccess("Project Created", res.message || `✓ Project ${res.project?.projectId || formData.name} created successfully`);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Create Infrastructure Project</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Project Title *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="e.g. Surat–Navsari 4-Lane Highway Widening"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Category *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Road">Road Project</option>
                  <option value="Building">Building Project</option>
                  <option value="Bridge">Bridge Project</option>
                  <option value="Maintenance">Major Rehabilitation</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Sub-Division Jurisdiction *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.subDivision}
                  onChange={(e) => setFormData({ ...formData, subDivision: e.target.value })}
                >
                  {subDivs.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Sanctioned Budget (₹ Crores)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.sanctionedBudget}
                  onChange={(e) => setFormData({ ...formData, sanctionedBudget: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor / EPC Agency</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="e.g. L&T Infrastructure Ltd"
                  value={formData.contractorCompany}
                  onChange={(e) => setFormData({ ...formData, contractorCompany: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Lifecycle Template</label>
              <select
                className="form-control"
                style={{ width: "100%" }}
                value={formData.templateId}
                onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
              >
                {templates.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.stages.length} stages)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Initiating Project..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
