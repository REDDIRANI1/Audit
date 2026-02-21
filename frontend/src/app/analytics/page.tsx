"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { analyticsApi } from "@/lib/analyticsApi";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, BarChart2, Users, PhoneCall } from "lucide-react";

type DayRange = 7 | 14 | 30 | 60;

interface Overview {
    total_calls: number; completed: number; failed: number;
    avg_score: number; success_rate: number;
    excellent_count: number; at_risk_count: number;
}

const DAY_OPTIONS: { label: string; value: DayRange }[] = [
    { label: "7d", value: 7 },
    { label: "14d", value: 14 },
    { label: "30d", value: 30 },
    { label: "60d", value: 60 },
];

const SCORE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#6366f1", "#10b981"];

export default function AnalyticsPage() {
    const [days, setDays] = useState<DayRange>(30);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [scoreTrend, setScoreTrend] = useState<unknown[]>([]);
    const [scoreDist, setScoreDist] = useState<unknown[]>([]);
    const [callVolume, setCallVolume] = useState<unknown[]>([]);
    const [leaderboard, setLeaderboard] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            analyticsApi.getOverview(days),
            analyticsApi.getScoreTrend(days),
            analyticsApi.getScoreDistribution(days),
            analyticsApi.getCallVolume(days),
            analyticsApi.getAgentLeaderboard(days),
        ])
            .then(([ov, st, sd, cv, lb]) => {
                setOverview(ov.data);
                setScoreTrend(st.data);
                setScoreDist(sd.data);
                setCallVolume(cv.data);
                setLeaderboard(lb.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [days]);

    const scoreColor = (s: number) =>
        s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Analytics</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
                            Call quality insights and performance trends
                        </p>
                    </div>

                    {/* Day range switcher */}
                    <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 4, borderRadius: 10 }}>
                        {DAY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setDays(opt.value)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 7,
                                    border: "none",
                                    cursor: "pointer",
                                    background: days === opt.value ? "var(--accent-blue)" : "transparent",
                                    color: days === opt.value ? "white" : "var(--text-secondary)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s",
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
                        <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--border-color)", borderTopColor: "var(--accent-blue)", borderRadius: "50%" }} />
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        {overview && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                                {[
                                    { label: "Total Calls", value: overview.total_calls, icon: <PhoneCall size={18} />, color: "#6366f1" },
                                    { label: "Avg QA Score", value: `${overview.avg_score}`, icon: <TrendingUp size={18} />, color: scoreColor(overview.avg_score) },
                                    { label: "Success Rate", value: `${overview.success_rate}%`, icon: <BarChart2 size={18} />, color: "#10b981" },
                                    { label: "At-Risk Calls", value: overview.at_risk_count, icon: <Users size={18} />, color: "#ef4444" },
                                ].map((kpi) => (
                                    <div key={kpi.label} className="glass-card" style={{ padding: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                {kpi.label}
                                            </span>
                                            <span style={{ color: kpi.color }}>{kpi.icon}</span>
                                        </div>
                                        <div style={{ fontSize: "2rem", fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Score Trend + Score Distribution */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                            {/* Score Trend */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, color: "var(--text-secondary)" }}>
                                    Avg Score Trend
                                </h2>
                                {scoreTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={scoreTrend as Record<string, unknown>[]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                                            <YAxis domain={[0, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                                                labelStyle={{ color: "#e2e8f0" }}
                                            />
                                            <Line type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Avg Score" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                        No data yet
                                    </div>
                                )}
                            </div>

                            {/* Score Distribution */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, color: "var(--text-secondary)" }}>
                                    Score Distribution
                                </h2>
                                {scoreDist.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={scoreDist as Record<string, unknown>[]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="range" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                                            />
                                            <Bar dataKey="count" name="Calls" radius={[4, 4, 0, 0]}>
                                                {(scoreDist as { range: string }[]).map((_, i) => (
                                                    <Cell key={i} fill={SCORE_COLORS[i]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                        No data yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Call Volume */}
                        <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, color: "var(--text-secondary)" }}>
                                Daily Call Volume
                            </h2>
                            {callVolume.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <BarChart data={callVolume as Record<string, unknown>[]}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                                        />
                                        <Bar dataKey="completed" name="Completed" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="failed" name="Failed" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                    No data yet
                                </div>
                            )}
                        </div>

                        {/* Agent Leaderboard */}
                        <div className="glass-card" style={{ padding: 24 }}>
                            <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, color: "var(--text-secondary)" }}>
                                Agent Leaderboard
                            </h2>
                            {(leaderboard as Record<string, unknown>[]).length > 0 ? (
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            {["#", "Agent", "Calls", "Avg Score", "Min", "Max"].map((h) => (
                                                <th key={h} style={{ textAlign: "left", padding: "0 12px 12px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(leaderboard as Record<string, unknown>[]).map((agent, i) => (
                                            <tr key={String(agent.user_id)} style={{ borderTop: "1px solid var(--border-color)" }}>
                                                <td style={{ padding: "12px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${Number(agent.rank)}`}
                                                </td>
                                                <td style={{ padding: "12px", fontSize: "0.9rem", fontWeight: 500 }}>{String(agent.name)}</td>
                                                <td style={{ padding: "12px", fontSize: "0.85rem" }}>{String(agent.call_count)}</td>
                                                <td style={{ padding: "12px" }}>
                                                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: scoreColor(Number(agent.avg_score)) }}>
                                                        {String(agent.avg_score)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#ef4444" }}>{String(agent.min_score)}</td>
                                                <td style={{ padding: "12px", fontSize: "0.85rem", color: "#10b981" }}>{String(agent.max_score)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", textAlign: "center", padding: "32px 0" }}>
                                    No agent data available yet. Process some calls first.
                                </p>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
