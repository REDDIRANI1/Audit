"use client";

import React from "react";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface SkillData {
    subject: string;
    A: number; // Team average
    fullMark: number;
}

interface TeamSkillMatrixProps {
    data: SkillData[];
}

export default function TeamSkillMatrix({ data }: TeamSkillMatrixProps) {
    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 20, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Team Skill Matrix
            </h3>
            <div style={{ width: "100%", height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                            stroke="rgba(255,255,255,0.1)"
                        />
                        <Radar
                            name="Team Avg"
                            dataKey="A"
                            stroke="#818cf8"
                            fill="#818cf8"
                            fillOpacity={0.4}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "rgba(17, 24, 39, 0.9)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "0.8rem",
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: 16, textAlign: "center", fontStyle: "italic" }}>
                Comparison of average scores across all audit pillars for the current department.
            </p>
        </div>
    );
}
