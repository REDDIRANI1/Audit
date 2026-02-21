"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck, Download, AlertCircle, Lock,
    ChevronRight, CheckCircle2, FileText
} from "lucide-react";

interface ComplianceStats {
    total_calls: number;
    dtmf_detections: number;
    redacted_seconds: number;
    compliance_rate: number;
    pii_redactions: number;
}

export default function ComplianceDashboard() {
    const [stats, setStats] = useState<ComplianceStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        // Mock fetch for now
        setTimeout(() => {
            setStats({
                total_calls: 1240,
                dtmf_detections: 142,
                redacted_seconds: 284.5,
                compliance_rate: 100.0,
                pii_redactions: 892
            });
            setLoading(false);
        }, 800);
    }, []);

    const handleDownload = async () => {
        setDownloading(true);
        // In real app: window.location.href = "/api/v1/compliance/download-report";
        setTimeout(() => {
            setDownloading(false);
            alert("PCI Compliance Attestation PDF generated successfully.");
        }, 1500);
    };

    return (
        <div style={{ display: "flex" }}>
            <Sidebar />
            <main className="main-with-sidebar">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">PCI Compliance</h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            Verify data redaction and security posture
                        </p>
                    </div>
                    <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                        {downloading ? "Generating..." : "Download Attestation"}
                        <Download size={16} />
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center pt-20">
                        <div className="animate-spin w-8 h-8 border-3 border-[var(--border-color)] border-t-[var(--accent-blue)] rounded-full" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="border-emerald-500/20 bg-emerald-500/5">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-emerald-500">Compliance Status</CardTitle>
                                        <ShieldCheck className="text-emerald-500" size={18} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-extrabold text-emerald-500">
                                        {stats?.compliance_rate}%
                                    </div>
                                    <p className="text-xs text-emerald-500/70 mt-1">PCI DSS v4.0 Compliant</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>DTMF Redactions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-extrabold">{stats?.dtmf_detections}</div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Tones muted in audio</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle>PII Entities Masked</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-extrabold">{stats?.pii_redactions}</div>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Sensitive data removed</p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Security Controls */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Active Security Controls</CardTitle>
                                    <CardDescription>Verified safeguards currently active in the pipeline</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { label: "DTMF Goertzel Filter", desc: "Mutes keypad entry in audio", status: "Active" },
                                        { label: "Regex PII Masking", desc: "Redacts SSN, CC, and DOB in text", status: "Active" },
                                        { label: "At-Rest Encryption", desc: "AES-256 Fernet for database scores", status: "Active" },
                                        { label: "TLS Interaction", desc: "Secure audio stream ingestion", status: "Active" },
                                    ].map((control) => (
                                        <div key={control.label} className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)] bg-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold">{control.label}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{control.desc}</div>
                                                </div>
                                            </div>
                                            <Badge variant="success">{control.status}</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Recent Redaction Log */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Audit Log</CardTitle>
                                    <CardDescription>Recent automated redaction events</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        {[
                                            { id: "C-9281", type: "DTMF", timestamp: "12 mins ago", detail: "4 segments muted" },
                                            { id: "C-9280", type: "PII", timestamp: "45 mins ago", detail: "Email & Card # redacted" },
                                            { id: "C-9278", type: "DTMF", timestamp: "2 hours ago", detail: "1 segment muted" },
                                            { id: "C-9277", type: "PII", timestamp: "5 hours ago", detail: "DOB masked" },
                                        ].map((log) => (
                                            <div key={log.id} className="flex items-center justify-between py-3 px-1 border-b border-[var(--border-color)] last:border-0">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs font-mono text-[var(--accent-blue)]">{log.id}</div>
                                                    <div>
                                                        <div className="text-sm font-medium">{log.type} Redaction</div>
                                                        <div className="text-xs text-[var(--text-secondary)]">{log.detail}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-[var(--text-secondary)]">{log.timestamp}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="ghost" className="w-full mt-4 text-xs gap-2">
                                        View Full Audit Log <ChevronRight size={14} />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
