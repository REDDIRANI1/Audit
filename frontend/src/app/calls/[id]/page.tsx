"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ScoreDial from "@/components/ScoreDial";
import PipelineProgress from "@/components/PipelineProgress";
import { callsApi } from "@/lib/api";
import type { CallResult } from "@/types";
import { formatDate } from "@/lib/utils";
import {
    Loader2,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    MessageSquare,
    Shield,
    Target,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";

import Link from "next/link";

export default function CallDetailPage() {
    const params = useParams();
    const callId = Number(params.id);
    const [data, setData] = useState<CallResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"overview" | "transcript" | "compliance">(
        "overview"
    );

    const fetchData = useCallback(() => {
        callsApi
            .getResults(callId)
            .then((res) => setData(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [callId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Called when WebSocket reports pipeline complete → re-fetch results
    const handlePipelineComplete = useCallback(() => {
        setTimeout(fetchData, 1000); // small delay to let DB commit settle
    }, [fetchData]);

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

    // Show progress panel for queued / processing calls even without results
    const callStatus = data?.status ?? "queued";
    const isProcessing = callStatus === "queued" || callStatus === "processing";

    const pillarEntries = Object.entries(data?.pillar_scores || {});
    const complianceEntries = Object.entries(data?.compliance_flags || {});

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    {/* Back */}
                    <Link
                        href="/calls"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            marginBottom: 16,
                        }}
                    >
                        <ArrowLeft size={14} /> Back to Calls
                    </Link>

                    {/* Header */}
                    <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 4 }}>
                                Call #{callId}
                            </h1>
                            <span
                                className="status-badge"
                                style={{
                                    borderColor: callStatus === "completed"
                                        ? "rgba(16,185,129,0.2)"
                                        : callStatus === "failed"
                                            ? "rgba(239,68,68,0.2)"
                                            : "rgba(99,102,241,0.2)",
                                    background: callStatus === "completed"
                                        ? "rgba(16,185,129,0.08)"
                                        : callStatus === "failed"
                                            ? "rgba(239,68,68,0.08)"
                                            : "rgba(99,102,241,0.08)",
                                    color: callStatus === "completed"
                                        ? "#10b981"
                                        : callStatus === "failed"
                                            ? "#ef4444"
                                            : "#818cf8",
                                }}
                            >
                                <span
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: "50%",
                                        background: "currentColor",
                                        display: "inline-block",
                                    }}
                                />
                                {callStatus}
                            </span>
                        </div>

                        {/* Refresh button */}
                        <button
                            onClick={() => { setLoading(true); fetchData(); }}
                            title="Refresh"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "8px 14px",
                                borderRadius: 8,
                                border: "1px solid var(--border-color)",
                                background: "transparent",
                                color: "var(--text-secondary)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                            }}
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                    </div>

                    {/* Live Pipeline Progress (shown for queued / processing) */}
                    {isProcessing && (
                        <PipelineProgress
                            callId={callId}
                            initialStatus={callStatus}
                            onComplete={handlePipelineComplete}
                        />
                    )}

                    {/* No results yet */}
                    {!data && !isProcessing && (
                        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
                            <p style={{ color: "var(--text-secondary)" }}>
                                Call not found or results unavailable.
                            </p>
                            <Link href="/calls" style={{ color: "#818cf8", textDecoration: "none" }}>
                                ← Back to Calls
                            </Link>
                        </div>
                    )}

                    {/* Results */}
                    {data && data.overall_score !== undefined && (
                        <>
                            {/* Tabs */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 4,
                                    marginBottom: 24,
                                    background: "var(--bg-card)",
                                    padding: 4,
                                    borderRadius: 12,
                                    width: "fit-content",
                                }}
                            >
                                {(
                                    [
                                        { key: "overview", label: "Overview", icon: <Target size={14} /> },
                                        { key: "transcript", label: "Transcript", icon: <MessageSquare size={14} /> },
                                        { key: "compliance", label: "Compliance", icon: <Shield size={14} /> },
                                    ] as const
                                ).map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "8px 16px",
                                            borderRadius: 8,
                                            border: "none",
                                            cursor: "pointer",
                                            background:
                                                tab === t.key ? "var(--accent-blue)" : "transparent",
                                            color:
                                                tab === t.key ? "white" : "var(--text-secondary)",
                                            fontSize: "0.85rem",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {t.icon}
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Fatal flaw banner */}
                            {data.fatal_flaw && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: 12,
                                    padding: "14px 20px", borderRadius: 12, marginBottom: 20,
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                }}>
                                    <AlertTriangle size={20} color="#ef4444" />
                                    <div>
                                        <p style={{ fontWeight: 700, color: "#ef4444", fontSize: "0.95rem" }}>
                                            Fatal Flaw — Compliance Breach
                                        </p>
                                        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: 2 }}>
                                            A critical compliance pillar scored 0. RES has been set to 0 per policy.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Tab Content */}
                            {tab === "overview" && (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "auto 1fr",
                                        gap: 24,
                                    }}
                                >
                                    {/* Score dial */}
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
                                            score={data.overall_score || 0}
                                            label="Overall"
                                            sublabel="Call Quality Score"
                                            size={220}
                                        />
                                        {/* Score label badge (SES / SQS / RES) */}
                                        {data.score_label && (
                                            <span style={{
                                                marginTop: 8,
                                                display: "inline-block",
                                                padding: "4px 12px",
                                                borderRadius: 20,
                                                fontSize: "0.8rem",
                                                fontWeight: 700,
                                                letterSpacing: "0.06em",
                                                background: "rgba(99,102,241,0.12)",
                                                color: "#818cf8",
                                                border: "1px solid rgba(99,102,241,0.2)",
                                            }}>
                                                {data.score_label}
                                            </span>
                                        )}
                                        {data.score_name && (
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 4 }}>
                                                {data.score_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                        {/* Summary */}
                                        <div className="glass-card" style={{ padding: 20 }}>
                                            <h3
                                                style={{
                                                    fontSize: "0.85rem",
                                                    fontWeight: 600,
                                                    color: "var(--text-secondary)",
                                                    marginBottom: 8,
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.04em",
                                                }}
                                            >
                                                Summary
                                            </h3>
                                            <p style={{ fontSize: "0.9rem", lineHeight: 1.7 }}>
                                                {data.summary || "No summary available."}
                                            </p>
                                        </div>

                                        {/* Pillar scores */}
                                        {pillarEntries.length > 0 && (
                                            <div className="glass-card" style={{ padding: 20 }}>
                                                <h3
                                                    style={{
                                                        fontSize: "0.85rem",
                                                        fontWeight: 600,
                                                        color: "var(--text-secondary)",
                                                        marginBottom: 16,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.04em",
                                                    }}
                                                >
                                                    Pillar Scores
                                                </h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {pillarEntries.map(([key, val]) => (
                                                        <div key={key}>
                                                            <div
                                                                style={{
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    marginBottom: 6,
                                                                }}
                                                            >
                                                                <span style={{ fontSize: "0.85rem" }}>
                                                                    {key}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: "0.85rem",
                                                                        fontWeight: 600,
                                                                        color:
                                                                            val >= 80
                                                                                ? "#10b981"
                                                                                : val >= 60
                                                                                    ? "#f59e0b"
                                                                                    : "#ef4444",
                                                                    }}
                                                                >
                                                                    {val}
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
                                                                        width: `${val}%`,
                                                                        borderRadius: 3,
                                                                        background:
                                                                            val >= 80
                                                                                ? "#10b981"
                                                                                : val >= 60
                                                                                    ? "#f59e0b"
                                                                                    : "#ef4444",
                                                                        transition: "width 0.8s ease",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Recommendations */}
                                        {data.recommendations && data.recommendations.length > 0 && (
                                            <div className="glass-card" style={{ padding: 20 }}>
                                                <h3
                                                    style={{
                                                        fontSize: "0.85rem",
                                                        fontWeight: 600,
                                                        color: "var(--text-secondary)",
                                                        marginBottom: 12,
                                                        textTransform: "uppercase",
                                                        letterSpacing: "0.04em",
                                                    }}
                                                >
                                                    Recommendations
                                                </h3>
                                                <ul style={{ listStyle: "none", padding: 0 }}>
                                                    {data.recommendations.map((rec, i) => (
                                                        <li
                                                            key={i}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "flex-start",
                                                                gap: 8,
                                                                marginBottom: 8,
                                                                fontSize: "0.9rem",
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: 20,
                                                                    height: 20,
                                                                    borderRadius: 6,
                                                                    background: "rgba(99,102,241,0.1)",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: "0.7rem",
                                                                    fontWeight: 700,
                                                                    color: "#818cf8",
                                                                    flexShrink: 0,
                                                                    marginTop: 2,
                                                                }}
                                                            >
                                                                {i + 1}
                                                            </span>
                                                            {rec}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {tab === "transcript" && (
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3
                                        style={{
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 20,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        Call Transcript
                                    </h3>
                                    {data.transcript && data.transcript.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                            {data.transcript.map((seg, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: "flex",
                                                        gap: 16,
                                                        alignItems: "flex-start",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: 80,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                padding: "4px 10px",
                                                                borderRadius: 6,
                                                                fontSize: "0.75rem",
                                                                fontWeight: 600,
                                                                background:
                                                                    seg.speaker === "Agent"
                                                                        ? "rgba(99,102,241,0.1)"
                                                                        : "rgba(139,92,246,0.1)",
                                                                color:
                                                                    seg.speaker === "Agent"
                                                                        ? "#818cf8"
                                                                        : "#a78bfa",
                                                            }}
                                                        >
                                                            {seg.speaker}
                                                        </span>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
                                                            {seg.text}
                                                        </p>
                                                        <span
                                                            style={{
                                                                fontSize: "0.75rem",
                                                                color: "var(--text-secondary)",
                                                            }}
                                                        >
                                                            {seg.start.toFixed(1)}s – {seg.end.toFixed(1)}s
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: "var(--text-secondary)" }}>
                                            No transcript available yet.
                                        </p>
                                    )}
                                </div>
                            )}

                            {tab === "compliance" && (
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <h3
                                        style={{
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: 20,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                        }}
                                    >
                                        Compliance Check
                                    </h3>
                                    {complianceEntries.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                            {complianceEntries.map(([key, val]) => (
                                                <div
                                                    key={key}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 12,
                                                        padding: "12px 16px",
                                                        background: val
                                                            ? "rgba(16,185,129,0.06)"
                                                            : "rgba(239,68,68,0.06)",
                                                        border: `1px solid ${val
                                                            ? "rgba(16,185,129,0.15)"
                                                            : "rgba(239,68,68,0.15)"
                                                            }`,
                                                        borderRadius: 10,
                                                    }}
                                                >
                                                    {val ? (
                                                        <CheckCircle2 size={18} color="#10b981" />
                                                    ) : (
                                                        <XCircle size={18} color="#ef4444" />
                                                    )}
                                                    <span style={{ fontSize: "0.9rem", flex: 1 }}>
                                                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: "0.8rem",
                                                            fontWeight: 600,
                                                            color: val ? "#10b981" : "#ef4444",
                                                        }}
                                                    >
                                                        {val ? "Pass" : "Fail"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ color: "var(--text-secondary)" }}>
                                            No compliance data available.
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
