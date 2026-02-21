"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Headphones,
  BarChart3,
  Zap,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect if already logged in
    const token = localStorage.getItem("access_token");
    if (token) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const role = user.role?.toLowerCase() || "agent";
      router.push(`/dashboard/${role}`);
    }
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at top, rgba(99,102,241,0.08) 0%, transparent 50%), var(--bg-primary)",
        padding: "24px",
      }}
    >
      {/* Hero */}
      <div
        style={{ textAlign: "center", maxWidth: 700, marginBottom: 64 }}
        className="animate-fade-in-up"
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: 9999,
            padding: "6px 16px",
            fontSize: "0.8rem",
            color: "#818cf8",
            marginBottom: 24,
          }}
        >
          <Zap size={14} />
          AI-Powered Call Intelligence
        </div>
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          Turn Every Call Into{" "}
          <span className="gradient-text">Actionable Insight</span>
        </h1>
        <p
          style={{
            fontSize: "1.15rem",
            color: "var(--text-secondary)",
            lineHeight: 1.7,
            marginBottom: 36,
          }}
        >
          Audit AI auto-scores your calls using on-prem ML models. Compliance,
          quality, and coaching — fully automated, fully private.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            className="btn-primary"
            onClick={() => router.push("/login")}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", padding: "14px 32px" }}
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 24,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {[
          {
            icon: <Shield size={28} color="#6366f1" />,
            title: "Privacy-First",
            desc: "All ML inference runs on-prem. No audio ever leaves your infrastructure.",
          },
          {
            icon: <Headphones size={28} color="#8b5cf6" />,
            title: "Multi-Vertical",
            desc: "Sales, Support, and Collections scoring with custom rubrics and weighted pillars.",
          },
          {
            icon: <BarChart3 size={28} color="#10b981" />,
            title: "Real-Time Dashboards",
            desc: "Agent, Manager, and CXO views with live scoring, coaching hints, and risk alerts.",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="glass-card animate-fade-in-up"
            style={{
              padding: 28,
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(99,102,241,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              {feature.icon}
            </div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {feature.title}
            </h3>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
