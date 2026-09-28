import React from "react";
import { Shield, RefreshCw, UserCheck } from "lucide-react";

export default function Header({ users, currentUser, onSelectUser, onReseed, loadingReseed }) {
  return (
    <header className="gov-masthead">
      <div className="masthead-inner">
        {/* Brand & Emblem */}
        <div className="brand-wrapper">
          <div className="gov-emblem-badge" title="Government of Gujarat">
            GJ
          </div>
          <div>
            <div className="brand-title">Roads & Buildings Department</div>
            <div className="brand-subtitle">
              Government of Gujarat · Infrastructure Asset Management System (IAMS)
            </div>
          </div>
        </div>

        {/* Prototype User Switcher */}
        <div className="user-switcher-container">
          <div className="switcher-box">
            <UserCheck size={16} color="var(--accent-gold)" />
            <div>
              <div className="switcher-label">Prototype User Switcher</div>
              <select
                className="user-select-dropdown"
                value={currentUser?._id || ""}
                onChange={(e) => onSelectUser(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} — {u.designation || u.role} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentUser && (
            <div className="user-badge-meta">
              <div>
                <strong>{currentUser.name}</strong>
                <span className="role-pill-sm">{currentUser.role.replace("_", " ")}</span>
              </div>
              <span style={{ color: "#94a3b8" }}>
                {currentUser.jurisdictionNode?.name
                  ? `Scope: ${currentUser.jurisdictionNode.name}`
                  : "Scope: Gujarat State (Full)"}
              </span>
            </div>
          )}

          {/* Quick Reseed DB Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onReseed}
            disabled={loadingReseed}
            title="Reset database with standard Gujarat R&B dataset"
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            <RefreshCw size={12} className={loadingReseed ? "spin" : ""} />
            {loadingReseed ? "Resetting..." : "Reset Data"}
          </button>
        </div>
      </div>
    </header>
  );
}
