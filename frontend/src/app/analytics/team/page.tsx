"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { analyticsApi } from "@/lib/analyticsApi";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Users, TrendingUp, Award, AlertTriangle } from "lucide-react";
import TeamSkillMatrix from "@/components/TeamSkillMatrix";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Mock team-wide skills
const TEAM_SKILLS = [
    { subject: "Communication", A: 78, fullMark: 100 },
    { subject: "Empathy", A: 82, fullMark: 100 },
    { subject: "Process", A: 65, fullMark: 100 },
    { subject: "Compliance", A: 92, fullMark: 100 },
    { subject: "Resolution", A: 74, fullMark: 100 },
];

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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Team Performance</h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            Agent performance breakdown and coaching insights
                        </p>
                    </div>

                    <div className="flex gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
                        {[7, 14, 30, 60].map((d) => (
                            <Button
                                key={d}
                                variant={days === d ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setDays(d)}
                                className="h-7 px-3 text-xs"
                            >
                                {d}d
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
                        {/* Summary Stats */}
                        {overview && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {[
                                    { label: "Team Size", value: agents.length, icon: <Users size={16} />, color: "#6366f1" },
                                    { label: "Team Avg Score", value: overview.avg_score, icon: <TrendingUp size={16} />, color: scoreColor(overview.avg_score) },
                                    { label: "Star Agents", value: stars.length, icon: <Award size={16} />, color: "#10b981" },
                                    { label: "At Risk", value: atRisk.length, icon: <AlertTriangle size={16} />, color: "#ef4444" },
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

                        {/* Team Health Overview (Phase 6 Premium UI) */}
                        <div className="mb-6">
                            <TeamSkillMatrix data={TEAM_SKILLS} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Agent Table */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>All Agents</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {agents.length > 0 ? (
                                        <div className="space-y-2">
                                            {agents.map((agent, i) => (
                                                <div
                                                    key={agent.user_id}
                                                    onClick={() => setSelected(agent)}
                                                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${selected?.user_id === agent.user_id
                                                            ? "bg-[var(--accent-blue)]/5 border-[var(--accent-blue)]/30"
                                                            : "bg-transparent border-transparent hover:bg-white/5"
                                                        }`}
                                                >
                                                    {/* Rank */}
                                                    <span className="w-8 text-sm text-[var(--text-secondary)] text-center">
                                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                                    </span>

                                                    {/* Avatar */}
                                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                        style={{ background: `hsl(${(agent.user_id * 47) % 360}, 60%, 35%)` }}>
                                                        {agent.name[0]?.toUpperCase()}
                                                    </div>

                                                    {/* Name + calls */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[0.9rem] font-semibold truncate">{agent.name}</div>
                                                        <div className="text-[0.7rem] text-[var(--text-secondary)]">{agent.call_count} calls</div>
                                                    </div>

                                                    {/* Score */}
                                                    <div className="text-right">
                                                        <div className="text-base font-extrabold" style={{ color: scoreColor(agent.avg_score) }}>
                                                            {agent.avg_score}
                                                        </div>
                                                        <div className="text-[0.65rem] text-[var(--text-secondary)] uppercase font-bold tracking-tight">Avg</div>
                                                    </div>

                                                    {/* Mini bar */}
                                                    <div className="w-12 hidden sm:block">
                                                        <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500"
                                                                style={{ width: `${agent.avg_score}%`, background: scoreColor(agent.avg_score) }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[var(--text-secondary)] text-center py-12 text-sm">No agent data yet.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Right Panel – Agent Detail */}
                            <div className="space-y-4">
                                {selected ? (
                                    <>
                                        <Card>
                                            <CardHeader>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white"
                                                        style={{ background: `hsl(${(selected.user_id * 47) % 360}, 60%, 35%)` }}>
                                                        {selected.name[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <CardTitle className="normal-case text-base text-[var(--text-primary)]">{selected.name}</CardTitle>
                                                        <CardDescription className="truncate">{selected.email}</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-3 gap-2 mb-4">
                                                    {[
                                                        { label: "Avg", value: selected.avg_score, color: scoreColor(selected.avg_score) },
                                                        { label: "Min", value: selected.min_score, color: "#ef4444" },
                                                        { label: "Max", value: selected.max_score, color: "#10b981" },
                                                    ].map((m) => (
                                                        <div key={m.label} className="bg-white/3 rounded-lg p-2 text-center">
                                                            <div className="text-lg font-extrabold" style={{ color: m.color }}>{m.value}</div>
                                                            <div className="text-[10px] text-[var(--text-secondary)] uppercase">{m.label}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex justify-center">
                                                    <Badge variant={selected.avg_score >= 80 ? "success" : selected.avg_score >= 60 ? "warning" : "destructive"}>
                                                        {selected.avg_score >= 80 ? "⭐ Top Performer" : selected.avg_score >= 60 ? "📈 On Track" : "⚠ Needs Coaching"}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-[0.7rem]">Pillar Breakdown</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={200}>
                                                    <RadarChart data={radarData}>
                                                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                                        <PolarAngleAxis dataKey="pillar" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                                                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                                        <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
                                                        <Tooltip contentStyle={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    </>
                                ) : (
                                    <Card>
                                        <CardContent className="pt-6 text-center text-[var(--text-secondary)] text-sm">
                                            Select an agent to view details
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                        {/* At-Risk Coaching Panel */}
                        {atRisk.length > 0 && (
                            <Card className="mt-6 border-red-500/20 bg-red-500/5">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={16} className="text-red-500" />
                                        <CardTitle className="text-red-500">Coaching Required</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        {atRisk.map((agent) => (
                                            <div key={agent.user_id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/15">
                                                <div className="text-sm font-bold">{agent.name}</div>
                                                <div className="text-[0.65rem] text-[var(--text-secondary)] mt-1">
                                                    Avg Score: <span className="text-red-500 font-bold">{agent.avg_score}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
