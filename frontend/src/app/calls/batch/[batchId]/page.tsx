"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ScoreDial from "@/components/ScoreDial";
import { callsApi } from "@/lib/api";
import type { Call } from "@/types";
import { formatDate } from "@/lib/utils";
import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Clock,
    FileAudio,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface BatchCall extends Call {
    overall_score?: number;
    score_label?: string;
}

async function fetchBatchCalls(batchId: string, token: string): Promise<BatchCall[]> {
    // Get all calls in the batch
    const res = await fetch(`${API}/api/calls?batch_id=${encodeURIComponent(batchId)}&per_page=100`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const calls: Call[] = data.calls ?? [];

    // For completed calls, get their score
    const enriched = await Promise.all(
        calls.map(async (call) => {
            if (call.status === "completed") {
                try {
                    const r = await fetch(`${API}/api/calls/${call.id}/results`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (r.ok) {
                        const result = await r.json();
                        return { ...call, overall_score: result.overall_score, score_label: result.score_label };
                    }
                } catch { /* no evaluation yet */ }
            }
            return call;
        })
    );
    return enriched;
}

const STATUS_COLOR: Record<string, string> = {
    completed: "#10b981",
    failed: "#ef4444",
    processing: "#818cf8",
    queued: "#f59e0b",
};

const STATUS_BG: Record<string, string> = {
    completed: "rgba(16,185,129,0.08)",
    failed: "rgba(239,68,68,0.08)",
    processing: "rgba(99,102,241,0.08)",
    queued: "rgba(245,158,11,0.08)",
};

function StatusIcon({ status }: { status: string }) {
    if (status === "completed") return <CheckCircle2 size={16} color="#10b981" />;
    if (status === "failed") return <XCircle size={16} color="#ef4444" />;
    if (status === "processing") return <Loader2 size={16} color="#818cf8" className="animate-spin" />;
    return <Clock size={16} color="#f59e0b" />;
}

export default function BatchPage() {
    const params = useParams();
    const batchId = params.batchId as string;
    const [calls, setCalls] = useState<BatchCall[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const token = localStorage.getItem("access_token") ?? "";
        const data = await fetchBatchCalls(batchId, token);
        setCalls(data);
        setLoading(false);
    }, [batchId]);

    useEffect(() => {
        load();
    }, [load]);

    // Auto-refresh while any call is still in progress
    useEffect(() => {
        const hasActive = calls.some(c => c.status === "queued" || c.status === "processing");
        if (!hasActive) return;
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, [calls, load]);

    const total = calls.length;
    const completed = calls.filter(c => c.status === "completed").length;
    const failed = calls.filter(c => c.status === "failed").length;
    const inProgress = total - completed - failed;
    const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgScore = calls
        .filter(c => c.overall_score !== undefined)
        .reduce((sum, c, _, arr) => sum + (c.overall_score ?? 0) / arr.length, 0);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1000 }}>
                    {/* Back */}
                    <Link
                        href="/calls"
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            color: "var(--text-secondary)", textDecoration: "none",
                            fontSize: "0.85rem", marginBottom: 16,
                        }}
                    >
                        <ArrowLeft size={14} /> Back to Calls
                    </Link>

                    {/* Header */}
                    <div style={{ marginBottom: 24 }}>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
                            Batch Upload
                        </h1>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                            {batchId}
                        </p>
                    </div>

                    {loading ? (
                        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent-blue)" }} />
                        </div>
                    ) : (
                        <>
                            {/* Summary cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                                {[
                                    { label: "Total Files", value: total, color: "#818cf8" },
                                    { label: "Completed", value: completed, color: "#10b981" },
                                    { label: "Failed", value: failed, color: "#ef4444" },
                                    { label: "Avg Score", value: completed > 0 ? avgScore.toFixed(1) : "—", color: "#f59e0b" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="glass-card" style={{ padding: 20, textAlign: "center" }}>
                                        <p style={{ fontSize: "1.8rem", fontWeight: 700, color }}>{value}</p>
                                        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Progress bar */}
                            <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Processing Progress</span>
                                    <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                        {completed}/{total} completed
                                        {inProgress > 0 && ` · ${inProgress} in progress`}
                                    </span>
                                </div>
                                <div style={{ height: 8, borderRadius: 4, background: "var(--border-color)", overflow: "hidden" }}>
                                    <div
                                        style={{
                                            height: "100%", borderRadius: 4, transition: "width 0.6s ease",
                                            width: `${progressPct}%`,
                                            background: failed > 0
                                                ? "linear-gradient(90deg, #10b981, #ef4444)"
                                                : "linear-gradient(90deg, #6366f1, #10b981)",
                                        }}
                                    />
                                </div>
                                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 8 }}>
                                    {progressPct}% · {inProgress > 0 ? "Auto-refreshing every 5 s…" : "All calls processed."}
                                </p>
                            </div>

                            {/* Per-call table */}
                            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                                            {["Call ID", "File", "Status", "Score", "Processed At", ""].map(h => (
                                                <th key={h} style={{
                                                    padding: "12px 16px", textAlign: "left",
                                                    fontSize: "0.75rem", fontWeight: 600,
                                                    color: "var(--text-secondary)",
                                                    textTransform: "uppercase", letterSpacing: "0.04em",
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calls.map((call, i) => (
                                            <tr
                                                key={call.id}
                                                style={{
                                                    borderBottom: i < calls.length - 1 ? "1px solid var(--border-color)" : "none",
                                                    transition: "background 0.15s",
                                                }}
                                            >
                                                <td style={{ padding: "14px 16px", fontWeight: 600 }}>#{call.id}</td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <FileAudio size={14} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                                                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                                                            {call.s3_path.split("/").pop()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <span style={{
                                                        display: "inline-flex", alignItems: "center", gap: 6,
                                                        padding: "4px 10px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 500,
                                                        background: STATUS_BG[call.status] ?? "transparent",
                                                        color: STATUS_COLOR[call.status] ?? "var(--text-secondary)",
                                                    }}>
                                                        <StatusIcon status={call.status} />
                                                        {call.status}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    {call.overall_score !== undefined ? (
                                                        <span style={{ fontWeight: 600, color: call.overall_score >= 80 ? "#10b981" : call.overall_score >= 60 ? "#f59e0b" : "#ef4444" }}>
                                                            {call.overall_score.toFixed(1)}
                                                            {call.score_label && (
                                                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: 4 }}>
                                                                    {call.score_label}
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>—</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                                    {call.processed_at ? formatDate(call.processed_at) : "—"}
                                                </td>
                                                <td style={{ padding: "14px 16px" }}>
                                                    <Link
                                                        href={`/calls/${call.id}`}
                                                        style={{
                                                            fontSize: "0.8rem", color: "#818cf8",
                                                            textDecoration: "none", fontWeight: 500,
                                                        }}
                                                    >
                                                        View →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
