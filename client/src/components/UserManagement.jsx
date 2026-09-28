import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  ShieldCheck,
  Building,
  FolderKanban,
  Edit2,
  Key,
  Save,
  CheckCircle2,
  Search,
  RotateCcw,
  Eye,
  MapPin,
} from "lucide-react";
import { api } from "../services/api";

const ROLES_LIST = [
  { id: "admin", label: "System Administrator" },
  { id: "department_officer", label: "Department Officer" },
  { id: "project_manager", label: "Project Manager" },
  { id: "site_engineer", label: "Site / Field Engineer" },
  { id: "quality_inspector", label: "Quality Inspector" },
  { id: "maintenance_engineer", label: "Maintenance Engineer" },
  { id: "contractor", label: "Contractor" },
  { id: "management", label: "Management / Viewer" },
];

export default function UserManagement({ currentUser, nodes = [], onRefreshUsers, onOpenUserProfile }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("users");
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState("department_officer");
  const [currentPerms, setCurrentPerms] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [permMsg, setPermMsg] = useState("");

  // Search and Multi-Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, pList, rPerms] = await Promise.all([
        api.getUsers(),
        api.getProjects(),
        api.getRolePermissions(),
      ]);
      setUsers(uList);
      setProjects(pList);
      setRolePermissions(rPerms);

      const found = rPerms.find((r) => r.role === selectedRoleForPerms);
      setCurrentPerms(found?.permissions || []);
    } catch (err) {
      console.error("Failed to load user management data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  useEffect(() => {
    const found = rolePermissions.find((r) => r.role === selectedRoleForPerms);
    setCurrentPerms(found?.permissions || []);
  }, [selectedRoleForPerms, rolePermissions]);

  const togglePermission = (permKey) => {
    if (currentPerms.includes(permKey)) {
      setCurrentPerms(currentPerms.filter((p) => p !== permKey));
    } else {
      setCurrentPerms([...currentPerms, permKey]);
    }
  };

  const handleSavePermissions = async () => {
    setSavingPerms(true);
    setPermMsg("");
    try {
      await api.updateRolePermissions(selectedRoleForPerms, currentPerms);
      setPermMsg(`Permissions for '${selectedRoleForPerms}' successfully updated and enforced!`);
      loadData();
    } catch (err) {
      setPermMsg("Error updating permissions: " + err.message);
    } finally {
      setSavingPerms(false);
    }
  };

  const ALL_PERMISSIONS = [
    { key: "asset.view", label: "View Assets Inventory" },
    { key: "asset.create", label: "Register New Assets" },
    { key: "asset.edit", label: "Edit Asset Specifications" },
    { key: "project.view", label: "View Infrastructure Projects" },
    { key: "project.create", label: "Initiate Infrastructure Projects" },
    { key: "project.advance", label: "Advance Lifecycle Stages" },
    { key: "inspection.view", label: "View Inspection Reports" },
    { key: "inspection.create", label: "Conduct Field Inspections" },
    { key: "inspection.verify", label: "Verify & Approve QC Audits" },
    { key: "maintenance.view", label: "View Maintenance Work Orders" },
    { key: "maintenance.create", label: "Issue Work Orders" },
    { key: "maintenance.update", label: "Update Contractor Progress" },
    { key: "maintenance.verify", label: "Verify Repairs & Close Work Orders" },
    { key: "lifecycle.view", label: "View Lifecycle Process Definitions" },
    { key: "lifecycle.edit", label: "Modify Lifecycle Builder Process" },
    { key: "user.manage", label: "Manage Users & Allocations" },
    { key: "role.manage", label: "Configure Role Permissions" },
    { key: "report.view", label: "Access Analytics & Dashboards" },
    { key: "audit.view", label: "Access Audit Trail Logs" },
  ];

  // Filter computations
  const circleNodes = nodes.filter((n) => n.level === "Circle");
  const divisionNodes = nodes.filter((n) => {
    if (n.level !== "Division") return false;
    if (!areaFilter || areaFilter === "STATE") return true;
    const targetCircle = circleNodes.find((c) => c._id === areaFilter);
    const circlePrefix = targetCircle ? targetCircle.name.split(" ")[0].toLowerCase() : "";
    return String(n.parent) === String(areaFilter) || (circlePrefix && n.name.toLowerCase().includes(circlePrefix));
  });

  const hasActiveFilters = Boolean(searchTerm.trim() || roleFilter || areaFilter || divisionFilter);

  const clearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setAreaFilter("");
    setDivisionFilter("");
  };

  const filteredUsers = users.filter((u) => {
    // 1. Search by name, email, designation, or company
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(term);
      const matchEmail = u.email?.toLowerCase().includes(term);
      const matchCompany = u.contractorCompany?.toLowerCase().includes(term);
      const matchDesig = u.designation?.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchCompany && !matchDesig) return false;
    }

    // 2. Filter by role
    if (roleFilter && u.role !== roleFilter) {
      return false;
    }

    // 3. Filter by area / administrative jurisdiction
    if (areaFilter) {
      if (areaFilter === "STATE") {
        if (u.jurisdictionNode) return false;
      } else {
        if (!u.jurisdictionNode) return false;
        const targetCircle = circleNodes.find((c) => c._id === areaFilter);
        const circlePrefix = targetCircle ? targetCircle.name.split(" ")[0].toLowerCase() : areaFilter.toLowerCase();
        const userNodeName = (u.jurisdictionNode?.name || "").toLowerCase();
        const userNodeId = String(u.jurisdictionNode?._id || u.jurisdictionNode);
        const userNodeParent = String(u.jurisdictionNode?.parent || "");

        const matches =
          userNodeId === String(areaFilter) ||
          userNodeParent === String(areaFilter) ||
          userNodeName.includes(circlePrefix);

        if (!matches) return false;
      }
    }

    // 4. Filter by division / region
    if (divisionFilter) {
      if (!u.jurisdictionNode) return false;
      const targetDiv = nodes.find((d) => d._id === divisionFilter);
      const divName = (targetDiv?.name || divisionFilter).toLowerCase();
      const userNodeName = (u.jurisdictionNode?.name || "").toLowerCase();
      const userNodeId = String(u.jurisdictionNode?._id || u.jurisdictionNode);

      const matches =
        userNodeId === String(divisionFilter) ||
        userNodeName.includes(divName);

      if (!matches) return false;
    }

    return true;
  });

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            User Allocation & Access Control Management
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Manage departmental personnel, contractors, administrative scopes, project allocations, and action-based permissions.
          </p>
        </div>
        {activeSubTab === "users" && (
          <button className="btn btn-gold" onClick={() => setIsAddUserModalOpen(true)}>
            <Plus size={14} /> Add System User
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "6px 14px",
          background: "#ffffff",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-light)",
          marginBottom: 14,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <button
          onClick={() => setActiveSubTab("users")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeSubTab === "users" ? "2px solid var(--accent-gold)" : "2px solid transparent",
            color: activeSubTab === "users" ? "var(--primary-dark)" : "var(--text-muted)",
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          Users & Allocations ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab("permissions")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeSubTab === "permissions" ? "2px solid var(--accent-gold)" : "2px solid transparent",
            color: activeSubTab === "permissions" ? "var(--primary-dark)" : "var(--text-muted)",
            padding: "6px 8px",
            cursor: "pointer",
          }}
        >
          Action-Based Permissions Matrix
        </button>
      </div>

      {/* TAB 1: USERS LIST & ALLOCATION */}
      {activeSubTab === "users" && (
        <div>
          {/* SEARCH & MULTI-FILTER TOOLBAR */}
          <div
            className="card"
            style={{
              marginBottom: 14,
              padding: "14px 16px",
              background: "#ffffff",
              border: "1px solid var(--border-light)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {/* Search by Name/Email */}
              <div style={{ flex: "1 1 240px", position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: 30, fontSize: 13, width: "100%" }}
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter by Role */}
              <div style={{ minWidth: 170 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Role: All Roles</option>
                  {ROLES_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Area / Administrative Jurisdiction */}
              <div style={{ minWidth: 180 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setDivisionFilter("");
                  }}
                >
                  <option value="">Area: All Jurisdictions</option>
                  <option value="STATE">Gujarat State (Statewide / Full Access)</option>
                  {circleNodes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Division / Region */}
              <div style={{ minWidth: 190 }}>
                <select
                  className="form-control"
                  style={{ fontSize: 12 }}
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                >
                  <option value="">Division / Region: All</option>
                  {divisionNodes.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={clearFilters}
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <RotateCcw size={12} /> Clear Filters
                </button>
              )}
            </div>

            {/* Results Summary Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px dashed var(--border-light)",
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <div>
                Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> registered personnel
                {hasActiveFilters && <span style={{ color: "var(--accent-blue)", marginLeft: 6 }}>(filters applied)</span>}
              </div>

              {/* Active Filter Badges */}
              {hasActiveFilters && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {searchTerm && (
                    <span className="badge" style={{ background: "#f1f5f9" }}>
                      Keyword: "{searchTerm}"
                    </span>
                  )}
                  {roleFilter && (
                    <span className="badge badge-blue">
                      Role: {ROLES_LIST.find((r) => r.id === roleFilter)?.label || roleFilter}
                    </span>
                  )}
                  {areaFilter && (
                    <span className="badge badge-gold">
                      Area: {areaFilter === "STATE" ? "Gujarat State" : circleNodes.find((c) => c._id === areaFilter)?.name || areaFilter}
                    </span>
                  )}
                  {divisionFilter && (
                    <span className="badge badge-purple">
                      Division: {divisionNodes.find((d) => d._id === divisionFilter)?.name || divisionFilter}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Users Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Role</th>
                    <th>Designation / Company</th>
                    <th>Allocated Scope (Jurisdiction)</th>
                    <th>Allocated Projects</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                        No personnel found matching the specified filters.
                        {hasActiveFilters && (
                          <div style={{ marginTop: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                              Reset Filters
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--primary-dark)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            onClick={() => onOpenUserProfile && onOpenUserProfile(u._id)}
                            title="Click to view read-only personnel profile"
                          >
                            <span>{u.name}</span>
                            <Eye size={12} style={{ color: "var(--accent-blue)", opacity: 0.7 }} />
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{u.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-blue">{u.role.replace("_", " ")}</span>
                        </td>
                        <td>
                          <div>{u.designation || "–"}</div>
                          {u.contractorCompany && (
                            <div style={{ fontSize: 11, color: "var(--accent-gold)", fontWeight: 600 }}>
                              {u.contractorCompany}
                            </div>
                          )}
                        </td>
                        <td>
                          {u.jurisdictionNode ? (
                            <span>
                              {u.jurisdictionNode.name} <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({u.jurisdictionNode.level})</span>
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>Gujarat State (All)</span>
                          )}
                        </td>
                        <td>
                          {u.assignedProjects?.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {u.assignedProjects.map((p) => (
                                <span key={p._id || p.projectId} className="badge badge-purple" style={{ fontSize: 10 }}>
                                  {p.projectId || p.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-light)", fontSize: 11 }}>No project allocations</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${u.status === "Active" || !u.status ? "badge-good" : "badge-critical"}`}>
                            {u.status || "Active"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onOpenUserProfile && onOpenUserProfile(u._id)}
                              title="View read-only profile"
                              style={{ padding: "4px 8px" }}
                            >
                              <Eye size={12} /> Profile
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedUserForEdit(u)}
                              title="Allocate / Edit user"
                              style={{ padding: "4px 8px" }}
                            >
                              <Edit2 size={12} /> Allocate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSIONS MATRIX */}
      {activeSubTab === "permissions" && (
        <div className="card">
          <div className="card-header" style={{ marginBottom: 12 }}>
            <div className="card-title" style={{ fontSize: 14 }}>
              <Key size={16} /> Configure Role Permissions
            </div>
            <button className="btn btn-gold btn-sm" onClick={handleSavePermissions} disabled={savingPerms}>
              <Save size={12} /> {savingPerms ? "Saving..." : "Save Role Permissions"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Select Role to Edit:</label>
            <select
              className="form-control"
              style={{ minWidth: 240 }}
              value={selectedRoleForPerms}
              onChange={(e) => setSelectedRoleForPerms(e.target.value)}
            >
              {ROLES_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} ({r.id})
                </option>
              ))}
            </select>
          </div>

          {permMsg && (
            <div style={{ padding: 8, background: "#ecfdf5", color: "#065f46", borderRadius: 4, marginBottom: 14, fontSize: 12 }}>
              {permMsg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {ALL_PERMISSIONS.map((perm) => (
              <label
                key={perm.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: currentPerms.includes(perm.key) ? "#f0fdf4" : "var(--bg-alt)",
                  borderRadius: "var(--radius-sm)",
                  border: currentPerms.includes(perm.key) ? "1px solid #bbf7d0" : "1px solid var(--border-light)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={currentPerms.includes(perm.key)}
                  onChange={() => togglePermission(perm.key)}
                />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{perm.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-light)" }}>{perm.key}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <AddUserModal
          nodes={nodes}
          onClose={() => setIsAddUserModalOpen(false)}
          onSuccess={() => {
            setIsAddUserModalOpen(false);
            loadData();
            onRefreshUsers();
          }}
        />
      )}

      {/* Allocate / Edit User Modal */}
      {selectedUserForEdit && (
        <EditUserModal
          user={selectedUserForEdit}
          nodes={nodes}
          projects={projects}
          onClose={() => setSelectedUserForEdit(null)}
          onSuccess={() => {
            setSelectedUserForEdit(null);
            loadData();
            onRefreshUsers();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({ nodes, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "site_engineer",
    designation: "",
    jurisdictionNode: "",
    contractorCompany: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.role) {
      setError("Name, email, and role are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        designation: formData.designation,
        jurisdictionNode: formData.jurisdictionNode || null,
        contractorCompany: formData.contractorCompany,
        phone: formData.phone,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Register New System User</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Full Name *</label>
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
                <label style={{ fontSize: 12, fontWeight: 700 }}>Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>System Role *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Designation</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="e.g. Deputy Executive Engineer"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Administrative Jurisdiction Scope</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.jurisdictionNode}
                  onChange={(e) => setFormData({ ...formData, jurisdictionNode: e.target.value })}
                >
                  <option value="">Gujarat State (All Circles)</option>
                  {nodes.map((n) => (
                    <option key={n._id} value={n._id}>
                      {n.level}: {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor Entity Name (If Contractor)</label>
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
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, nodes, projects, onClose, onSuccess }) {
  const [role, setRole] = useState(user.role);
  const [designation, setDesignation] = useState(user.designation || "");
  const [jurisdictionNode, setJurisdictionNode] = useState(user.jurisdictionNode?._id || user.jurisdictionNode || "");
  const [assignedProjects, setAssignedProjects] = useState(
    user.assignedProjects?.map((p) => p._id || p) || []
  );
  const [contractorCompany, setContractorCompany] = useState(user.contractorCompany || "");
  const [status, setStatus] = useState(user.status || "Active");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleProject = (pId) => {
    if (assignedProjects.includes(pId)) {
      setAssignedProjects(assignedProjects.filter((id) => id !== pId));
    } else {
      setAssignedProjects([...assignedProjects, pId]);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await api.updateUser(user._id, {
        role,
        designation,
        jurisdictionNode: jurisdictionNode || null,
        assignedProjects,
        contractorCompany,
        status,
      });
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Allocate User Scope & Projects: {user.name}</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleUpdate}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>System Role</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Account Status</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Designation</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Administrative Jurisdiction</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={jurisdictionNode}
                  onChange={(e) => setJurisdictionNode(e.target.value)}
                >
                  <option value="">Gujarat State (All Circles)</option>
                  {nodes.map((n) => (
                    <option key={n._id} value={n._id}>
                      {n.level}: {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor Entity (If applicable)</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                value={contractorCompany}
                onChange={(e) => setContractorCompany(e.target.value)}
              />
            </div>

            {/* PROJECT ALLOCATION CHECKBOXES */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: "block" }}>
                Explicit Project Allocations (User only sees assigned projects)
              </label>
              <div
                style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  border: "1px solid var(--border-light)",
                  padding: 8,
                  borderRadius: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {projects.map((p) => (
                  <label key={p._id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={assignedProjects.includes(p._id)}
                      onChange={() => toggleProject(p._id)}
                    />
                    <strong>{p.projectId}</strong>: {p.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Saving..." : "Apply Allocation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
