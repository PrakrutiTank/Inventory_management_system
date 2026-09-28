import React from "react";
import {
  LayoutDashboard,
  Layers,
  FolderKanban,
  FileCheck2,
  Wrench,
  MapPin,
  Sliders,
  Users,
  History,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assets", label: "Asset Inventory", icon: Layers, perm: "asset.view" },
  { id: "projects", label: "Projects & Lifecycle", icon: FolderKanban, perm: "project.view" },
  { id: "inspections", label: "Quality & Inspections", icon: FileCheck2, perm: "inspection.view" },
  { id: "maintenance", label: "Maintenance & WOs", icon: Wrench, perm: "maintenance.view" },
  { id: "map", label: "GIS Asset Map", icon: MapPin, perm: "asset.view" },
  { id: "lifecycle_builder", label: "Lifecycle Builder", icon: Sliders, perm: "lifecycle.view" },
  { id: "user_mgmt", label: "User & Access Mgmt", icon: Users, perm: "user.manage" },
  { id: "audit", label: "Audit Trail", icon: History, perm: "audit.view" },
];

export default function Sidebar({ activeTab, onSelectTab, permissions = [], currentUser }) {
  const isAdmin = currentUser?.role === "admin";

  const hasPerm = (perm) => {
    if (isAdmin) return true;
    if (!perm) return true;
    return permissions.includes(perm);
  };

  return (
    <aside className="app-sidebar">
      <div className="nav-heading">Main Navigation</div>

      {NAV_ITEMS.map((item) => {
        if (!hasPerm(item.perm)) return null;
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={() => onSelectTab(item.id)}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="nav-divider" />
      <div style={{ padding: "8px 12px", fontSize: 11, color: "var(--text-light)" }}>
        <div>Gujarat State R&B</div>
        <div>v2.4.0 · MERN Stack</div>
      </div>
    </aside>
  );
}
