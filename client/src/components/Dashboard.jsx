import React, { useEffect, useState } from "react";
import {
  Layers,
  FolderKanban,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ShieldCheck,
  Building,
  ArrowRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { api } from "../services/api";

export default function Dashboard({ currentUser, onNavigate, onOpenAsset, onOpenProject, onOpenUserProfile }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState([]);
  const [recentWorkOrders, setRecentWorkOrders] = useState([]);
  const [recentAssets, setRecentAssets] = useState([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [dashStats, prjs, wos, asts] = await Promise.all([
          api.getDashboardStats(),
          api.getProjects(),
          api.getWorkOrders(),
          api.getAssets(),
        ]);
        setStats(dashStats);
        setRecentProjects(prjs.slice(0, 5));
        setRecentWorkOrders(wos.slice(0, 5));
        setRecentAssets((asts || []).slice(0, 6));
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 40 }}>
        <div>Loading dashboard metrics...</div>
      </div>
    );
  }

  const role = currentUser?.role;

  return (
    <div>
      {/* Top Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #0f2942 0%, #1e3a5f 100%)",
          color: "#ffffff",
          border: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 4 }}>
              Welcome, {currentUser?.name}
            </h2>
            <p style={{ fontSize: 12, color: "#cbd5e1" }}>
              {currentUser?.designation || currentUser?.role} ·{" "}
              {currentUser?.jurisdictionNode?.name
                ? `Jurisdiction: ${currentUser.jurisdictionNode.name}`
                : "Jurisdiction: Gujarat State (Full Access)"}
            </p>
          </div>
          <span className="badge badge-good" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid #059669" }}>
            Operational Baseline Active
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Assets Managed</div>
          <div className="stat-value">{stats?.totalAssets || 0}</div>
          <div className="stat-subtext">₹{stats?.totalSanctionedCost || 0} Cr asset valuation</div>
        </div>

        <div className="stat-card gold">
          <div className="stat-label">Infrastructure Projects</div>
          <div className="stat-value">{stats?.totalProjects || 0}</div>
          <div className="stat-subtext">
            ₹{stats?.totalProjectSpend || 0} Cr spent of ₹{stats?.totalProjectBudget || 0} Cr
          </div>
        </div>

        <div className="stat-card red">
          <div className="stat-label">Open Field Defects</div>
          <div className="stat-value">{stats?.openDefects || 0}</div>
          <div className="stat-subtext">Identified via quality & field audits</div>
        </div>

        <div className="stat-card blue">
          <div className="stat-label">Maintenance Work Orders</div>
          <div className="stat-value">{stats?.totalWorkOrders || 0}</div>
          <div className="stat-subtext">Active repair & rectification tasks</div>
        </div>
      </div>

      {/* ROLE SPECIFIC WORKSPACE */}
      
      {/* 1. CONTRACTOR WORKSPACE */}
      {role === "contractor" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} /> My Assigned Work Orders & Projects
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("maintenance")}>
              View All Work Orders <ArrowRight size={12} />
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            You are logged in as Contractor: <strong>{currentUser?.contractorCompany || currentUser?.name}</strong>.
            You only have access to projects and maintenance work orders assigned directly to you.
          </p>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO ID</th>
                  <th>Title</th>
                  <th>Asset</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkOrders.map((wo) => {
                  const assetId = wo.asset?._id || wo.asset;
                  return (
                    <tr key={wo._id} className="clickable" onClick={() => onNavigate("maintenance")}>
                      <td><strong>{wo.workOrderId}</strong></td>
                      <td>{wo.title}</td>
                      <td>
                        {assetId ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "2px 8px", fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenAsset) onOpenAsset(assetId);
                            }}
                          >
                            {wo.asset?.name || "View Asset"}
                          </button>
                        ) : (
                          wo.asset?.name || "–"
                        )}
                      </td>
                      <td>
                        <span className={`badge ${wo.priority === "Emergency" ? "badge-critical" : "badge-fair"}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${wo.status === "Completed" ? "badge-good" : "badge-blue"}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td>₹{wo.estimatedCost} Lakhs</td>
                    </tr>
                  );
                })}
                {!recentWorkOrders.length && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                      No active work orders currently assigned to you.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PROJECT MANAGER WORKSPACE */}
      {role === "project_manager" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FolderKanban size={16} /> My Assigned Infrastructure Projects
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("projects")}>
              View Projects Board <ArrowRight size={12} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Project Name</th>
                  <th>Category</th>
                  <th>Current Stage</th>
                  <th>Budget (₹ Cr)</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {recentProjects.map((p) => (
                  <tr key={p._id} className="clickable" onClick={() => onOpenProject(p._id)}>
                    <td><strong>{p.projectId}</strong></td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td><span className="badge badge-blue">{p.currentStageName}</span></td>
                    <td>₹{p.sanctionedBudget} Cr</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${p.progressPercentage}%`, height: "100%", background: "var(--primary)" }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700 }}>{p.progressPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MAINTENANCE ENGINEER WORKSPACE */}
      {role === "maintenance_engineer" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} /> Maintenance Defect Rectification Pipeline
            </div>
            <button className="btn btn-gold btn-sm" onClick={() => onNavigate("maintenance")}>
              Manage Work Orders
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            Review completed contractor repairs, perform engineer verification, and automatically restore asset condition to Good.
          </p>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>WO ID</th>
                  <th>Asset</th>
                  <th>Repair Task</th>
                  <th>Assigned Contractor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentWorkOrders.map((wo) => {
                  const assetId = wo.asset?._id || wo.asset;
                  const contractorName = wo.contractorCompany || wo.assignedContractor?.name || "Contractor";
                  return (
                    <tr key={wo._id}>
                      <td><strong>{wo.workOrderId}</strong></td>
                      <td>
                        {assetId ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "2px 8px", fontSize: 11 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenAsset) onOpenAsset(assetId);
                            }}
                          >
                            {wo.asset?.name || "View Asset"}
                          </button>
                        ) : (
                          wo.asset?.name || "–"
                        )}
                      </td>
                      <td>{wo.title}</td>
                      <td>
                        <button
                          type="button"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "var(--primary)",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: 12,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenUserProfile) {
                              onOpenUserProfile(wo.assignedContractor?._id || contractorName);
                            }
                          }}
                        >
                          {contractorName}
                        </button>
                      </td>
                      <td>
                        <span className={`badge ${wo.status === "Verified & Closed" ? "badge-good" : wo.status === "Completed" ? "badge-fair" : "badge-blue"}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("maintenance")}>
                          Inspect / Verify
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MANAGEMENT / ADMIN OVERVIEW */}
      {(role === "admin" || role === "management" || role === "department_officer") && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
          {/* Asset Condition Distribution */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ShieldCheck size={16} /> Asset Condition Breakdown
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stats?.assetsByCondition?.map((c) => {
                const badgeClass =
                  c._id === "Good" ? "badge-good" : c._id === "Fair" ? "badge-fair" : c._id === "Poor" ? "badge-poor" : "badge-critical";
                const total = stats.totalAssets || 1;
                const pct = Math.round((c.count / total) * 100);
                return (
                  <div key={c._id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                      <span>
                        <span className={`badge ${badgeClass}`}>{c._id}</span> {c.count} assets
                      </span>
                      <strong>{pct}% (₹{c.totalCost?.toFixed(1) || 0} Cr)</strong>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background:
                            c._id === "Good"
                              ? "var(--status-good)"
                              : c._id === "Fair"
                              ? "var(--status-fair)"
                              : "var(--status-critical)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Infrastructure Category Split */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Building size={16} /> Asset Categories
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
              {stats?.assetsByCategory?.map((cat) => (
                <div
                  key={cat._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "var(--bg-alt)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div>
                    <strong>{cat._id} Assets</strong>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {cat._id === "Road" ? "State Highways, Bridges, Culverts" : "Administrative Blocks, Civil Hospitals"}
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: 14, padding: "4px 10px" }}>
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Monitored Core Infrastructure Assets Table */}
          <div className="card" style={{ gridColumn: "1 / -1" }}>
            <div className="card-header">
              <div className="card-title">
                <Layers size={16} /> Key Infrastructure Assets (State Asset Repository)
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate("assets")}>
                View All Assets <ArrowRight size={12} />
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th>Asset Name</th>
                    <th>Type</th>
                    <th>Jurisdiction</th>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Sanctioned Cost</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssets.map((a) => (
                    <tr key={a._id} className="clickable" onClick={() => onOpenAsset && onOpenAsset(a._id)}>
                      <td><strong style={{ color: "var(--primary)" }}>{a.assetId}</strong></td>
                      <td><strong>{a.name}</strong></td>
                      <td><span className="badge badge-blue">{a.type}</span></td>
                      <td style={{ fontSize: 12 }}>{a.subDivision?.name || "Gujarat State"}</td>
                      <td>
                        <span className={`badge ${a.condition === "Good" ? "badge-good" : a.condition === "Fair" ? "badge-fair" : "badge-poor"}`}>
                          {a.condition}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-gold">{a.status}</span>
                      </td>
                      <td>₹{a.financials?.sanctionedCost || 0} Cr</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenAsset) onOpenAsset(a._id);
                          }}
                        >
                          View Asset <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentAssets.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                        No infrastructure assets loaded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
