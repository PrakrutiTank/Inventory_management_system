import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  Camera,
  Image,
} from "lucide-react";
import { api } from "../services/api";
import { useToast } from "../context/ToastContext";

export default function MaintenanceBoard({
  currentUser,
  assets = [],
  users = [],
  onOpenAsset,
  onOpenUserProfile,
  canCreateWO,
  canUpdateWO,
  canVerifyWO,
}) {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedWOForUpdate, setSelectedWOForUpdate] = useState(null);
  const [selectedWOForVerify, setSelectedWOForVerify] = useState(null);
  const { showSuccess, showError } = useToast();

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkOrders({
        status: statusFilter,
        priority: priorityFilter,
      });
      setWorkOrders(data);
    } catch (err) {
      console.error("Failed to load work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, priorityFilter, currentUser]);

  const contractors = users.filter((u) => u.role === "contractor");

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Closed-Loop Maintenance & Work Orders Pipeline
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Track repairs from defect logging → work order dispatch → contractor repair → engineer verification & asset update.
          </p>
        </div>
        {canCreateWO && (
          <button className="btn btn-gold" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={14} /> Issue Work Order
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="filter-bar">
        <select
          className="form-control"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Status: All Work Orders</option>
          <option value="Issued">Issued</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed (Pending Verification)</option>
          <option value="Verified & Closed">Verified & Closed</option>
        </select>

        <select
          className="form-control"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">Priority: All</option>
          <option value="Routine">Routine</option>
          <option value="Urgent">Urgent</option>
          <option value="Emergency">Emergency</option>
        </select>
      </div>

      {/* Work Orders Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>WO ID</th>
                <th>Title / Task</th>
                <th>Asset / Component</th>
                <th>Priority</th>
                <th>Assigned Contractor</th>
                <th>Status</th>
                <th>Est. / Act. Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30 }}>
                    Loading work orders...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No maintenance work orders found matching your filters.
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => {
                  const isContractorAssigned =
                    currentUser?.role === "contractor" &&
                    String(wo.assignedContractor?._id) === String(currentUser?._id);

                  return (
                    <tr key={wo._id}>
                      <td>
                        <strong style={{ color: "var(--primary)" }}>{wo.workOrderId}</strong>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                          {new Date(wo.issuedDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{wo.title}</div>
                        {wo.description && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {wo.description.slice(0, 60)}...
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{
                            fontWeight: 600,
                            cursor: onOpenAsset && (wo.asset?._id || wo.asset) ? "pointer" : "default",
                            color: onOpenAsset && (wo.asset?._id || wo.asset) ? "var(--primary-dark)" : "inherit",
                          }}
                          onClick={() => onOpenAsset && (wo.asset?._id || wo.asset) && onOpenAsset(wo.asset?._id || wo.asset)}
                          title="Click to view full asset details"
                        >
                          {wo.asset?.name || "–"}
                        </div>
                        {wo.componentName && (
                          <div style={{ fontSize: 11, color: "var(--accent-blue)", fontWeight: 700 }}>
                            ↳ {wo.componentName}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {wo.asset?.assetId}
                          </span>
                          {onOpenAsset && (wo.asset?._id || wo.asset) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 10, padding: "1px 6px" }}
                              onClick={() => onOpenAsset(wo.asset?._id || wo.asset)}
                            >
                              View Asset
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            wo.priority === "Emergency"
                              ? "badge-critical"
                              : wo.priority === "Urgent"
                              ? "badge-poor"
                              : "badge-fair"
                          }`}
                        >
                          {wo.priority}
                        </span>
                      </td>
                      <td>
                        <strong
                          style={{
                            cursor: onOpenUserProfile ? "pointer" : "default",
                            color: "var(--primary-dark)",
                            textDecoration: onOpenUserProfile ? "underline" : "none",
                          }}
                          onClick={() => onOpenUserProfile && onOpenUserProfile(wo.assignedContractor || wo.contractorCompany)}
                          title="Click to view contractor profile"
                        >
                          {wo.contractorCompany || wo.assignedContractor?.name || "Unassigned"}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            wo.status === "Verified & Closed"
                              ? "badge-good"
                              : wo.status === "Completed"
                              ? "badge-fair"
                              : "badge-blue"
                          }`}
                        >
                          ● {wo.status}
                        </span>
                      </td>
                      <td>
                        ₹{wo.actualCost || wo.estimatedCost} Lakhs
                        {wo.actualCost > 0 && (
                          <div style={{ fontSize: 10, color: "var(--status-good)" }}>
                            Actual: ₹{wo.actualCost}L
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          {(isContractorAssigned || currentUser?.role === "admin") &&
                            wo.status !== "Verified & Closed" && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedWOForUpdate(wo)}
                              >
                                Update Work
                              </button>
                            )}

                          {(canVerifyWO || currentUser?.role === "admin") &&
                            wo.status === "Completed" && (
                              <button
                                className="btn btn-gold btn-sm"
                                onClick={() => setSelectedWOForVerify(wo)}
                              >
                                <ShieldCheck size={12} /> Verify & Close
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Work Order Modal */}
      {isAddModalOpen && (
        <CreateWorkOrderModal
          assets={assets}
          contractors={contractors}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(msg) => {
            setIsAddModalOpen(false);
            showSuccess("Work Order Dispatched", msg || "✓ Work order created successfully");
            fetchWorkOrders();
          }}
        />
      )}

      {/* Contractor Update Modal */}
      {selectedWOForUpdate && (
        <UpdateWorkOrderModal
          workOrder={selectedWOForUpdate}
          onClose={() => setSelectedWOForUpdate(null)}
          onSuccess={(msg) => {
            setSelectedWOForUpdate(null);
            showSuccess("Work Updated", msg || "✓ Work order progress updated");
            fetchWorkOrders();
          }}
        />
      )}

      {/* Engineer Verify Modal */}
      {selectedWOForVerify && (
        <VerifyWorkOrderModal
          workOrder={selectedWOForVerify}
          onClose={() => setSelectedWOForVerify(null)}
          onSuccess={(msg) => {
            setSelectedWOForVerify(null);
            showSuccess("Repair Verified & Closed", msg || "✓ Work order closed and asset condition restored");
            fetchWorkOrders();
          }}
        />
      )}
    </div>
  );
}

export function CreateWorkOrderModal({
  assets = [],
  contractors = [],
  defaultAssetId = "",
  defaultComponentId = "",
  defaultComponentName = "",
  onClose,
  onSuccess,
}) {
  const [assetId, setAssetId] = useState(defaultAssetId || assets[0]?._id || "");
  const [componentId, setComponentId] = useState(defaultComponentId || "");
  const [componentName, setComponentName] = useState(defaultComponentName || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Routine");
  const [contractorId, setContractorId] = useState(contractors[0]?._id || "");
  const [estimatedCost, setEstimatedCost] = useState(1.5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentAsset = assets.find((a) => a._id === assetId);
  const availableComponents = currentAsset?.components || [];

  const handleComponentSelect = (cId) => {
    setComponentId(cId);
    const comp = availableComponents.find((c) => c.componentId === cId || c._id === cId);
    setComponentName(comp ? comp.name : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!assetId || !title) {
      setError("Please select an asset and enter work order title.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await api.createWorkOrder({
        assetId,
        componentId: componentId || undefined,
        componentName: componentName || undefined,
        title,
        description,
        priority,
        assignedContractorId: contractorId || undefined,
        estimatedCost: Number(estimatedCost),
      });
      onSuccess(res.message || `✓ Work order created successfully for ${currentAsset?.name}`);
    } catch (err) {
      setError(err.message || "Failed to issue work order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Issue Maintenance Work Order</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Target Asset *</label>
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

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Work Order Title *</label>
              <input
                type="text"
                className="form-control"
                style={{ width: "100%" }}
                placeholder="e.g. Bituminous Patchwork and Edge Stabilization"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Priority</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Routine">Routine</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Estimated Cost (₹ Lakhs)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Assign Maintenance Contractor</label>
              <select
                className="form-control"
                style={{ width: "100%" }}
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                <option value="">Unassigned (Open Tender)</option>
                {contractors.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.contractorCompany || "Contractor"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Scope of Repair Work</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 60 }}
                placeholder="Enter technical specifications, milling thickness, materials, compaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Issuing..." : "Dispatch Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UpdateWorkOrderModal({ workOrder, onClose, onSuccess }) {
  const [status, setStatus] = useState("Completed");
  const [repairDetails, setRepairDetails] = useState(workOrder.repairDetails || "");
  const [actualCost, setActualCost] = useState(workOrder.actualCost || workOrder.estimatedCost || 0);
  const [beforePhoto, setBeforePhoto] = useState(workOrder.beforePhotoUrl || "");
  const [afterPhoto, setAfterPhoto] = useState(workOrder.afterPhotoUrl || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.updateWorkOrderProgress(workOrder._id, {
        status,
        repairDetails,
        actualCost: Number(actualCost),
        beforePhotoUrl: beforePhoto,
        afterPhotoUrl: afterPhoto,
      });
      onSuccess(res.message || `✓ Work order ${workOrder.workOrderId} updated`);
    } catch (err) {
      setError(err.message || "Failed to update work order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Contractor Progress Update ({workOrder.workOrderId})</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleUpdate}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

            <div style={{ background: "var(--bg-alt)", padding: 8, borderRadius: 4, fontSize: 12 }}>
              <strong>Task:</strong> {workOrder.title} on {workOrder.asset?.name}
              {workOrder.componentName && ` [${workOrder.componentName}]`}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Work Status</label>
                <select
                  className="form-control"
                  style={{ width: "100%" }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed (Ready for Inspection)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Actual Incurred Cost (₹ Lakhs)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  style={{ width: "100%" }}
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Repair Details & Technical Execution *</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 65 }}
                placeholder="Describe execution, compaction tests, material batches used..."
                value={repairDetails}
                onChange={(e) => setRepairDetails(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Before Repair Photo URL</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="https://..."
                  value={beforePhoto}
                  onChange={(e) => setBeforePhoto(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700 }}>After Repair Photo URL</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: "100%" }}
                  placeholder="https://..."
                  value={afterPhoto}
                  onChange={(e) => setAfterPhoto(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Updating..." : "Submit Progress Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VerifyWorkOrderModal({ workOrder, onClose, onSuccess }) {
  const [newCondition, setNewCondition] = useState("Good");
  const [remarks, setRemarks] = useState("Inspected on-site. Surface smooth and ride quality restored.");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await api.verifyWorkOrder(workOrder._id, {
        newCondition,
        engineerRemarks: remarks,
      });
      onSuccess(res.message || `✓ Work order ${workOrder.workOrderId} verified and condition restored`);
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16 }}>Maintenance Engineer Verification</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleVerify}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}

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
              <strong>Closed-Loop Verification:</strong> Approving this work order will close the maintenance ticket,
              mark linked defects as Resolved, and update the physical <strong>Asset Condition to {newCondition}</strong> in
              the permanent state inventory!
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Restore Asset Condition Rating *</label>
              <select
                className="form-control"
                style={{ width: "100%" }}
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
              >
                <option value="Good">Good (Full operational restoration)</option>
                <option value="Fair">Fair (Minor cosmetic wear remains)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700 }}>Engineer Sign-Off Remarks *</label>
              <textarea
                className="form-control"
                style={{ width: "100%", minHeight: 70 }}
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
              {submitting ? "Signing Off..." : "Verify & Restore Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
