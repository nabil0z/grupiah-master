import axios from 'axios';

// The NestJS backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:53000';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to automatically attach Telegram initData
apiClient.interceptors.request.use((config) => {
    let initData = '';

    // 1. Check if we are running inside Telegram (Production)
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        initData = window.Telegram.WebApp.initData;
    }

    // 2. Check if we are running in local Dev Mode (Mock)
    if (!initData && import.meta.env.MODE === 'development') {
        // This allows local PC development without Telegram by skipping the HMAC verification in NestJS
        initData = 'mock_token';
    }

    if (initData && config.headers) {
        config.headers['Authorization'] = `tma ${initData}`;
    }

    return config;
});

// API Functions Array
export const authApi = {
    login: async (startParam?: string) => {
        const response = await apiClient.post('/auth/telegram/login', { startParam });
        return response.data;
    },
};

export const userApi = {
    getProfile: async () => {
        const response = await apiClient.get('/users/me');
        return response.data;
    },
    getWallet: async () => {
        const response = await apiClient.get('/users/me/wallet');
        return response.data;
    },
    getReferrals: async () => {
        const response = await apiClient.get('/users/me/referrals');
        return response.data;
    },
    getLeaderboard: async () => {
        const response = await apiClient.get('/users/leaderboard');
        return response.data;
    },
    getActiveBoost: async () => {
        const response = await apiClient.get('/users/me/boost');
        return response.data;
    },
    buyBoost: async (payload: { multiplierRate: number, purchasedStar: number }) => {
        const response = await apiClient.post('/users/me/boost', payload);
        return response.data;
    },
    verifyChannel: async () => {
        const response = await apiClient.get('/users/verify-channel');
        return response.data;
    },
    claimDaily: async () => {
        const response = await apiClient.post('/users/daily-checkin');
        return response.data;
    },
    requestWithdrawal: async (payload: { amount: number, method: string, accountInfo: { name: string, number: string } }) => {
        const response = await apiClient.post('/users/me/withdraw', payload);
        return response.data;
    }
};

export const tasksApi = {
    getAvailable: async () => {
        const response = await apiClient.get('/tasks');
        return response.data;
    }
};
