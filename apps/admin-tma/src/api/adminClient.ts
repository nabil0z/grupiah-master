import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:53000';

export const adminClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to automatically attach Telegram initData
adminClient.interceptors.request.use((config) => {
    let initData = '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof window !== 'undefined' && win.Telegram && win.Telegram.WebApp) {
        initData = win.Telegram.WebApp.initData;
    }

    if (!initData && import.meta.env.MODE === 'development') {
        initData = 'mock_token';
    }

    if (initData && config.headers) {
        config.headers['Authorization'] = `tma ${initData}`;
    }

    return config;
});

export const adminApi = {
    getDashboardStats: async () => {
        const response = await adminClient.get('/admin/dashboard-stats');
        return response.data;
    },
    getPendingWithdrawals: async () => {
        const response = await adminClient.get('/admin/withdrawals/pending');
        return response.data;
    },
    actionWithdrawal: async (id: string, action: 'APPROVE' | 'REJECT') => {
        const response = await adminClient.post(`/admin/withdrawals/${id}/action`, { action });
        return response.data;
    },
    getSettings: async () => {
        const response = await adminClient.get('/admin/settings');
        return response.data;
    },
    updateSettings: async (configs: Record<string, string>) => {
        const response = await adminClient.put('/admin/settings', configs);
        return response.data;
    },
    getPendingTasks: async () => {
        const response = await adminClient.get('/admin/tasks/pending-review');
        return response.data;
    },
    reviewTask: async (userTaskId: string, action: 'APPROVE' | 'REJECT') => {
        const response = await adminClient.post(`/admin/tasks/review/${userTaskId}`, { action });
        return response.data;
    }
};
