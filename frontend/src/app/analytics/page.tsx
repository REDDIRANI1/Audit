"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { analyticsApi } from "@/lib/analyticsApi";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { TrendingUp, BarChart2, Users, PhoneCall } from "lucide-react";
import SentimentHeatmap from "@/components/SentimentHeatmap";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mock data for sentiment heatmap
const MOCK_HEATMAP = [
    { day: "Mon", hour: 9, value: 0.8 }, { day: "Mon", hour: 10, value: 0.7 }, { day: "Mon", hour: 14, value: 0.4 },
    { day: "Tue", hour: 11, value: 0.9 }, { day: "Wed", hour: 15, value: 0.2 }, { day: "Thu", hour: 10, value: 0.85 },
    { day: "Fri", hour: 16, value: 0.6 },
].concat(
    Array.from({ length: 40 }, () => ({
        day: ["Mon", "Tue", "Wed", "Thu", "Fri"][Math.floor(Math.random() * 5)],
        hour: Math.floor(Math.random() * 24),
        value: Math.random() * 0.8 + 0.2,
    }))
);

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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            Call quality insights and performance trends
                        </p>
                    </div>

                    {/* Day range switcher */}
                    <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
                        {DAY_OPTIONS.map((opt) => (
                            <Button
                                key={opt.value}
                                variant={days === opt.value ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setDays(opt.value)}
                                className="h-7 px-3 text-xs"
                            >
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center pt-20">
                        <div className="animate-spin w-8 h-8 border-3 border-[var(--border-color)] border-t-[var(--accent-blue)] rounded-full" />
                    </div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        {overview && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {[
                                    { label: "Total Calls", value: overview.total_calls, icon: <PhoneCall size={16} />, color: "#6366f1" },
                                    { label: "Avg QA Score", value: overview.avg_score, icon: <TrendingUp size={16} />, color: scoreColor(overview.avg_score) },
                                    { label: "Success Rate", value: `${overview.success_rate}%`, icon: <BarChart2 size={16} />, color: "#10b981" },
                                    { label: "At-Risk Calls", value: overview.at_risk_count, icon: <Users size={16} />, color: "#ef4444" },
                                ].map((kpi) => (
                                    <Card key={kpi.label}>
                                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                            <CardTitle className="text-xs font-bold">{kpi.label}</CardTitle>
                                            <div style={{ color: kpi.color }}>{kpi.icon}</div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Score Trend + Score Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                            {/* Score Trend */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Avg Score Trend</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scoreTrend.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
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
                                        <div className="h-[220px] flex items-center justify-center text-[var(--text-secondary)] text-sm">No data yet</div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Score Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Score Distribution</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scoreDist.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
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
                                        <div className="h-[220px] flex items-center justify-center text-[var(--text-secondary)] text-sm">No data yet</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sentiment Heatmap (Phase 6 Premium UI) */}
                        <div className="mb-6">
                            <SentimentHeatmap data={MOCK_HEATMAP} />
                        </div>

                        {/* Call Volume */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Daily Call Volume</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {callVolume.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={200}>
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
                                    <div className="h-[200px] flex items-center justify-center text-[var(--text-secondary)] text-sm">No data yet</div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Agent Leaderboard */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Agent Leaderboard</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(leaderboard as Record<string, unknown>[]).length > 0 ? (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr>
                                                {["#", "Agent", "Calls", "Avg Score", "Min", "Max"].map((h) => (
                                                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(leaderboard as Record<string, unknown>[]).map((agent, i) => (
                                                <tr key={String(agent.user_id)} className="border-t border-[var(--border-color)] hover:bg-white/5 transition-colors">
                                                    <td className="py-3 px-3 text-sm text-[var(--text-secondary)]">
                                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${Number(agent.rank)}`}
                                                    </td>
                                                    <td className="py-3 px-3 text-sm font-semibold">{String(agent.name)}</td>
                                                    <td className="py-3 px-3 text-sm">{String(agent.call_count)}</td>
                                                    <td className="py-3 px-3">
                                                        <span className="text-sm font-bold" style={{ color: scoreColor(Number(agent.avg_score)) }}>
                                                            {String(agent.avg_score)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-3 text-sm text-red-400">{String(agent.min_score)}</td>
                                                    <td className="py-3 px-3 text-sm text-emerald-400">{String(agent.max_score)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-[var(--text-secondary)] text-sm text-center py-8">
                                        No agent data available yet. Process some calls first.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
