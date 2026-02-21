import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
            localStorage.removeItem("access_token");
            localStorage.removeItem("user");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

// Auth
export const authApi = {
    login: (email: string, password: string) =>
        api.post("/api/auth/login", { email, password }),
    register: (data: { email: string; password: string; full_name: string; role?: string }) =>
        api.post("/api/auth/register", data),
};

// Calls
export const callsApi = {
    list: (page = 1, perPage = 20, status?: string) =>
        api.get("/api/calls", { params: { page, per_page: perPage, status } }),
    get: (callId: number) =>
        api.get(`/api/calls/${callId}`),
    getResults: (callId: number) =>
        api.get(`/api/calls/${callId}/results`),
};

// Upload
export const uploadApi = {
    single: (file: File, templateId: number) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("template_id", templateId.toString());
        return api.post("/api/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    bulk: (file: File, templateId: number) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("template_id", templateId.toString());
        return api.post("/api/upload/bulk", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
};

// Templates
export const templatesApi = {
    list: () => api.get("/api/templates"),
    get: (id: number) => api.get(`/api/templates/${id}`),
    create: (data: { name: string; vertical: string; system_prompt: string; json_schema: object }) =>
        api.post("/api/templates", data),
};

// Dashboard
export const dashboardApi = {
    get: () => api.get("/api/dashboard"),
};

export default api;
