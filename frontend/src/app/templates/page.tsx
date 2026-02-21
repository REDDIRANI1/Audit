"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { templatesApi } from "@/lib/api";
import type { ScoringTemplate } from "@/types";
import { formatDate } from "@/lib/utils";
import {
    FileText,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
} from "lucide-react";

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<ScoringTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        name: "",
        vertical: "Sales",
        system_prompt: "",
        json_schema: "{}",
    });
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const loadTemplates = () => {
        setLoading(true);
        templatesApi
            .list()
            .then((res) => setTemplates(res.data.templates))
            .catch(() => { })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        try {
            let schema = {};
            try {
                schema = JSON.parse(form.json_schema);
            } catch {
                setToast({ type: "error", message: "Invalid JSON schema" });
                setCreating(false);
                return;
            }

            await templatesApi.create({
                name: form.name,
                vertical: form.vertical,
                system_prompt: form.system_prompt,
                json_schema: schema,
            });

            setToast({ type: "success", message: "Template created successfully" });
            setShowCreate(false);
            setForm({ name: "", vertical: "Sales", system_prompt: "", json_schema: "{}" });
            loadTemplates();
        } catch (err: any) {
            setToast({
                type: "error",
                message: err.response?.data?.detail || "Failed to create template",
            });
        } finally {
            setCreating(false);
        }
    };

    // Auto-hide toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 1000 }}>
                    {/* Toast */}
                    {toast && (
                        <div
                            style={{
                                position: "fixed",
                                top: 24,
                                right: 24,
                                zIndex: 100,
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "12px 20px",
                                borderRadius: 12,
                                background:
                                    toast.type === "success"
                                        ? "rgba(16,185,129,0.12)"
                                        : "rgba(239,68,68,0.12)",
                                border: `1px solid ${toast.type === "success"
                                        ? "rgba(16,185,129,0.2)"
                                        : "rgba(239,68,68,0.2)"
                                    }`,
                                color:
                                    toast.type === "success" ? "#10b981" : "#ef4444",
                                fontSize: "0.9rem",
                                fontWeight: 500,
                            }}
                        >
                            {toast.type === "success" ? (
                                <CheckCircle2 size={16} />
                            ) : (
                                <XCircle size={16} />
                            )}
                            {toast.message}
                        </div>
                    )}

                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 32,
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
                                Scoring Templates
                            </h1>
                            <p
                                style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.9rem",
                                }}
                            >
                                Configure rubrics for call evaluation
                            </p>
                        </div>
                        <button
                            className="btn-primary"
                            onClick={() => setShowCreate(!showCreate)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <Plus size={16} /> New Template
                        </button>
                    </div>

                    {/* Create form */}
                    {showCreate && (
                        <div
                            className="glass-card animate-fade-in-up"
                            style={{ padding: 24, marginBottom: 24 }}
                        >
                            <h3
                                style={{
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    marginBottom: 20,
                                }}
                            >
                                Create Template
                            </h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 16,
                                    marginBottom: 16,
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 500,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Name
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="Sales Excellence v2"
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm({ ...form, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 500,
                                            color: "var(--text-secondary)",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Vertical
                                    </label>
                                    <select
                                        className="input-field"
                                        value={form.vertical}
                                        onChange={(e) =>
                                            setForm({ ...form, vertical: e.target.value })
                                        }
                                    >
                                        <option value="Sales">Sales</option>
                                        <option value="Support">Support</option>
                                        <option value="Collections">Collections</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.8rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)",
                                        marginBottom: 6,
                                    }}
                                >
                                    System Prompt
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    placeholder="You are an expert call quality analyst..."
                                    value={form.system_prompt}
                                    onChange={(e) =>
                                        setForm({ ...form, system_prompt: e.target.value })
                                    }
                                    style={{ resize: "vertical" }}
                                />
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.8rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)",
                                        marginBottom: 6,
                                    }}
                                >
                                    JSON Schema
                                </label>
                                <textarea
                                    className="input-field"
                                    rows={4}
                                    placeholder='{"type": "object", ...}'
                                    value={form.json_schema}
                                    onChange={(e) =>
                                        setForm({ ...form, json_schema: e.target.value })
                                    }
                                    style={{
                                        resize: "vertical",
                                        fontFamily: "monospace",
                                        fontSize: "0.85rem",
                                    }}
                                />
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleCreate}
                                    disabled={creating || !form.name || !form.system_prompt}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    {creating && (
                                        <Loader2 size={14} className="animate-spin" />
                                    )}
                                    Create Template
                                </button>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    style={{
                                        background: "var(--bg-card)",
                                        border: "1px solid var(--border-color)",
                                        color: "var(--text-secondary)",
                                        padding: "10px 20px",
                                        borderRadius: 10,
                                        cursor: "pointer",
                                        fontSize: "0.875rem",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Templates list */}
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
                    ) : templates.length === 0 ? (
                        <div
                            className="glass-card"
                            style={{
                                padding: 60,
                                textAlign: "center",
                                color: "var(--text-secondary)",
                            }}
                        >
                            <FileText
                                size={40}
                                style={{ marginBottom: 12, opacity: 0.4 }}
                            />
                            <p style={{ fontSize: "1rem" }}>No templates yet</p>
                            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>
                                Create your first rubric to start scoring calls
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                                gap: 16,
                            }}
                        >
                            {templates.map((t) => (
                                <div
                                    key={t.id}
                                    className="glass-card"
                                    style={{ padding: 20 }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                            marginBottom: 12,
                                        }}
                                    >
                                        <div>
                                            <h3
                                                style={{
                                                    fontSize: "1rem",
                                                    fontWeight: 600,
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {t.name}
                                            </h3>
                                            <span
                                                style={{
                                                    fontSize: "0.75rem",
                                                    padding: "3px 10px",
                                                    borderRadius: 6,
                                                    background: "rgba(99,102,241,0.1)",
                                                    color: "#818cf8",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {t.vertical}
                                            </span>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                color: "var(--text-secondary)",
                                                padding: "3px 8px",
                                                background: "var(--bg-secondary)",
                                                borderRadius: 4,
                                            }}
                                        >
                                            v{t.version}
                                        </span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "0.85rem",
                                            color: "var(--text-secondary)",
                                            lineHeight: 1.5,
                                            marginBottom: 12,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {t.system_prompt}
                                    </p>
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        Created {formatDate(t.created_at)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
