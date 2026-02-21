"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { analyticsApi } from "@/lib/analyticsApi";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Users, TrendingUp, Award, AlertTriangle } from "lucide-react";

interface Agent {
    rank: number;
    user_id: number;
    name: string;
    email: string;
    call_count: number;
    avg_score: number;
    min_score: number;
    max_score: number;
}

export default function TeamAnalyticsPage() {
    const [days, setDays] = useState(30);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [overview, setOverview] = useState<Record<string, number> | null>(null);
    const [selected, setSelected] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            analyticsApi.getAgentLeaderboard(days, 20),
            analyticsApi.getOverview(days),
        ])
            .then(([lb, ov]) => {
                setAgents(lb.data as Agent[]);
                setOverview(ov.data as Record<string, number>);
                setSelected((lb.data as Agent[])[0] ?? null);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [days]);

    const scoreColor = (s: number) =>
        s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";

    // Radar data for selected agent (mocked pillars based on avg/min/max)
    const radarData = selected
        ? [
            { pillar: "Communication", score: Math.min(100, selected.avg_score + 5) },
            { pillar: "Empathy", score: Math.min(100, selected.avg_score - 3) },
            { pillar: "Process", score: Math.min(100, selected.avg_score + 2) },
            { pillar: "Compliance", score: Math.min(100, selected.avg_score + 8) },
            { pillar: "Resolution", score: Math.min(100, selected.avg_score - 1) },
        ]
        : [];

    const atRisk = agents.filter((a) => a.avg_score < 60);
    const stars = agents.filter((a) => a.avg_score >= 80);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: "1.6rem", fontWeight: 700 }}>Team Analytics</h1>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: 4 }}>
                            Agent performance breakdown and coaching insights
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", padding: 4, borderRadius: 10 }}>
                        {[7, 14, 30, 60].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: 7,
                                    border: "none",
                                    cursor: "pointer",
                                    background: days === d ? "var(--accent-blue)" : "transparent",
                                    color: days === d ? "white" : "var(--text-secondary)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s",
                                }}
                            >
                                {d}d
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
                        {/* Summary Stats */}
                        {overview && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                                {[
                                    { label: "Team Size", value: agents.length, icon: <Users size={18} />, color: "#6366f1" },
                                    { label: "Team Avg Score", value: `${overview.avg_score}`, icon: <TrendingUp size={18} />, color: scoreColor(overview.avg_score) },
                                    { label: "Star Agents", value: stars.length, icon: <Award size={18} />, color: "#10b981" },
                                    { label: "At Risk", value: atRisk.length, icon: <AlertTriangle size={18} />, color: "#ef4444" },
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

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
                            {/* Agent Table */}
                            <div className="glass-card" style={{ padding: 24 }}>
                                <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 20, color: "var(--text-secondary)" }}>
                                    All Agents
                                </h2>
                                {agents.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {agents.map((agent, i) => (
                                            <div
                                                key={agent.user_id}
                                                onClick={() => setSelected(agent)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 16,
                                                    padding: "12px 16px",
                                                    borderRadius: 10,
                                                    cursor: "pointer",
                                                    background: selected?.user_id === agent.user_id
                                                        ? "rgba(99,102,241,0.1)"
                                                        : "transparent",
                                                    border: selected?.user_id === agent.user_id
                                                        ? "1px solid rgba(99,102,241,0.3)"
                                                        : "1px solid transparent",
                                                    transition: "all 0.15s",
                                                }}
                                            >
                                                {/* Rank */}
                                                <span style={{ width: 28, fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                                </span>

                                                {/* Avatar */}
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: "50%",
                                                    background: `hsl(${(agent.user_id * 47) % 360}, 60%, 35%)`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "0.85rem", fontWeight: 700, color: "white", flexShrink: 0,
                                                }}>
                                                    {agent.name[0]?.toUpperCase()}
                                                </div>

                                                {/* Name + calls */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: "0.9rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {agent.name}
                                                    </div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                                        {agent.call_count} calls
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: scoreColor(agent.avg_score) }}>
                                                        {agent.avg_score}
                                                    </div>
                                                    <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>avg</div>
                                                </div>

                                                {/* Mini bar */}
                                                <div style={{ width: 60 }}>
                                                    <div style={{ height: 4, background: "var(--border-color)", borderRadius: 2, overflow: "hidden" }}>
                                                        <div style={{
                                                            height: "100%",
                                                            width: `${agent.avg_score}%`,
                                                            background: scoreColor(agent.avg_score),
                                                            borderRadius: 2,
                                                            transition: "width 0.5s",
                                                        }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "48px 0", fontSize: "0.85rem" }}>
                                        No agent data yet. Process some calls first.
                                    </p>
                                )}
                            </div>

                            {/* Right Panel – Agent Detail */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {selected ? (
                                    <>
                                        {/* Agent Card */}
                                        <div className="glass-card" style={{ padding: 20 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: "50%",
                                                    background: `hsl(${(selected.user_id * 47) % 360}, 60%, 35%)`,
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    fontSize: "1.2rem", fontWeight: 700, color: "white",
                                                }}>
                                                    {selected.name[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{selected.name}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{selected.email}</div>
                                                </div>
                                            </div>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                                                {[
                                                    { label: "Avg", value: selected.avg_score, color: scoreColor(selected.avg_score) },
                                                    { label: "Min", value: selected.min_score, color: "#ef4444" },
                                                    { label: "Max", value: selected.max_score, color: "#10b981" },
                                                ].map((m) => (
                                                    <div key={m.label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                                                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: m.color }}>{m.value}</div>
                                                        <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: 2 }}>{m.label}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Status badge */}
                                            <div style={{ marginTop: 12, textAlign: "center" }}>
                                                <span style={{
                                                    padding: "4px 12px",
                                                    borderRadius: 20,
                                                    fontSize: "0.75rem",
                                                    fontWeight: 600,
                                                    background: selected.avg_score >= 80
                                                        ? "rgba(16,185,129,0.1)"
                                                        : selected.avg_score >= 60
                                                            ? "rgba(245,158,11,0.1)"
                                                            : "rgba(239,68,68,0.1)",
                                                    color: scoreColor(selected.avg_score),
                                                }}>
                                                    {selected.avg_score >= 80 ? "⭐ Top Performer" : selected.avg_score >= 60 ? "📈 On Track" : "⚠ Needs Coaching"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Radar Chart */}
                                        <div className="glass-card" style={{ padding: 20 }}>
                                            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", marginBottom: 12 }}>
                                                Pillar Breakdown
                                            </h3>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <RadarChart data={radarData}>
                                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                                    <PolarAngleAxis dataKey="pillar" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                                    <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                                                    <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                ) : (
                                    <div className="glass-card" style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                                        Select an agent to view details
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* At-Risk Coaching Panel */}
                        {atRisk.length > 0 && (
                            <div className="glass-card" style={{ padding: 24, marginTop: 20, borderColor: "rgba(239,68,68,0.2)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                                    <AlertTriangle size={16} color="#ef4444" />
                                    <h2 style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ef4444" }}>
                                        Coaching Required
                                    </h2>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                                    {atRisk.map((agent) => (
                                        <div
                                            key={agent.user_id}
                                            style={{
                                                padding: "12px 16px",
                                                borderRadius: 10,
                                                background: "rgba(239,68,68,0.06)",
                                                border: "1px solid rgba(239,68,68,0.15)",
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{agent.name}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                                Avg: <span style={{ color: "#ef4444", fontWeight: 700 }}>{agent.avg_score}</span> ({agent.call_count} calls)
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
