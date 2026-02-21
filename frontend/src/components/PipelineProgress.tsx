/**
 * PipelineProgress component
 *
 * Shows real-time pipeline stage progress for a call being processed.
 * Connects via WebSocket to /ws/call/{callId}.
 */
"use client";

import { useEffect, useState } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { CheckCircle2, Circle, Loader2, XCircle, Zap } from "lucide-react";

interface Stage {
    stage: string;
    label: string;
    status: "pending" | "running" | "completed" | "failed";
    error?: string | null;
}

interface PipelineProgressProps {
    callId: number;
    initialStatus: string;
    onComplete?: () => void;
}

export default function PipelineProgress({
    callId,
    initialStatus,
    onComplete,
}: PipelineProgressProps) {
    const [stages, setStages] = useState<Stage[]>([]);
    const [progressPct, setProgressPct] = useState(0);
    const [callStatus, setCallStatus] = useState(initialStatus);
    const [done, setDone] = useState(
        initialStatus === "completed" || initialStatus === "failed"
    );

    const { connected } = useWebSocket(`/ws/call/${callId}`, {
        enabled: !done,
        onMessage: (msg) => {
            if (
                msg.type === "pipeline_progress" ||
                msg.type === "pipeline_complete"
            ) {
                setStages((msg.stages as Stage[]) ?? []);
                setProgressPct((msg.progress_pct as number) ?? 0);
                setCallStatus(msg.call_status as string);

                if (msg.type === "pipeline_complete") {
                    setDone(true);
                    onComplete?.();
                }
            }
        },
    });

    // If already completed before we mount, show full bar
    useEffect(() => {
        if (done && stages.length === 0) {
            setProgressPct(100);
        }
    }, [done, stages.length]);

    if (done && initialStatus === "completed" && stages.length === 0) {
        return null; // Don't show for already-complete calls without stage data
    }

    const stageColor = (status: Stage["status"]) => {
        if (status === "completed") return "#10b981";
        if (status === "running") return "#6366f1";
        if (status === "failed") return "#ef4444";
        return "var(--text-secondary)";
    };

    const StageIcon = ({ status }: { status: Stage["status"] }) => {
        if (status === "completed") return <CheckCircle2 size={16} color="#10b981" />;
        if (status === "running") return <Loader2 size={16} color="#6366f1" className="animate-spin" />;
        if (status === "failed") return <XCircle size={16} color="#ef4444" />;
        return <Circle size={16} color="var(--text-secondary)" />;
    };

    return (
        <div
            className="glass-card"
            style={{ padding: 24, marginBottom: 24 }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                <Zap size={18} color="#6366f1" />
                <h3
                    style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    Pipeline Progress
                </h3>
                {!done && (
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: "0.75rem",
                            color: connected ? "#10b981" : "var(--text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                        }}
                    >
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: connected ? "#10b981" : "#6b7280",
                                display: "inline-block",
                            }}
                        />
                        {connected ? "Live" : "Connecting…"}
                    </span>
                )}
                {done && (
                    <span
                        style={{
                            marginLeft: "auto",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                            color: callStatus === "completed" ? "#10b981" : "#ef4444",
                        }}
                    >
                        {callStatus === "completed" ? "✓ Complete" : "✗ Failed"}
                    </span>
                )}
            </div>

            {/* Overall progress bar */}
            <div
                style={{
                    height: 6,
                    background: "var(--border-color)",
                    borderRadius: 3,
                    marginBottom: 20,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: `${progressPct}%`,
                        background:
                            callStatus === "failed"
                                ? "#ef4444"
                                : "linear-gradient(90deg, #6366f1, #8b5cf6)",
                        borderRadius: 3,
                        transition: "width 0.5s ease",
                    }}
                />
            </div>

            {/* Stage rows */}
            {stages.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {stages.map((s) => (
                        <div
                            key={s.stage}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontSize: "0.875rem",
                            }}
                        >
                            <StageIcon status={s.status} />
                            <span
                                style={{
                                    flex: 1,
                                    color:
                                        s.status === "pending"
                                            ? "var(--text-secondary)"
                                            : "var(--text-primary)",
                                }}
                            >
                                {s.label}
                            </span>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: stageColor(s.status),
                                    textTransform: "capitalize",
                                }}
                            >
                                {s.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {stages.length === 0 && !done && (
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "center" }}>
                    Waiting for pipeline to start…
                </p>
            )}
        </div>
    );
}
