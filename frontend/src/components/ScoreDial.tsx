"use client";

import { useEffect, useRef } from "react";

interface ScoreDialProps {
    score: number;
    maxScore?: number;
    size?: number;
    label?: string;
    sublabel?: string;
}

export default function ScoreDial({
    score,
    maxScore = 100,
    size = 180,
    label = "Score",
    sublabel,
}: ScoreDialProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const percentage = Math.min(score / maxScore, 1);

    const getColor = (pct: number) => {
        if (pct >= 0.8) return "#10b981";
        if (pct >= 0.6) return "#f59e0b";
        return "#ef4444";
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = (size - 24) / 2;
        const lineWidth = 10;
        const startAngle = 0.75 * Math.PI;
        const endAngle = 2.25 * Math.PI;
        const totalArc = endAngle - startAngle;

        // Clear
        ctx.clearRect(0, 0, size, size);

        // Background arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.strokeStyle = "#2a2a3a";
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.stroke();

        // Animated progress arc
        const color = getColor(percentage);
        const progressEnd = startAngle + totalArc * percentage;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, startAngle, progressEnd);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Score text
        ctx.fillStyle = "#f0f0f5";
        ctx.font = `700 ${size * 0.22}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(score.toFixed(1), centerX, centerY - 6);

        // Label
        ctx.fillStyle = "#a0a0b8";
        ctx.font = `500 ${size * 0.08}px Inter, sans-serif`;
        ctx.fillText(label, centerX, centerY + size * 0.14);
    }, [score, maxScore, size, label, percentage]);

    return (
        <div style={{ textAlign: "center" }}>
            <canvas
                ref={canvasRef}
                style={{ width: size, height: size }}
            />
            {sublabel && (
                <p
                    style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        marginTop: -8,
                    }}
                >
                    {sublabel}
                </p>
            )}
        </div>
    );
}
