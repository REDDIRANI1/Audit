"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import { dashboardApi } from "@/lib/api";
import type { DashboardData } from "@/types";
import {
    LayoutDashboard,
    Users,
    Server,
    Activity,
    Shield,
    Database,
    Loader2,
} from "lucide-react";

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        dashboardApi
            .get()
            .then((res) => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div style={{ display: "flex" }}>
                <Sidebar />
                <main
                    className="main-with-sidebar"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                    }}
                >
                    <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-blue)" }} />
                </main>
            </div>
        );
    }

    // System health mock data
    const systemHealth = [
        { label: "API Latency", value: "45ms", status: "ok", icon: <Activity size={18} color="#10b981" /> },
        { label: "Database", value: "Connected", status: "ok", icon: <Database size={18} color="#10b981" /> },
        { label: "Redis Queue", value: "3 pending", status: "ok", icon: <Server size={18} color="#f59e0b" /> },
        { label: "Storage (MinIO)", value: "2.4 GB used", status: "ok", icon: <Database size={18} color="#6366f1" /> },
    ];

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
                            Admin Dashboard
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            System administration and monitoring
                        </p>
                    </div>

                    {/* Main Metrics */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 16,
                            marginBottom: 32,
                        }}
                    >
                        <MetricCard
                            label="Total Users"
                            value={12}
                            icon={<Users size={18} color="#6366f1" />}
                        />
                        <MetricCard
                            label="Total Calls"
                            value={456}
                            icon={<LayoutDashboard size={18} color="#8b5cf6" />}
                            accentColor="#8b5cf6"
                        />
                        <MetricCard
                            label="Active Templates"
                            value={4}
                            icon={<Shield size={18} color="#10b981" />}
                            accentColor="#10b981"
                        />
                        <MetricCard
                            label="Queue Length"
                            value={3}
                            icon={<Server size={18} color="#f59e0b" />}
                            accentColor="#f59e0b"
                        />
                    </div>

                    {/* System Health */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 20 }}>
                            System Health
                        </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                            {systemHealth.map((s) => (
                                <div
                                    key={s.label}
                                    style={{
                                        background: "var(--bg-card)",
                                        borderRadius: 12,
                                        padding: 16,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    {s.icon}
                                    <div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                            {s.label}
                                        </div>
                                        <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                                            {s.value}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Audit Logs */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 20 }}>
                            Recent Audit Logs
                        </h2>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Resource</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { time: "2 min ago", user: "admin@audit.ai", action: "LOGIN", resource: "Auth" },
                                    { time: "15 min ago", user: "manager@audit.ai", action: "UPLOAD", resource: "Call #45" },
                                    { time: "1 hr ago", user: "agent@audit.ai", action: "VIEW_RESULTS", resource: "Call #42" },
                                    { time: "2 hr ago", user: "admin@audit.ai", action: "CREATE_TEMPLATE", resource: "Template #3" },
                                ].map((log, i) => (
                                    <tr key={i}>
                                        <td style={{ color: "var(--text-secondary)" }}>{log.time}</td>
                                        <td>{log.user}</td>
                                        <td>
                                            <span
                                                style={{
                                                    padding: "3px 10px",
                                                    borderRadius: 6,
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    background: "rgba(99,102,241,0.1)",
                                                    color: "#818cf8",
                                                }}
                                            >
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ color: "var(--text-secondary)" }}>{log.resource}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
