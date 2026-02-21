"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import { dashboardApi } from "@/lib/api";
import type { DashboardData } from "@/types";
import {
    BarChart3,
    TrendingUp,
    Users,
    CheckCircle2,
    Loader2,
} from "lucide-react";

export default function CXODashboard() {
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

    const metrics = data?.metrics || [];
    const totalCalls = metrics.find((m) => m.label === "Total Calls")?.value || 0;
    const avgScore = metrics.find((m) => m.label === "Avg Quality Score")?.value || 0;
    const completionRate = metrics.find((m) => m.label === "Completion Rate")?.value || "0%";
    const activeUsers = metrics.find((m) => m.label === "Active Users")?.value || 0;

    // Mock vertical breakdown
    const verticals = [
        { name: "Sales", score: 82.5, calls: 245, trend: "up" as const, color: "#6366f1" },
        { name: "Support", score: 78.3, calls: 189, trend: "flat" as const, color: "#8b5cf6" },
        { name: "Collections", score: 91.2, calls: 67, trend: "up" as const, color: "#10b981" },
    ];

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
                            Executive Dashboard
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            Company-wide KPIs and strategic overview
                        </p>
                    </div>

                    {/* KPI Cards */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 16,
                            marginBottom: 32,
                        }}
                    >
                        <MetricCard
                            label="Total Calls"
                            value={totalCalls}
                            icon={<BarChart3 size={18} color="#6366f1" />}
                        />
                        <MetricCard
                            label="Avg Quality Score"
                            value={avgScore}
                            icon={<TrendingUp size={18} color="#10b981" />}
                            accentColor="#10b981"
                        />
                        <MetricCard
                            label="Completion Rate"
                            value={completionRate}
                            icon={<CheckCircle2 size={18} color="#8b5cf6" />}
                            accentColor="#8b5cf6"
                        />
                        <MetricCard
                            label="Active Users"
                            value={activeUsers}
                            icon={<Users size={18} color="#f59e0b" />}
                            accentColor="#f59e0b"
                        />
                    </div>

                    {/* Vertical Breakdown */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 20 }}>
                            Vertical Performance
                        </h2>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 16,
                            }}
                        >
                            {verticals.map((v) => (
                                <div
                                    key={v.name}
                                    style={{
                                        background: `${v.color}08`,
                                        border: `1px solid ${v.color}20`,
                                        borderRadius: 14,
                                        padding: 24,
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "var(--text-secondary)",
                                            fontWeight: 600,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                            marginBottom: 12,
                                        }}
                                    >
                                        {v.name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "2.25rem",
                                            fontWeight: 700,
                                            color: v.color,
                                            marginBottom: 8,
                                        }}
                                    >
                                        {v.score}
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "0.8rem",
                                                color: "var(--text-secondary)",
                                            }}
                                        >
                                            {v.calls} calls
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                color: v.trend === "up" ? "#10b981" : "var(--text-secondary)",
                                            }}
                                        >
                                            {v.trend === "up" ? "↑ Trending Up" : "→ Stable"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Company Health Summary */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
                            Company Health
                        </h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                            {[
                                { label: "Compliance Rate", value: "96.8%", bar: 96.8, color: "#10b981" },
                                { label: "Agent Satisfaction", value: "4.2/5", bar: 84, color: "#6366f1" },
                                { label: "Avg Handle Time", value: "8.5 min", bar: 70, color: "#f59e0b" },
                                { label: "First Call Resolution", value: "72%", bar: 72, color: "#8b5cf6" },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                            {item.label}
                                        </span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                            {item.value}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            height: 6,
                                            borderRadius: 3,
                                            background: "var(--border-color)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: "100%",
                                                width: `${item.bar}%`,
                                                borderRadius: 3,
                                                background: item.color,
                                                transition: "width 1s ease",
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
