import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  Camera,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function InspectionsView({
  currentUser,
  assets = [],
  onOpenAsset,
  onOpenUserProfile,
  canInspect,
  canVerifyInspection,
}) {
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const { showSuccess, showError } = useToast();

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const data = await api.getInspections(selectedAssetId ? { assetId: selectedAssetId } : {});
      setInspections(data);
    } catch (err) {
      console.error("Failed to load inspections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [selectedAssetId, currentUser]);

  const handleVerify = async (id, status) => {
    try {
      const res = await api.verifyInspection(id, {
        status,
        remarks: status === "Verified" ? "Verified quality & safety compliance" : "Rejected due to deficiencies",
      });
      showSuccess("Inspection Verified", res.message || `✓ Inspection marked as ${status}`);
      fetchInspections();
    } catch (err) {
      showError("Verification Error: " + err.message);
    }
  };

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Field Inspections & Quality Audit Subsystem
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Log routine, quality control, safety, and component-specific inspections with defect severity tagging.
          </p>
        </div>
        {canInspect && (
          <button className="btn btn-gold" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> Start Inspection
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-control"
          style={{ minWidth: 260 }}
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
        >
          <option value="">Filter by Asset: All Assets</option>
          {assets.map((a) => (
            <option key={a._id} value={a._id}>
              {a.assetId} - {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Inspections Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Inspection ID</th>
                <th>Asset / Component</th>
                <th>Type</th>
                <th>Condition</th>
                <th>Inspector</th>
                <th>Date</th>
                <th>Defects Logged</th>
                <th>Verification</th>
                {canVerifyInspection && <th>QC Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: 30 }}>
                    Loading inspection records...
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No inspection reports found.
                  </td>
                </tr>
              ) : (
                inspections.map((insp) => {
                  const condClass =
                    insp.overallCondition === "Good"
                      ? "badge-good"
                      : insp.overallCondition === "Fair"
                      ? "badge-fair"
                      : insp.overallCondition === "Poor"
                      ? "badge-poor"
                      : "badge-critical";

                  return (
                    <tr key={insp._id}>
                      <td>
                        <strong>{insp.inspectionId}</strong>
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            cursor: onOpenAsset && (insp.asset?._id || insp.asset) ? "pointer" : "default",
                            color: onOpenAsset && (insp.asset?._id || insp.asset) ? "var(--primary-dark)" : "inherit",
                          }}
                          onClick={() => onOpenAsset && (insp.asset?._id || insp.asset) && onOpenAsset(insp.asset?._id || insp.asset)}
                          title="Click to view full asset details"
                        >
                          {insp.asset?.name || "–"}
                        </div>
                        {insp.componentName && (
                          <div style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 700 }}>
                            ↳ Sub-Component: {insp.componentName}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {insp.asset?.assetId}
                          </span>
                          {onOpenAsset && (insp.asset?._id || insp.asset) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 10, padding: "1px 6px" }}
                              onClick={() => onOpenAsset(insp.asset?._id || insp.asset)}
                            >
                              View Asset
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue">{insp.type}</span>
                      </td>
                      <td>
                        <span className={`badge ${condClass}`}>{insp.overallCondition}</span>
                      </td>
                      <td>
                        <strong
                          style={{
                            cursor: onOpenUserProfile ? "pointer" : "default",
                            color: "var(--primary-dark)",
                            textDecoration: onOpenUserProfile ? "underline" : "none",
                          }}
                          onClick={() => onOpenUserProfile && onOpenUserProfile(insp.inspector || insp.inspectorName)}
                          title="Click to view inspector profile"
                        >
                          {insp.inspectorName}
                        </strong>
                      </td>
                      <td>{new Date(insp.inspectionDate).toLocaleDateString()}</td>
                      <td>
                        {insp.defects?.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {insp.defects.map((d, idx) => (
                              <div key={idx} style={{ fontSize: 11 }}>
                                <span className={`badge ${d.severity === "Critical" ? "badge-critical" : "badge-fair"}`}>
                                  {d.severity}
                                </span>{" "}
                                {d.description.slice(0, 45)}...
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "var(--status-good)", fontSize: 11 }}>
                            ✓ No defects noted
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            insp.verificationStatus === "Verified"
                              ? "badge-good"
                              : insp.verificationStatus === "Rejected"
                              ? "badge-critical"
                              : "badge-fair"
                          }`}
                        >
                          {insp.verificationStatus}
                        </span>
                      </td>
                      {canVerifyInspection && (
                        <td>
                          {insp.verificationStatus === "Submitted" ? (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: "var(--status-good)" }}
                                onClick={() => handleVerify(insp._id, "Verified")}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ color: "var(--status-critical)" }}
                                onClick={() => handleVerify(insp._id, "Rejected")}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                              {insp.verifiedBy || "Signed"}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Inspection Modal */}
      {isAddModalOpen && (
        <AddInspectionModal
          assets={assets}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(msg) => {
            setIsAddModalOpen(false);
            showSuccess("Inspection Completed", msg || "✓ Inspection completed successfully");
            fetchInspections();
          }}
        />
      )}
    </div>
  );
}

export function AddInspectionModal({
  assets = [],
  defaultAssetId = "",
  defaultComponentId = "",
  defaultComponentName = "",
  onClose,
  onSuccess,
}) {
  const [assetId, setAssetId] = useState(defaultAssetId || assets[0]?._id || "");
  const [componentId, setComponentId] = useState(defaultComponentId || "");
  const [componentName, setComponentName] = useState(defaultComponentName || "");
  const [type, setType] = useState("Routine");
  const [overallCondition, setOverallCondition] = useState("Fair");
  const [notes, setNotes] = useState("");
  const [defects, setDefects] = useState([]);
  const [defectDesc, setDefectDesc] = useState("");
  const [defectSeverity, setDefectSeverity] = useState("Medium");
  const [defectLocation, setDefectLocation] = useState("");
  const [defectPhoto, setDefectPhoto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentAsset = assets.find((a) => a._id === assetId);
  const availableComponents = currentAsset?.components || [];

  const handleComponentSelect = (cId) => {
    setComponentId(cId);
    const comp = availableComponents.find((c) => c.componentId === cId || c._id === cId);
    setComponentName(comp ? comp.name : "");
  };

  const addDefect = () => {
    if (!defectDesc) return;
    setDefects([
      ...defects,
      {
        description: defectDesc,
        severity: defectSeverity,
        locationSnippet: defectLocation,
        photoUrl: defectPhoto,
        componentId,
        componentName,
        status: "Open",
      },
    ]);
    setDefectDesc("");
    setDefectLocation("");
    setDefectPhoto("");
  };

  const removeDefect = (index) => {
    setDefects(defects.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId) {
      setError("Please select an asset.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.createInspection({
        assetId,
        componentId: componentId || undefined,
        componentName: componentName || undefined,
        type,
        overallCondition,
        notes,
        defects,
      });
      onSuccess(res.message || `✓ Inspection recorded for ${currentAsset?.name || "Asset"}`);
    } catch (err) {
      setError(err.message || "Failed to record inspection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 660 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Record Field Inspection & Defect Audit</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Select Asset *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={assetId}
                  onChange={(e) => {
                    setAssetId(e.target.value);
                    setComponentId("");
                    setComponentName("");
                  }}
                  required
                >
                  {assets.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.assetId} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Select Component (Optional)</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={componentId}
                  onChange={(e) => handleComponentSelect(e.target.value)}
                >
                  <option value="">Entire Primary Asset</option>
                  {availableComponents.map((c) => (
                    <option key={c.componentId || c._id} value={c.componentId || c._id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Inspection Type</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="Routine">Routine Inspection</option>
                  <option value="Quality Control">Quality Control Audit</option>
                  <option value="Safety">Safety & Compliance</option>
                  <option value="Post-Monsoon">Post-Monsoon Survey</option>
                  <option value="Handover">Handover Verification</option>
                  <option value="Maintenance Verification">Maintenance Verification</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Assessed Condition *</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={overallCondition}
                  onChange={(e) => setOverallCondition(e.target.value)}
                >
                  <option value="Good">Good (No immediate action)</option>
                  <option value="Fair">Fair (Routine wear / minor distress)</option>
                  <option value="Poor">Poor (Major defects / potholes)</option>
                  <option value="Critical">Critical (Immediate safety hazard)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Inspection Report & Findings</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 60 }}
                placeholder="Describe general site observations, weather conditions, pavement distress..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* DEFECT LOGGER SECTION */}
            <div
              style={{
                border: "1px solid var(--border-light)",
                padding: 12,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-alt)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={15} color="var(--status-critical)" /> Log Specific Defects (Punch List)
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Defect description (e.g. 80mm pothole, expansion joint crack)"
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                />
                <select
                  className="form-control"
                  value={defectSeverity}
                  onChange={(e) => setDefectSeverity(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Chainage / Location (e.g. km 14+250)"
                  value={defectLocation}
                  onChange={(e) => setDefectLocation(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Site Photo URL (optional)"
                  value={defectPhoto}
                  onChange={(e) => setDefectPhoto(e.target.value)}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addDefect}>
                  + Add
                </button>
              </div>

              {defects.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  {defects.map((d, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "#fff",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      <div>
                        <span className={`badge ${d.severity === "Critical" ? "badge-critical" : "badge-fair"}`}>
                          {d.severity}
                        </span>{" "}
                        <strong>{d.description}</strong> ({d.locationSnippet || "On-site"})
                      </div>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", color: "var(--status-critical)", cursor: "pointer" }}
                        onClick={() => removeDefect(i)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Saving..." : "Save Inspection Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
