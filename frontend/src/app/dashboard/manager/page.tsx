"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import { dashboardApi } from "@/lib/api";
import type { DashboardData } from "@/types";
import {
    Users,
    BarChart3,
    TrendingUp,
    AlertTriangle,
    Loader2,
    Target,
} from "lucide-react";

export default function ManagerDashboard() {
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
    const teamCalls = metrics.find((m) => m.label === "Team Calls")?.value || 0;
    const teamAvg = metrics.find((m) => m.label === "Team Avg Score")?.value || 0;
    const teamSize = metrics.find((m) => m.label === "Team Size")?.value || 0;
    const failed = metrics.find((m) => m.label === "Failed Calls")?.value || 0;

    // Mock skill heatmap data
    const skills = [
        { name: "Discovery", scores: [85, 72, 90, 78, 88] },
        { name: "Objection Handling", scores: [70, 65, 80, 75, 82] },
        { name: "Closing", scores: [92, 68, 85, 90, 76] },
        { name: "Empathy", scores: [88, 82, 78, 85, 90] },
        { name: "Compliance", scores: [95, 90, 92, 88, 96] },
    ];
    const agents = ["Alice", "Bob", "Carol", "Dave", "Eve"];

    const getHeatColor = (score: number) => {
        if (score >= 90) return "rgba(16,185,129,0.7)";
        if (score >= 80) return "rgba(16,185,129,0.4)";
        if (score >= 70) return "rgba(245,158,11,0.5)";
        return "rgba(239,68,68,0.5)";
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    <div style={{ marginBottom: 32 }}>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
                            Manager Dashboard
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            Team performance overview and risk management
                        </p>
                    </div>

                    {/* Alerts */}
                    {data?.alerts && data.alerts.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            {data.alerts.map((alert, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "12px 16px",
                                        background: "rgba(245,158,11,0.06)",
                                        border: "1px solid rgba(245,158,11,0.15)",
                                        borderRadius: 12,
                                        marginBottom: 8,
                                        fontSize: "0.9rem",
                                    }}
                                >
                                    <AlertTriangle size={18} color="#f59e0b" />
                                    {alert.message}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metric Cards */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 16,
                            marginBottom: 32,
                        }}
                    >
                        <MetricCard
                            label="Team Calls"
                            value={teamCalls}
                            icon={<BarChart3 size={18} color="#6366f1" />}
                        />
                        <MetricCard
                            label="Team Avg Score"
                            value={teamAvg}
                            icon={<TrendingUp size={18} color="#10b981" />}
                            accentColor="#10b981"
                        />
                        <MetricCard
                            label="Team Size"
                            value={teamSize}
                            icon={<Users size={18} color="#8b5cf6" />}
                            accentColor="#8b5cf6"
                        />
                        <MetricCard
                            label="Failed Calls"
                            value={failed}
                            icon={<Target size={18} color="#ef4444" />}
                            accentColor="#ef4444"
                        />
                    </div>

                    {/* Skill Heatmap */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 20 }}>
                            Skill Score Heatmap
                        </h2>
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "8px 12px",
                                                fontSize: "0.75rem",
                                                color: "var(--text-secondary)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Skill
                                        </th>
                                        {agents.map((agent) => (
                                            <th
                                                key={agent}
                                                style={{
                                                    textAlign: "center",
                                                    padding: "8px 12px",
                                                    fontSize: "0.75rem",
                                                    color: "var(--text-secondary)",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {agent}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {skills.map((skill) => (
                                        <tr key={skill.name}>
                                            <td
                                                style={{
                                                    padding: "8px 12px",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {skill.name}
                                            </td>
                                            {skill.scores.map((score, j) => (
                                                <td key={j} style={{ padding: 4, textAlign: "center" }}>
                                                    <div
                                                        style={{
                                                            background: getHeatColor(score),
                                                            borderRadius: 8,
                                                            padding: "8px 0",
                                                            fontSize: "0.85rem",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {score}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Risk Radar placeholder */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
                            Risk Radar
                        </h2>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: 12,
                            }}
                        >
                            {[
                                {
                                    label: "Low Score Calls (< 60)",
                                    count: 3,
                                    color: "#ef4444",
                                },
                                { label: "Compliance Flags", count: 1, color: "#f59e0b" },
                                { label: "Missed Greetings", count: 5, color: "#f59e0b" },
                            ].map((risk, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: `${risk.color}08`,
                                        border: `1px solid ${risk.color}20`,
                                        borderRadius: 12,
                                        padding: 16,
                                        textAlign: "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "1.5rem",
                                            fontWeight: 700,
                                            color: risk.color,
                                            marginBottom: 4,
                                        }}
                                    >
                                        {risk.count}
                                    </div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                        {risk.label}
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
