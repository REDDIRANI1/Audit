"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutDashboard,
    Upload,
    FileAudio,
    Settings,
    LogOut,
    ChevronRight,
    Shield,
    Users,
    BarChart3,
    FileText,
} from "lucide-react";
import type { User } from "@/types";

const roleLinks: Record<
    string,
    { href: string; icon: React.ReactNode; label: string }[]
> = {
    agent: [
        { href: "/dashboard/agent", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { href: "/upload", icon: <Upload size={18} />, label: "Upload Calls" },
        { href: "/calls", icon: <FileAudio size={18} />, label: "My Calls" },
    ],
    manager: [
        { href: "/dashboard/manager", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { href: "/upload", icon: <Upload size={18} />, label: "Upload Calls" },
        { href: "/calls", icon: <FileAudio size={18} />, label: "Team Calls" },
        { href: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
        { href: "/analytics/team", icon: <Users size={18} />, label: "Team Performance" },
        { href: "/templates", icon: <FileText size={18} />, label: "Templates" },
    ],
    cxo: [
        { href: "/dashboard/cxo", icon: <BarChart3 size={18} />, label: "Executive View" },
        { href: "/calls", icon: <FileAudio size={18} />, label: "All Calls" },
        { href: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
        { href: "/analytics/team", icon: <Users size={18} />, label: "Team Performance" },
    ],
    admin: [
        { href: "/dashboard/admin", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
        { href: "/upload", icon: <Upload size={18} />, label: "Upload Calls" },
        { href: "/calls", icon: <FileAudio size={18} />, label: "All Calls" },
        { href: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics" },
        { href: "/analytics/team", icon: <Users size={18} />, label: "Team Performance" },
        { href: "/templates", icon: <FileText size={18} />, label: "Templates" },
        { href: "/settings", icon: <Settings size={18} />, label: "Settings" },
    ],
};

export default function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    const role = user?.role?.toLowerCase() || "agent";
    const links = roleLinks[role] || roleLinks.agent;

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 36,
                    paddingLeft: 8,
                }}
            >
                <div
                    style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "var(--gradient-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Shield size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>Audit AI</div>
                    <div
                        style={{
                            fontSize: "0.7rem",
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                    >
                        {role} view
                    </div>
                </div>
            </div>

            {/* Nav links */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`sidebar-link ${pathname === link.href ? "active" : ""}`}
                    >
                        {link.icon}
                        {link.label}
                        {pathname === link.href && (
                            <ChevronRight
                                size={14}
                                style={{ marginLeft: "auto", opacity: 0.5 }}
                            />
                        )}
                    </Link>
                ))}
            </nav>

            {/* User info & logout */}
            <div
                style={{
                    position: "absolute",
                    bottom: 24,
                    left: 16,
                    right: 16,
                }}
            >
                <div
                    style={{
                        padding: "12px 16px",
                        background: "var(--bg-card)",
                        borderRadius: 12,
                        marginBottom: 8,
                    }}
                >
                    <div
                        style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            marginBottom: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {user?.full_name || "User"}
                    </div>
                    <div
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {user?.email}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="sidebar-link"
                    style={{
                        width: "100%",
                        border: "none",
                        cursor: "pointer",
                        background: "none",
                        color: "var(--accent-red)",
                    }}
                >
                    <LogOut size={18} /> Sign Out
                </button>
            </div>
        </aside>
    );
}
