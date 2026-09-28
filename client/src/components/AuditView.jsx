import React, { useState, useEffect } from "react";
import { History, ShieldCheck, Search } from "lucide-react";
import { api } from "../services/api";

export default function AuditView({ currentUser, onOpenAsset, onOpenUserProfile }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [currentUser]);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--primary-dark)" }}>
            Immutable Statutory Audit Trail
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Chronological audit log tracking all asset registrations, lifecycle stage transitions, inspections, and maintenance work orders.
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          className="form-control"
          style={{ width: 280 }}
          placeholder="Filter audit entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Officer / User</th>
                <th>Action Performed</th>
                <th>Entity Target</th>
                <th>Audit Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30 }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l._id}>
                    <td style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {new Date(l.at).toLocaleString()}
                    </td>
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
                          fontSize: 13,
                          textAlign: "left",
                        }}
                        onClick={() => onOpenUserProfile && onOpenUserProfile(l.userId || l.userName)}
                      >
                        {l.userName}
                      </button>
                      <div style={{ fontSize: 10, color: "var(--text-light)" }}>
                        {l.userRole?.replace("_", " ")}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{l.action}</span>
                    </td>
                    <td>
                      <strong>{l.entityType}</strong>:{" "}
                      {l.entityType === "Asset" ? (
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
                          }}
                          onClick={() => onOpenAsset && onOpenAsset(l.entityId)}
                        >
                          {l.entityId}
                        </button>
                      ) : (
                        <span>{l.entityId}</span>
                      )}
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 300 }}>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                        {JSON.stringify(l.details || {})}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
