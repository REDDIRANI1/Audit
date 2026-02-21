/**
 * Analytics API client
 */
import api from "./api";

export const analyticsApi = {
    getOverview: (days = 30) =>
        api.get(`/api/analytics/overview?days=${days}`),

    getScoreTrend: (days = 30) =>
        api.get(`/api/analytics/score-trend?days=${days}`),

    getScoreDistribution: (days = 30) =>
        api.get(`/api/analytics/score-distribution?days=${days}`),

    getCallVolume: (days = 30) =>
        api.get(`/api/analytics/call-volume?days=${days}`),

    getAgentLeaderboard: (days = 30, limit = 10) =>
        api.get(`/api/analytics/agent-leaderboard?days=${days}&limit=${limit}`),

    getPipelineStatus: (callId: number) =>
        api.get(`/api/analytics/pipeline-status/${callId}`),
};
