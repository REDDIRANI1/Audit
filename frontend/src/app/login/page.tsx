"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Lock, Mail, User, ArrowLeft, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        email: "",
        password: "",
        full_name: "",
        role: "agent",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = isLogin
                ? await authApi.login(form.email, form.password)
                : await authApi.register(form);

            const { access_token, user } = res.data;
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("user", JSON.stringify(user));

            const role = user.role.toLowerCase();
            router.push(`/dashboard/${role}`);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(ellipse at top, rgba(99,102,241,0.08) 0%, transparent 50%), var(--bg-primary)",
                padding: 24,
            }}
        >
            <div
                className="glass-card animate-fade-in-up"
                style={{ width: "100%", maxWidth: 440, padding: 40 }}
            >
                {/* Back link */}
                <button
                    onClick={() => router.push("/")}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-secondary)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        marginBottom: 32,
                    }}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <h1
                        style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}
                    >
                        <span className="gradient-text">Audit AI</span>
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        {isLogin ? "Sign in to your account" : "Create a new account"}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: 10,
                            padding: "10px 16px",
                            color: "#f87171",
                            fontSize: "0.85rem",
                            marginBottom: 20,
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    {!isLogin && (
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
                                Full Name
                            </label>
                            <div style={{ position: "relative" }}>
                                <User
                                    size={16}
                                    style={{
                                        position: "absolute",
                                        left: 14,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        color: "var(--text-secondary)",
                                    }}
                                />
                                <input
                                    className="input-field"
                                    type="text"
                                    placeholder="John Doe"
                                    value={form.full_name}
                                    onChange={(e) =>
                                        setForm({ ...form, full_name: e.target.value })
                                    }
                                    required={!isLogin}
                                    style={{ paddingLeft: 40 }}
                                />
                            </div>
                        </div>
                    )}

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
                            Email
                        </label>
                        <div style={{ position: "relative" }}>
                            <Mail
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 14,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-secondary)",
                                }}
                            />
                            <input
                                className="input-field"
                                type="email"
                                placeholder="you@company.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                required
                                style={{ paddingLeft: 40 }}
                            />
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
                            Password
                        </label>
                        <div style={{ position: "relative" }}>
                            <Lock
                                size={16}
                                style={{
                                    position: "absolute",
                                    left: 14,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--text-secondary)",
                                }}
                            />
                            <input
                                className="input-field"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) =>
                                    setForm({ ...form, password: e.target.value })
                                }
                                required
                                style={{ paddingLeft: 40 }}
                            />
                        </div>
                    </div>

                    {!isLogin && (
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
                                Role
                            </label>
                            <select
                                className="input-field"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="agent">Agent</option>
                                <option value="manager">Manager</option>
                                <option value="cxo">CXO</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{
                            width: "100%",
                            marginTop: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "12px 24px",
                        }}
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {isLogin ? "Sign In" : "Create Account"}
                    </button>
                </form>

                {/* Toggle */}
                <p
                    style={{
                        textAlign: "center",
                        marginTop: 24,
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                    }}
                >
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#818cf8",
                            cursor: "pointer",
                            fontWeight: 600,
                        }}
                    >
                        {isLogin ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}
