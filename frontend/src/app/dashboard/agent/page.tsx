"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import ScoreDial from "@/components/ScoreDial";
import { dashboardApi, callsApi } from "@/lib/api";
import type { DashboardData, Call } from "@/types";
import { formatDate, getStatusColor, getStatusBgColor } from "@/lib/utils";
import {
    Phone,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import Link from "next/link";

export default function AgentDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [recentCalls, setRecentCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            dashboardApi.get(),
            callsApi.list(1, 10),
        ])
            .then(([dashRes, callsRes]) => {
                setData(dashRes.data);
                setRecentCalls(callsRes.data.calls);
            })
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
                    <Loader2
                        size={32}
                        className="animate-spin"
                        style={{ color: "var(--accent-blue)" }}
                    />
                </main>
            </div>
        );
    }

    const metrics = data?.metrics || [];
    const totalCalls = metrics.find((m) => m.label === "Total Calls")?.value || 0;
    const completed = metrics.find((m) => m.label === "Completed")?.value || 0;
    const avgScore = metrics.find((m) => m.label === "Average Score")?.value || 0;
    const processing = metrics.find((m) => m.label === "Processing")?.value || 0;

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    {/* Header */}
                    <div style={{ marginBottom: 32 }}>
                        <h1
                            style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}
                        >
                            Agent Dashboard
                        </h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            Your personal call performance overview
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

                    {/* Top section: Score Dial + Metrics */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr",
                            gap: 24,
                            marginBottom: 32,
                        }}
                    >
                        {/* Score Dial */}
                        <div
                            className="glass-card"
                            style={{
                                padding: 32,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ScoreDial
                                score={Number(avgScore) || 0}
                                label="Avg Score"
                                sublabel="Sales Excellence Score"
                                size={200}
                            />
                        </div>

                        {/* Metric cards */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 16,
                            }}
                        >
                            <MetricCard
                                label="Total Calls"
                                value={totalCalls}
                                icon={<Phone size={18} color="#6366f1" />}
                                accentColor="#6366f1"
                            />
                            <MetricCard
                                label="Completed"
                                value={completed}
                                icon={<CheckCircle2 size={18} color="#10b981" />}
                                accentColor="#10b981"
                            />
                            <MetricCard
                                label="Processing"
                                value={processing}
                                icon={<Clock size={18} color="#f59e0b" />}
                                accentColor="#f59e0b"
                            />
                            <MetricCard
                                label="Avg Score"
                                value={avgScore}
                                icon={<TrendingUp size={18} color="#8b5cf6" />}
                                accentColor="#8b5cf6"
                            />
                        </div>
                    </div>

                    {/* Recent Calls Table */}
                    <div className="glass-card" style={{ padding: 24 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 20,
                            }}
                        >
                            <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>
                                Recent Calls
                            </h2>
                            <Link
                                href="/calls"
                                style={{
                                    fontSize: "0.8rem",
                                    color: "#818cf8",
                                    textDecoration: "none",
                                }}
                            >
                                View All →
                            </Link>
                        </div>

                        {recentCalls.length === 0 ? (
                            <p
                                style={{
                                    textAlign: "center",
                                    color: "var(--text-secondary)",
                                    padding: 40,
                                }}
                            >
                                No calls yet. Upload your first recording to get started.
                            </p>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Duration</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCalls.map((call) => (
                                        <tr key={call.id}>
                                            <td style={{ fontWeight: 500 }}>#{call.id}</td>
                                            <td>
                                                <span
                                                    className={`status-badge ${getStatusBgColor(call.status)}`}
                                                >
                                                    <span
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: "50%",
                                                            background:
                                                                call.status === "completed"
                                                                    ? "#10b981"
                                                                    : call.status === "processing"
                                                                        ? "#f59e0b"
                                                                        : call.status === "failed"
                                                                            ? "#ef4444"
                                                                            : "#6366f1",
                                                        }}
                                                    />
                                                    {call.status}
                                                </span>
                                            </td>
                                            <td style={{ color: "var(--text-secondary)" }}>
                                                {formatDate(call.created_at)}
                                            </td>
                                            <td style={{ color: "var(--text-secondary)" }}>
                                                {call.duration_seconds
                                                    ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60
                                                    }s`
                                                    : "—"}
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/calls/${call.id}`}
                                                    style={{
                                                        color: "#818cf8",
                                                        textDecoration: "none",
                                                        fontSize: "0.85rem",
                                                    }}
                                                >
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
