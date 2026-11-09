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
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Session expired");
    }
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
  createUser: (data: { email: string; password: string; fullName: string; role?: string; roleId?: string }) =>
    request("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (userId: string, data: { fullName?: string; email?: string; role?: string; roleId?: string | null; password?: string; bankName?: string; bankAccount?: string }) =>
    request(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (userId: string) =>
    request(`/users/${userId}`, { method: "DELETE" }),
  getVerificationCode: (userId: string) =>
    request(`/users/${userId}/verification-code`),

  sendMessage: (formData: FormData) =>
    request("/line/send", { method: "POST", body: formData, headers: {} }),
  sendToAll: (formData: FormData) =>
    request("/line/send-all", { method: "POST", body: formData, headers: {} }),

  sendAnnouncement: (data: { title: string; bodyHtml: string; imageUrl?: string; buttonText?: string; buttonUrl?: string }) =>
    request("/line/announcements", { method: "POST", body: JSON.stringify(data) }),
  getAnnouncements: () => request("/line/announcements"),

  syncShopContacts: () => request("/shop-contacts/sync", { method: "POST" }),
  getShopContactsStatus: () => request("/shop-contacts/status"),
  getShopContacts: () => request("/shop-contacts"),

  getVisits: (params: {
    page?: number; limit?: number;
    province?: string; result?: string; tripType?: string;
    visitType?: string; customerType?: string; search?: string;
    dateFrom?: string; dateTo?: string;
    slipStatus?: string; filterUserId?: string;
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

  deleteVisit: (id: string) =>
    request(`/visits/${id}`, { method: "DELETE" }),

  updateVisit: (id: string, data: { shopName?: string; result?: string; orderAmount?: number | null; details?: string }) =>
    request(`/visits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  getSlipSubmissions: (params: {
    status?: string; search?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number;
    filterUserId?: string; blocked?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request(`/slips?${qs}`);
  },
  approveSlip: (id: string, action: 'approve' | 'reject', amount?: number) =>
    request(`/slips/${id}/approve`, { method: "PATCH", body: JSON.stringify({ action, amount }) }),
  unblockSlip: (id: string) =>
    request(`/slips/${id}/unblock`, { method: "PATCH" }),
  updateSlip: (id: string, data: { shopName?: string; amount?: number | null; details?: string; slipStatus?: string; isProxy?: boolean }) =>
    request(`/slips/${id}`, { method: "PATCH", body: JSON.stringify({
      ...data,
      amount: data.amount === null ? "" : data.amount?.toString(),
      isProxy: data.isProxy?.toString(),
    }) }),
  adminCreateSlip: (formData: FormData) =>
    request("/slips/admin-create", { method: "POST", body: formData, headers: {} }),
  getSlipAuditLogs: (params: { page?: number; limit?: number; action?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request(`/slips/audit-logs?${qs}`);
  },
  getSlipHashes: (params: { page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request(`/slips/hashes?${qs}`);
  },
  getSlipDuplicateLogs: (params: { page?: number; limit?: number; dateFrom?: string; dateTo?: string } = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request(`/slips/duplicate-logs?${qs}`);
  },

  getBankAccounts: () => request("/bank-accounts"),
  createBankAccount: (data: { label: string; bankId: string; bankName: string; accountNumber: string }) =>
    request("/bank-accounts", { method: "POST", body: JSON.stringify(data) }),
  updateBankAccount: (id: string, data: { label?: string; bankId?: string; bankName?: string; accountNumber?: string; isActive?: boolean }) =>
    request(`/bank-accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBankAccount: (id: string) =>
    request(`/bank-accounts/${id}`, { method: "DELETE" }),

  getSlipSettings: () => request("/settings/slip"),
  updateSlipSettings: (data: { provider?: string; slip2goSecret?: string; easyslipSecret?: string }) =>
    request("/settings/slip", { method: "PATCH", body: JSON.stringify(data) }),

  getCommissionSettings: () => request("/settings/commission"),
  updateCommissionSettings: (data: { rate?: number; threshold?: number; tiers?: any[]; proxyRate?: number }) =>
    request("/settings/commission", { method: "PATCH", body: JSON.stringify(data) }),

  getProxyCommissions: (month: string) => request(`/slips/proxy-commission?month=${month}`),
  toggleSlipProxy: (id: string, isProxy: boolean) =>
    request(`/slips/${id}/proxy`, { method: "PATCH", body: JSON.stringify({ isProxy }) }),

  getSalesOverview: (from: string, to: string) =>
    request(`/flowaccount/sales-overview?from=${from}&to=${to}`),

  getCommissionSummary: (month: string) =>
    request(`/visits/commission-summary?month=${month}`),

  getCommissionOverdue: () =>
    request(`/visits/commission-overdue`),

  createCommissionAdjustment: (data: { userId: string; month: string; amount: number; note?: string }) =>
    request("/commission-adjustments", { method: "POST", body: JSON.stringify(data) }),

  getCommissionAdjustments: (month: string) =>
    request(`/commission-adjustments?month=${month}`),

  getUserAdjustments: (userId: string) =>
    request(`/commission-adjustments/user/${userId}`),

  applyDebtDeduction: (userId: string, month: string) =>
    request("/commission-adjustments/apply-debt", { method: "POST", body: JSON.stringify({ userId, month }) }),

  getOutstandingDebtAll: () =>
    request(`/commission-adjustments/outstanding`),

  getCommissionBreakdown: (userId: string, month: string) =>
    request(`/visits/commission-breakdown?userId=${userId}&month=${month}`),

  getCommissionPayments: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request(`/commission-payments${qs}`);
  },

  createCommissionPayment: (formData: FormData) =>
    request('/commission-payments', { method: 'POST', body: formData, headers: {} }),

  getSheetSettings: () => request('/settings/sheets'),
  updateSheetSettings: (data: { visitSheetId?: string; commissionSheetId?: string }) =>
    request('/settings/sheets', { method: 'PATCH', body: JSON.stringify(data) }),

  getRoles: () => request('/roles'),
  getRoleMenus: () => request('/roles/menus'),
  createRole: (data: { name: string; label: string; permissions: any[] }) =>
    request('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: { label?: string; permissions?: any[]; isActive?: boolean }) =>
    request(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRole: (id: string) =>
    request(`/roles/${id}`, { method: 'DELETE' }),
};
