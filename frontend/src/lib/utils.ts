import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatScore(score: number | undefined | null): string {
    if (score === undefined || score === null) return "—";
    return score.toFixed(1);
}

export function getStatusColor(status: string): string {
    switch (status) {
        case "completed":
            return "text-emerald-400";
        case "processing":
            return "text-amber-400";
        case "queued":
            return "text-blue-400";
        case "failed":
            return "text-red-400";
        default:
            return "text-zinc-400";
    }
}

export function getStatusBgColor(status: string): string {
    switch (status) {
        case "completed":
            return "bg-emerald-500/10 border-emerald-500/20";
        case "processing":
            return "bg-amber-500/10 border-amber-500/20";
        case "queued":
            return "bg-blue-500/10 border-blue-500/20";
        case "failed":
            return "bg-red-500/10 border-red-500/20";
        default:
            return "bg-zinc-500/10 border-zinc-500/20";
    }
}
