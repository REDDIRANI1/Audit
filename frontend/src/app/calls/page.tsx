"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { callsApi } from "@/lib/api";
import type { Call } from "@/types";
import { formatDate, getStatusBgColor } from "@/lib/utils";
import {
    FileAudio,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
} from "lucide-react";
import Link from "next/link";

export default function CallsPage() {
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState<string>("");
    const perPage = 20;

    useEffect(() => {
        setLoading(true);
        callsApi
            .list(page, perPage, statusFilter || undefined)
            .then((res) => {
                setCalls(res.data.calls);
                setTotal(res.data.total);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [page, statusFilter]);

    const totalPages = Math.ceil(total / perPage);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1200 }}>
                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 24,
                        }}
                    >
                        <div>
                            <h1
                                style={{
                                    fontSize: "1.75rem",
                                    fontWeight: 700,
                                    marginBottom: 4,
                                }}
                            >
                                Calls
                            </h1>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                {total} total calls
                            </p>
                        </div>
                        <Link
                            href="/upload"
                            className="btn-primary"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                textDecoration: "none",
                                padding: "10px 20px",
                            }}
                        >
                            <FileAudio size={16} /> Upload New
                        </Link>
                    </div>

                    {/* Filters */}
                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <Filter size={16} color="var(--text-secondary)" />
                            {["", "queued", "processing", "completed", "failed"].map(
                                (status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setStatusFilter(status);
                                            setPage(1);
                                        }}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            border: "1px solid",
                                            borderColor:
                                                statusFilter === status
                                                    ? "var(--accent-blue)"
                                                    : "var(--border-color)",
                                            background:
                                                statusFilter === status
                                                    ? "rgba(99,102,241,0.1)"
                                                    : "transparent",
                                            color:
                                                statusFilter === status
                                                    ? "#818cf8"
                                                    : "var(--text-secondary)",
                                            fontSize: "0.8rem",
                                            cursor: "pointer",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {status || "All"}
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
                        {loading ? (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    padding: 60,
                                }}
                            >
                                <Loader2
                                    size={28}
                                    className="animate-spin"
                                    style={{ color: "var(--accent-blue)" }}
                                />
                            </div>
                        ) : calls.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: 60,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                <FileAudio
                                    size={40}
                                    style={{ marginBottom: 12, opacity: 0.4 }}
                                />
                                <p style={{ fontSize: "1rem" }}>No calls found</p>
                                <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
                                    Upload a call to get started
                                </p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Call ID</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Duration</th>
                                        <th>Score</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {calls.map((call) => (
                                        <tr key={call.id}>
                                            <td>
                                                <span style={{ fontWeight: 600 }}>
                                                    #{call.id}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="status-badge"
                                                    style={{
                                                        borderColor:
                                                            call.status === "completed"
                                                                ? "rgba(16,185,129,0.2)"
                                                                : call.status === "processing"
                                                                    ? "rgba(245,158,11,0.2)"
                                                                    : call.status === "failed"
                                                                        ? "rgba(239,68,68,0.2)"
                                                                        : "rgba(99,102,241,0.2)",
                                                        background:
                                                            call.status === "completed"
                                                                ? "rgba(16,185,129,0.08)"
                                                                : call.status === "processing"
                                                                    ? "rgba(245,158,11,0.08)"
                                                                    : call.status === "failed"
                                                                        ? "rgba(239,68,68,0.08)"
                                                                        : "rgba(99,102,241,0.08)",
                                                        color:
                                                            call.status === "completed"
                                                                ? "#10b981"
                                                                : call.status === "processing"
                                                                    ? "#f59e0b"
                                                                    : call.status === "failed"
                                                                        ? "#ef4444"
                                                                        : "#6366f1",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: "50%",
                                                            display: "inline-block",
                                                            background: "currentColor",
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
                                                    ? `${Math.floor(call.duration_seconds / 60)}:${String(
                                                        call.duration_seconds % 60
                                                    ).padStart(2, "0")}`
                                                    : "—"}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {call.status === "completed" ? "—" : "—"}
                                            </td>
                                            <td>
                                                <Link
                                                    href={`/calls/${call.id}`}
                                                    style={{
                                                        color: "#818cf8",
                                                        textDecoration: "none",
                                                        fontSize: "0.85rem",
                                                        fontWeight: 500,
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

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 16,
                                marginTop: 24,
                            }}
                        >
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    cursor: page === 1 ? "not-allowed" : "pointer",
                                    opacity: page === 1 ? 0.5 : 1,
                                    color: "var(--text-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <span
                                style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                style={{
                                    background: "var(--bg-card)",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: 8,
                                    padding: "8px 12px",
                                    cursor: page === totalPages ? "not-allowed" : "pointer",
                                    opacity: page === totalPages ? 0.5 : 1,
                                    color: "var(--text-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
