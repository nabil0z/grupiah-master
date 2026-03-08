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
    if (typeof window !== 'undefined' && win.Telegram && win.Telegram.WebApp && win.Telegram.WebApp.initData) {
        initData = win.Telegram.WebApp.initData;
        // Cache for refresh/navigation
        sessionStorage.setItem('tg_init_data', initData);
    }

    // Fallback: retrieve from cache
    if (!initData) {
        initData = sessionStorage.getItem('tg_init_data') || '';
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
    },
    sendToChannel: async (body: { content: string, imageUrl?: string, buttonText?: string, buttonUrl?: string }) => {
        const response = await adminClient.post('/admin/broadcast/send', body);
        return response.data;
    },
    sendDmBlast: async (body: { content: string, imageUrl?: string, buttonText?: string, buttonUrl?: string }) => {
        const response = await adminClient.post('/admin/broadcast/private-blast', body);
        return response.data;
    },
    triggerCron: async (hour: number) => {
        const response = await adminClient.post('/admin/broadcast/test-cron', { hour });
        return response.data;
    },
    getTasks: async () => {
        const response = await adminClient.get('/admin/tasks');
        return response.data;
    },
    createTask: async (task: { title: string, description?: string, reward: number, link?: string, logoUrl?: string }) => {
        const response = await adminClient.post('/admin/tasks', task);
        return response.data;
    },
    updateTask: async (id: string, task: any) => {
        const response = await adminClient.put(`/admin/tasks/${id}`, task);
        return response.data;
    },
    deleteTask: async (id: string) => {
        const response = await adminClient.delete(`/admin/tasks/${id}`);
        return response.data;
    },
    getCreators: async () => {
        const response = await adminClient.get('/admin/creators');
        return response.data;
    },
    approveCreator: async (userId: string) => {
        const response = await adminClient.post(`/admin/creators/${userId}/approve`);
        return response.data;
    },
    rejectCreator: async (userId: string) => {
        const response = await adminClient.post(`/admin/creators/${userId}/reject`);
        return response.data;
    },
    revokeCreator: async (userId: string) => {
        const response = await adminClient.post(`/admin/creators/${userId}/revoke`);
        return response.data;
    }
};
