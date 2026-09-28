import React, { useState, useEffect, useCallback } from "react";
import {
  Layers,
  Search,
  Filter,
  Plus,
  Building,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

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
  "Fire Safety",
];

export default function AssetInventory({
  currentUser,
  onOpenAsset,
  nodes = [],
  canCreateAsset,
}) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    type: "",
    condition: "",
    node: "",
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAssets(filters);
      setAssets(data);
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentUser]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  const resetFilters = () => {
    setFilters({ q: "", category: "", type: "", condition: "", node: "" });
  };

  // Group nodes by level for jurisdiction dropdown
  const subDivNodes = nodes.filter((n) => n.level === "SubDivision");

  return (
    <div>
      {/* Top Banner / Heading */}
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Physical Infrastructure Asset Inventory
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Standalone government inventory of roads, bridges, culverts, buildings & maintainable components.
          </p>
        </div>
        {canCreateAsset && (
          <button className="btn btn-gold" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> Register Asset
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            className="form-control"
            style={{ width: "100%" }}
            placeholder="Search by Asset ID, Name, or Location..."
            value={filters.q}
            onChange={(e) => handleFilterChange("q", e.target.value)}
          />
        </div>

        <select
          className="form-control"
          value={filters.category}
          onChange={(e) => handleFilterChange("category", e.target.value)}
        >
          <option value="">Category: All</option>
          <option value="Road">Road Assets</option>
          <option value="Building">Building Assets</option>
        </select>

        <select
          className="form-control"
          value={filters.type}
          onChange={(e) => handleFilterChange("type", e.target.value)}
        >
          <option value="">Type: All Types</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="form-control"
          value={filters.condition}
          onChange={(e) => handleFilterChange("condition", e.target.value)}
        >
          <option value="">Condition: All</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
          <option value="Poor">Poor</option>
          <option value="Critical">Critical</option>
        </select>

        <select
          className="form-control"
          value={filters.node}
          onChange={(e) => handleFilterChange("node", e.target.value)}
        >
          <option value="">Jurisdiction: All</option>
          {nodes.map((n) => (
            <option key={n._id} value={n._id}>
              {n.level}: {n.name}
            </option>
          ))}
        </select>

        <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
          Reset
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "0 6px 10px", color: "var(--text-muted)" }}>
        <span>
          Showing <strong>{assets.length}</strong> physical assets matching permitted scope
        </span>
        <span>
          Total Value: ₹
          {assets.reduce((acc, a) => acc + (a.sanctionedCost || 0), 0).toFixed(1)} Cr
        </span>
      </div>

      {/* Assets Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset ID</th>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Sub-Division</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Valuation (₹ Cr)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30 }}>
                    Loading assets...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No infrastructure assets found matching your filter criteria and administrative scope.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const condClass =
                    asset.condition === "Good"
                      ? "badge-good"
                      : asset.condition === "Fair"
                      ? "badge-fair"
                      : asset.condition === "Poor"
                      ? "badge-poor"
                      : "badge-critical";

                  return (
                    <tr
                      key={asset._id}
                      className="clickable"
                      onClick={() => onOpenAsset(asset._id)}
                    >
                      <td>
                        <strong style={{ color: "var(--primary)" }}>{asset.assetId}</strong>
                        {asset.parentAsset && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                            ↳ Sub-component of {asset.parentAsset.assetId}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{asset.name}</div>
                        {asset.location?.chainage && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Chainage: {asset.location.chainage}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-blue">{asset.type}</span>
                      </td>
                      <td>{asset.subDivision?.name || "–"}</td>
                      <td>
                        <span className={`badge ${condClass}`}>{asset.condition}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 12,
                            color:
                              asset.status === "Operational"
                                ? "var(--status-good)"
                                : asset.status === "Under Maintenance"
                                ? "var(--accent-gold)"
                                : "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          ● {asset.status}
                        </span>
                      </td>
                      <td>₹{asset.sanctionedCost || 0}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenAsset(asset._id);
                          }}
                        >
                          View Details <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Asset Modal */}
      {isAddModalOpen && (
        <AddAssetModal
          nodes={nodes}
          assets={assets}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchAssets();
          }}
        />
      )}
    </div>
  );
}

function AddAssetModal({ nodes, assets, onClose, onSuccess }) {
  const subDivs = nodes.filter((n) => n.level === "SubDivision");
  const [formData, setFormData] = useState({
    name: "",
    type: ASSET_TYPES[0],
    category: "Road",
    subDivision: subDivs[0]?._id || "",
    sanctionedCost: 1.0,
    parentAsset: "",
    chainage: "",
    address: "",
    contractorCompany: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.subDivision) {
      setError("Please fill in asset name and select a sub-division.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.createAsset({
        name: formData.name,
        type: formData.type,
        category: formData.type.includes("Building") || ["HVAC", "Lift System", "Fire Safety", "Plumbing", "Electrical System"].includes(formData.type)
          ? "Building"
          : "Road",
        subDivision: formData.subDivision,
        sanctionedCost: Number(formData.sanctionedCost),
        parentAsset: formData.parentAsset || null,
        location: {
          chainage: formData.chainage,
          address: formData.address,
        },
        contractorCompany: formData.contractorCompany,
      });
      showSuccess("Asset Created", res.message || `✓ Asset ${res.asset?.assetId || formData.name} created successfully`);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Register Physical Infrastructure Asset</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Asset Name *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="e.g. SH-41 Ahmedabad-Mehsana Highway or Sachivalaya Block 3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Asset Type *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
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
                <label style={{ fontSize: 12, fontWeight: 700 }}>Parent Asset (For Sub-Components)</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.parentAsset}
                  onChange={(e) => setFormData({ ...formData, parentAsset: e.target.value })}
                >
                  <option value="">None (Top-Level Primary Asset)</option>
                  {assets
                    .filter((a) => !a.parentAsset)
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.assetId} - {a.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Sanctioned Cost (₹ Crores)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={formData.sanctionedCost}
                  onChange={(e) => setFormData({ ...formData, sanctionedCost: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Location / Chainage</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="e.g. km 10+000 to 22+500"
                  value={formData.chainage}
                  onChange={(e) => setFormData({ ...formData, chainage: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Contractor / Agency</label>
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
              {submitting ? "Registering..." : "Save Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
