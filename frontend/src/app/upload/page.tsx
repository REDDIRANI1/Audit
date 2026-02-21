"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { uploadApi, templatesApi } from "@/lib/api";
import type { ScoringTemplate } from "@/types";
import {
    Upload,
    FileAudio,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
} from "lucide-react";
import { useEffect } from "react";

export default function UploadPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<ScoringTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [results, setResults] = useState<
        { name: string; status: "success" | "error"; id?: number; batchId?: string; message?: string }[]
    >([]);

    useEffect(() => {
        templatesApi
            .list()
            .then((res) => {
                setTemplates(res.data.templates);
                if (res.data.templates.length > 0) {
                    setSelectedTemplate(res.data.templates[0].id);
                }
            })
            .catch(() => { });
    }, []);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...droppedFiles]);
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (!selectedTemplate || files.length === 0) return;
        setUploading(true);
        setResults([]);

        for (const file of files) {
            try {
                const isZip = file.name.endsWith(".zip");
                const res = isZip
                    ? await uploadApi.bulk(file, selectedTemplate)
                    : await uploadApi.single(file, selectedTemplate);
                setResults((prev) => [
                    ...prev,
                    {
                        name: file.name,
                        status: "success",
                        id: isZip ? undefined : res.data.call_id,
                        batchId: isZip ? res.data.batch_id : undefined,
                    },
                ]);
            } catch (err: any) {
                setResults((prev) => [
                    ...prev,
                    {
                        name: file.name,
                        status: "error",
                        message: err.response?.data?.detail || "Upload failed",
                    },
                ]);
            }
        }

        setUploading(false);
        setFiles([]);
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                <div style={{ maxWidth: 800 }}>
                    <h1
                        style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}
                    >
                        Upload Calls
                    </h1>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "0.9rem",
                            marginBottom: 32,
                        }}
                    >
                        Upload audio files (WAV, MP3) or a ZIP of multiple calls for
                        processing
                    </p>

                    {/* Template selector */}
                    <div style={{ marginBottom: 24 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                            }}
                        >
                            Scoring Template
                        </label>
                        <select
                            className="input-field"
                            value={selectedTemplate ?? ""}
                            onChange={(e) => setSelectedTemplate(Number(e.target.value))}
                            style={{ maxWidth: 400 }}
                        >
                            <option value="" disabled>
                                Select a template...
                            </option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.vertical})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dropzone */}
                    <div
                        className={`dropzone ${dragActive ? "active" : ""}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-input")?.click()}
                        style={{ marginBottom: 24 }}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".wav,.mp3,.zip"
                            multiple
                            onChange={handleFileInput}
                            style={{ display: "none" }}
                        />
                        <Upload
                            size={40}
                            style={{
                                color: dragActive ? "var(--accent-blue)" : "var(--text-secondary)",
                                marginBottom: 16,
                            }}
                        />
                        <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 4 }}>
                            Drag & drop files here
                        </p>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                            or click to browse • WAV, MP3, ZIP
                        </p>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h3
                                style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    marginBottom: 12,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Selected Files ({files.length})
                            </h3>
                            {files.map((file, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "10px 16px",
                                        background: "var(--bg-card)",
                                        borderRadius: 10,
                                        marginBottom: 8,
                                    }}
                                >
                                    <FileAudio size={18} color="var(--accent-blue)" />
                                    <span style={{ flex: 1, fontSize: "0.9rem" }}>
                                        {file.name}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(i);
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Upload button */}
                    <button
                        className="btn-primary"
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0 || !selectedTemplate}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "12px 32px",
                        }}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                <Upload size={16} /> Upload {files.length} File
                                {files.length !== 1 ? "s" : ""}
                            </>
                        )}
                    </button>

                    {/* Results */}
                    {results.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h3
                                style={{
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    marginBottom: 12,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Upload Results
                            </h3>
                            {results.map((r, i) => (
                                <div
                                    key={i}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        padding: "10px 16px",
                                        background:
                                            r.status === "success"
                                                ? "rgba(16,185,129,0.06)"
                                                : "rgba(239,68,68,0.06)",
                                        border: `1px solid ${r.status === "success"
                                            ? "rgba(16,185,129,0.15)"
                                            : "rgba(239,68,68,0.15)"
                                            }`,
                                        borderRadius: 10,
                                        marginBottom: 8,
                                    }}
                                >
                                    {r.status === "success" ? (
                                        <CheckCircle2 size={18} color="#10b981" />
                                    ) : (
                                        <AlertCircle size={18} color="#ef4444" />
                                    )}
                                    <span style={{ flex: 1, fontSize: "0.9rem" }}>{r.name}</span>
                                    <span
                                        style={{
                                            fontSize: "0.8rem",
                                            color:
                                                r.status === "success" ? "#10b981" : "#ef4444",
                                        }}
                                    >
                                        {r.status === "success"
                                            ? r.batchId
                                                ? "Batch queued"
                                                : `Queued (ID: ${r.id})`
                                            : r.message}
                                    </span>
                                    {r.status === "success" && r.batchId && (
                                        <button
                                            onClick={() => router.push(`/calls/batch/${r.batchId}`)}
                                            style={{
                                                padding: "4px 12px", borderRadius: 8, border: "none",
                                                background: "rgba(99,102,241,0.15)", color: "#818cf8",
                                                cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                                            }}
                                        >
                                            View Progress →
                                        </button>
                                    )}
                                    {r.status === "success" && r.id && (
                                        <button
                                            onClick={() => router.push(`/calls/${r.id}`)}
                                            style={{
                                                padding: "4px 12px", borderRadius: 8, border: "none",
                                                background: "rgba(99,102,241,0.15)", color: "#818cf8",
                                                cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                                            }}
                                        >
                                            View Call →
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
