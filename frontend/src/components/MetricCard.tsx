"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
    label: string;
    value: string | number;
    change?: number;
    trend?: "up" | "down" | "flat";
    icon?: React.ReactNode;
    accentColor?: string;
}

export default function MetricCard({
    label,
    value,
    change,
    trend,
    icon,
    accentColor = "#6366f1",
}: MetricCardProps) {
    const trendIcon =
        trend === "up" ? (
            <TrendingUp size={14} color="#10b981" />
        ) : trend === "down" ? (
            <TrendingDown size={14} color="#ef4444" />
        ) : (
            <Minus size={14} color="var(--text-secondary)" />
        );

    return (
        <div className="metric-card">
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                }}
            >
                <span
                    style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                    }}
                >
                    {label}
                </span>
                {icon && (
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: `${accentColor}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {icon}
                    </div>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>
                    {value}
                </span>
                {change !== undefined && (
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: "0.8rem",
                            color:
                                trend === "up"
                                    ? "#10b981"
                                    : trend === "down"
                                        ? "#ef4444"
                                        : "var(--text-secondary)",
                        }}
                    >
                        {trendIcon}
                        {change > 0 ? "+" : ""}
                        {change}%
                    </span>
                )}
            </div>
        </div>
    );
}
