"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Smartphone, Copy, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Request failed");
    }
    return res.json();
}

type MfaStatus = { mfa_enabled: boolean; enrolled: boolean };

export default function MfaSettingsPage() {
    const [status, setStatus] = useState<MfaStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [enrollData, setEnrollData] = useState<{ secret: string; provisioning_uri: string } | null>(null);
    const [code, setCode] = useState("");
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [working, setWorking] = useState(false);
    const [copied, setCopied] = useState(false);

    // Load QR code library lazily
    const [QR, setQR] = useState<React.ComponentType<{ value: string; size: number }> | null>(null);
    useEffect(() => {
        import("react-qr-code").then((m) => setQR(() => m.default as any));
    }, []);

    const loadStatus = async () => {
        try {
            const data = await apiFetch("/api/auth/mfa/status");
            setStatus(data);
        } catch {
            setStatus({ mfa_enabled: false, enrolled: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStatus(); }, []);

    const copySecret = () => {
        if (enrollData?.secret) {
            navigator.clipboard.writeText(enrollData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleEnroll = async () => {
        setWorking(true);
        setMessage(null);
        try {
            const data = await apiFetch("/api/auth/mfa/enroll", { method: "POST" });
            setEnrollData(data);
        } catch (e: any) {
            setMessage({ text: e.message, type: "error" });
        } finally {
            setWorking(false);
        }
    };

    const handleActivate = async () => {
        if (code.length !== 6) return;
        setWorking(true);
        setMessage(null);
        try {
            await apiFetch("/api/auth/mfa/activate", { method: "POST", body: JSON.stringify({ code }) });
            setMessage({ text: "MFA enabled successfully! Your account is now protected.", type: "success" });
            setEnrollData(null);
            setCode("");
            await loadStatus();
        } catch (e: any) {
            setMessage({ text: e.message, type: "error" });
        } finally {
            setWorking(false);
        }
    };

    const handleDisable = async () => {
        if (code.length !== 6) return;
        setWorking(true);
        setMessage(null);
        try {
            await apiFetch("/api/auth/mfa/disable", { method: "POST", body: JSON.stringify({ code }) });
            setMessage({ text: "MFA disabled.", type: "success" });
            setCode("");
            await loadStatus();
        } catch (e: any) {
            setMessage({ text: e.message, type: "error" });
        } finally {
            setWorking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto py-10 px-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-indigo-500/10">
                    <ShieldCheck size={28} className="text-indigo-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Two-Factor Authentication</h1>
                    <p className="text-sm text-slate-400">Add an extra layer of security to your account.</p>
                </div>
            </div>

            {/* Status card */}
            <div className={`rounded-2xl border px-5 py-4 mb-6 flex items-center gap-3 ${status?.mfa_enabled
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
                }`}>
                {status?.mfa_enabled ? (
                    <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                ) : (
                    <AlertTriangle size={20} className="text-amber-400 shrink-0" />
                )}
                <p className={`text-sm font-medium ${status?.mfa_enabled ? "text-emerald-300" : "text-amber-300"}`}>
                    {status?.mfa_enabled
                        ? "MFA is enabled — your account is protected with TOTP."
                        : "MFA is not enabled. We recommend enabling it to secure your account."}
                </p>
            </div>

            {/* Feedback message */}
            {message && (
                <div className={`rounded-xl px-4 py-3 mb-5 text-sm ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Enroll flow */}
            {!status?.mfa_enabled && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">Enable MFA</h2>
                    <p className="text-sm text-slate-400 mb-5">
                        Use Google Authenticator, Authy, or any TOTP app.
                    </p>

                    {!enrollData ? (
                        <button
                            onClick={handleEnroll}
                            disabled={working}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50"
                        >
                            {working ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
                            Generate QR Code
                        </button>
                    ) : (
                        <div className="space-y-5">
                            {/* QR code */}
                            <div className="flex flex-col items-center gap-4 bg-white rounded-xl p-5">
                                {QR ? (
                                    <QR value={enrollData.provisioning_uri} size={180} />
                                ) : (
                                    <div className="w-[180px] h-[180px] bg-slate-200 animate-pulse rounded" />
                                )}
                                <p className="text-xs text-slate-600 text-center">
                                    Scan with your authenticator app
                                </p>
                            </div>

                            {/* Manual entry */}
                            <div className="bg-slate-700/50 rounded-xl px-4 py-3">
                                <p className="text-xs text-slate-400 mb-1">Or enter this secret manually:</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-sm font-mono text-indigo-300 break-all">{enrollData.secret}</code>
                                    <button onClick={copySecret} className="shrink-0">
                                        {copied ? (
                                            <CheckCircle size={16} className="text-emerald-400" />
                                        ) : (
                                            <Copy size={16} className="text-slate-400 hover:text-white transition" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm code */}
                            <div>
                                <label className="text-sm text-slate-300 mb-2 block">
                                    Enter the 6-digit code from your app to confirm:
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <button
                                onClick={handleActivate}
                                disabled={working || code.length !== 6}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition disabled:opacity-50"
                            >
                                {working ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Activate MFA
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Disable flow */}
            {status?.mfa_enabled && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-1">Disable MFA</h2>
                    <p className="text-sm text-slate-400 mb-5">
                        Enter your current TOTP code to disable two-factor authentication.
                    </p>
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-indigo-500 mb-4"
                    />
                    <button
                        onClick={handleDisable}
                        disabled={working || code.length !== 6}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition disabled:opacity-50"
                    >
                        {working ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                        Disable MFA
                    </button>
                </div>
            )}
        </div>
    );
}
