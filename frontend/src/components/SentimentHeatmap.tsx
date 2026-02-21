"use client";

import React from "react";

interface HeatmapData {
    hour: number;
    day: string;
    value: number; // 0 to 1
}

interface SentimentHeatmapProps {
    data: HeatmapData[];
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SentimentHeatmap({ data }: SentimentHeatmapProps) {
    // Helper to get color based on sentiment value (0=Red, 0.5=Yellow, 1=Green)
    const getColor = (value: number) => {
        if (value === 0) return "rgba(239, 68, 68, 0.1)"; // Empty/N/A
        if (value < 0.3) return "rgba(239, 68, 68, 0.8)"; // Negative
        if (value < 0.6) return "rgba(245, 158, 11, 0.8)"; // Neutral
        return "rgba(16, 185, 129, 0.8)"; // Positive
    };

    return (
        <div className="glass-card" style={{ padding: 24, overflowX: "auto" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Sentiment Heatmap
            </h3>
            <div style={{ minWidth: 600 }}>
                {/* Header: Hours */}
                <div style={{ display: "flex", marginLeft: 40, marginBottom: 8 }}>
                    {HOURS.filter(h => h % 2 === 0).map(h => (
                        <div key={h} style={{ flex: 1, fontSize: "0.7rem", color: "var(--text-secondary)", textAlign: "center" }}>
                            {h}h
                        </div>
                    ))}
                </div>

                {/* Grid */}
                {DAYS.map(day => (
                    <div key={day} style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ width: 40, fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                            {day}
                        </div>
                        <div style={{ display: "flex", flex: 1, gap: 4 }}>
                            {HOURS.map(hour => {
                                const entry = data.find(d => d.day === day && d.hour === hour);
                                const val = entry ? entry.value : 0;
                                return (
                                    <div
                                        key={hour}
                                        title={`${day} ${hour}:00 - Sentiment: ${(val * 100).toFixed(0)}%`}
                                        style={{
                                            flex: 1,
                                            height: 24,
                                            borderRadius: 4,
                                            background: getColor(val),
                                            transition: "transform 0.2s",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Legend */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(239, 68, 68, 0.8)" }} />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Negative</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(245, 158, 11, 0.8)" }} />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Neutral</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(16, 185, 129, 0.8)" }} />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Positive</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
