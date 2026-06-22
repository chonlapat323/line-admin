const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || "Request failed");
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  getUsers: () => request("/users"),
  getMe: () => request("/users/me"),
  createUser: (data: { email: string; password: string; fullName: string; role?: string }) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  deleteUser: (userId: string) =>
    request(`/users/${userId}`, { method: "DELETE" }),
  getVerificationCode: (userId: string) =>
    request(`/users/${userId}/verification-code`),

  sendMessage: (formData: FormData) =>
    request("/line/send", { method: "POST", body: formData, headers: {} }),
  sendToAll: (formData: FormData) =>
    request("/line/send-all", { method: "POST", body: formData, headers: {} }),

  getVisits: (params: {
    page?: number; limit?: number;
    province?: string; result?: string; tripType?: string;
    visitType?: string; customerType?: string; search?: string;
    dateFrom?: string; dateTo?: string;
    slipStatus?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request(`/visits?${qs}`);
  },

  getVisitProvinceStats: (params: { dateFrom?: string; dateTo?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return request(`/visits/province-stats?${qs}`);
  },

  approveVisit: (id: string, action: 'approve' | 'reject', amount?: number) =>
    request(`/visits/${id}/approve`, { method: "PATCH", body: JSON.stringify({ action, amount }) }),

  getSlipSettings: () => request("/settings/slip"),
  updateSlipSettings: (data: { provider?: string; slip2goSecret?: string; easyslipSecret?: string }) =>
    request("/settings/slip", { method: "PATCH", body: JSON.stringify(data) }),

  getCommissionSettings: () => request("/settings/commission"),
  updateCommissionSettings: (data: { rate?: number; threshold?: number }) =>
    request("/settings/commission", { method: "PATCH", body: JSON.stringify(data) }),

  getCommissionSummary: (month: string) =>
    request(`/visits/commission-summary?month=${month}`),

  getCommissionBreakdown: (userId: string, month: string) =>
    request(`/visits/commission-breakdown?userId=${userId}&month=${month}`),

  getCommissionPayments: (month: string) =>
    request(`/commission-payments?month=${month}`),

  createCommissionPayment: (formData: FormData) =>
    request('/commission-payments', { method: 'POST', body: formData, headers: {} }),
};
