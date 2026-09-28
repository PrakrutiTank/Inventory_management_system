import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Building,
  Mail,
  Phone,
  Briefcase,
  Layers,
  FolderKanban,
  Wrench,
  Lock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/api";

export default function UserProfileModal({
  userId,
  fallbackUser = null,
  onClose,
  onOpenAsset,
  onOpenProject,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        if (!userId) {
          if (fallbackUser) {
            setData({ user: fallbackUser, workOrders: [], associatedAssets: [] });
          } else {
            setError("No user identified.");
          }
          return;
        }

        const res = await api.getUserProfile(userId);
        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        if (fallbackUser && isMounted) {
          setData({
            user: fallbackUser,
            workOrders: [],
            associatedAssets: [],
          });
        } else if (isMounted) {
          setError(err.message || "Unable to fetch user profile details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userId, fallbackUser]);

  const user = data?.user || fallbackUser;
  const workOrders = data?.workOrders || [];
  const associatedAssets = data?.associatedAssets || [];
  const assignedProjects = user?.assignedProjects || [];

  const formatRole = (r) => {
    if (!r) return "User";
    return r
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 620, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
                boxShadow: "0 2px 8px rgba(15, 41, 66, 0.2)",
              }}
            >
              {user?.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "U"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--primary-dark)" }}>
                  {user?.name || "User Profile"}
                </h3>
                <span className="badge badge-blue">
                  {formatRole(user?.role)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Official Government Personnel Record · Roads & Buildings Department
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: "auto", padding: 20 }}>
          {loading && !user ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              Loading official user profile...
            </div>
          ) : error && !user ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--status-critical)" }}>
              <AlertCircle size={28} style={{ marginBottom: 8 }} />
              <div>{error}</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* READ-ONLY NOTICE BANNER */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderLeft: "4px solid var(--primary)",
                  padding: "10px 14px",
                  borderRadius: "0 6px 6px 0",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#334155",
                }}
              >
                <Lock size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div>
                  <strong>This is a read-only profile.</strong>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Official role, administrative jurisdiction, and permission authorizations are managed strictly by authorized administrators in <em>Admin → User & Access Control</em>.
                  </div>
                </div>
              </div>

              {/* Profile Overview Card */}
              <div
                className="card"
                style={{
                  margin: 0,
                  padding: 16,
                  background: "var(--bg-alt)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Role / Position
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--primary-dark)", marginTop: 2 }}>
                      {formatRole(user?.role)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Area / Administrative Jurisdiction
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginTop: 2 }}>
                      {user?.jurisdictionNode ? (
                        <span>
                          {user.jurisdictionNode.name} ({user.jurisdictionNode.level})
                        </span>
                      ) : (
                        <span style={{ color: "var(--primary)" }}>Gujarat State (Full Jurisdiction)</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Official Email
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <Mail size={12} style={{ color: "var(--text-muted)" }} />
                      <a href={`mailto:${user?.email}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {user?.email || "–"}
                      </a>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Contact Phone
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                      <Phone size={12} style={{ color: "var(--text-muted)" }} />
                      <span>{user?.phone || "+91 (R&B Department Direct)"}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Departmental Designation
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>
                      {user?.designation || "Executive Officer"}
                    </div>
                  </div>

                  {user?.contractorCompany && (
                    <div>
                      <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                        Contracting Firm
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--accent-gold)", marginTop: 2 }}>
                        {user.contractorCompany}
                      </div>
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 800, color: "var(--text-muted)" }}>
                      Account Status
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span className={`badge ${user?.status === "Active" || !user?.status ? "badge-good" : "badge-critical"}`}>
                        {user?.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ASSOCIATED PROJECTS */}
              <div className="card" style={{ margin: 0, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <FolderKanban size={14} style={{ color: "var(--primary)" }} />
                    Associated Projects
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: 11 }}>
                    {assignedProjects.length} Projects
                  </span>
                </div>

                {assignedProjects.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No ongoing project allocations assigned directly to this user.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {assignedProjects.map((p) => (
                      <div
                        key={p._id || p.projectId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          background: "var(--bg-alt)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong style={{ color: "var(--primary-dark)" }}>{p.projectId}</strong> · {p.name}
                          {p.currentStageName && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              Current Stage: <strong>{p.currentStageName}</strong>
                            </div>
                          )}
                        </div>
                        {onOpenProject && p._id && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={() => {
                              onClose();
                              onOpenProject(p._id);
                            }}
                          >
                            View Project
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ASSOCIATED ASSETS */}
              <div className="card" style={{ margin: 0, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Layers size={14} style={{ color: "var(--primary)" }} />
                    Associated Infrastructure Assets
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: 11 }}>
                    {associatedAssets.length} Assets
                  </span>
                </div>

                {associatedAssets.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No standalone infrastructure assets directly linked to this user's role.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {associatedAssets.map((a) => (
                      <div
                        key={a._id || a.assetId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          background: "var(--bg-alt)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong style={{ color: "var(--primary-dark)" }}>{a.assetId}</strong> · {a.name}
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            {a.type} · Condition: <span className="badge badge-good" style={{ fontSize: 10 }}>{a.condition}</span>
                          </div>
                        </div>
                        {onOpenAsset && a._id && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={() => {
                              onClose();
                              onOpenAsset(a._id);
                            }}
                          >
                            View Asset
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CURRENT WORK ORDERS / ASSIGNMENTS */}
              <div className="card" style={{ margin: 0, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <Wrench size={14} style={{ color: "var(--accent-gold)" }} />
                    Current Assignments & Maintenance Tasks
                  </div>
                  <span className="badge badge-gold" style={{ fontSize: 11 }}>
                    {workOrders.length} Tasks
                  </span>
                </div>

                {workOrders.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    No pending maintenance tasks currently assigned.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {workOrders.map((wo) => (
                      <div
                        key={wo._id || wo.workOrderId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 10px",
                          background: "var(--bg-alt)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong>{wo.workOrderId}</strong>: {wo.title}
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                            Priority: {wo.priority} · Status: <strong>{wo.status}</strong>
                          </div>
                        </div>
                        {onOpenAsset && (wo.asset?._id || wo.asset) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={() => {
                              onClose();
                              onOpenAsset(wo.asset?._id || wo.asset);
                            }}
                          >
                            View Asset
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Read-only, no edit controls) */}
        <div className="modal-footer" style={{ borderTop: "1px solid var(--border-light)" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: "auto" }}>
            🔒 Read-only view
          </span>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
