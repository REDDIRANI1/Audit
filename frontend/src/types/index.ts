export interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'Agent' | 'Manager' | 'CXO' | 'Admin';
    department?: string;
    is_active: number;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface Call {
    id: number;
    user_id: number;
    template_id: number;
    batch_id?: string;
    s3_path: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    duration_seconds?: number;
    error_message?: string;
    created_at?: string;
    processed_at?: string;
}

export interface CallResult {
    call_id: number;
    status: string;
    overall_score?: number;
    score_label?: string;          // SES | SQS | RES
    score_name?: string;           // Full name e.g. "Sales Excellence Score"
    fatal_flaw?: boolean;          // True = Collections compliance breach
    summary?: string;
    compliance_flags?: Record<string, boolean>;
    pillar_scores?: Record<string, number>;
    pillar_breakdown?: Record<string, { score: number; weight_pct: number; weighted_contribution: number }>;
    recommendations?: string[];
    transcript?: TranscriptSegment[];
}

export interface TranscriptSegment {
    speaker: string;
    start: number;
    end: number;
    text: string;
}

export interface ScoringTemplate {
    id: number;
    name: string;
    vertical: string;
    system_prompt: string;
    json_schema: Record<string, unknown>;
    version: number;
    is_active: number;
    created_at?: string;
}

export interface DashboardMetric {
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'flat';
}

export interface DashboardData {
    user_id: number;
    role: string;
    metrics: DashboardMetric[];
    recent_calls?: Record<string, unknown>[];
    alerts?: { type: string; message: string }[];
}

export interface CallListResponse {
    calls: Call[];
    total: number;
    page: number;
    per_page: number;
}
