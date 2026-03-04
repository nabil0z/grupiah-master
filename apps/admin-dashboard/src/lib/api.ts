const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:53000';
const mockInitData = "mock_token";

export const broadcastApi = {
    async generateDraft(topic: string, tone: string = 'Excited & FOMO'): Promise<{ content: string }> {
        const response = await fetch(`${API_BASE}/admin/broadcast/generate-draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ topic, tone })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to generate draft');
        }
        return response.json();
    },

    async sendBroadcast(content: string, imageUrl?: string): Promise<{ success: boolean }> {
        const response = await fetch(`${API_BASE}/admin/broadcast/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ content, imageUrl })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to send broadcast');
        }
        return response.json();
    },

    async sendPrivateBlast(content: string, imageUrl?: string, buttonText?: string, buttonUrl?: string): Promise<{ success: boolean; sent: number; failed: number; total: number }> {
        const response = await fetch(`${API_BASE}/admin/broadcast/private-blast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ content, imageUrl, buttonText, buttonUrl })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to send private blast');
        }
        return response.json();
    },

    async testCron(hour: number): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE}/admin/broadcast/test-cron`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ hour })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to trigger cron test');
        }
        return response.json();
    }
};

export const usersApi = {
    async getUsers(): Promise<any[]> {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: {
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    async toggleBan(userId: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to toggle ban status');
        return response.json();
    },

    async toggleMarketing(userId: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/marketing`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to toggle marketing mode');
        return response.json();
    },

    async adjustBalance(userId: string, amount: number, description?: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ amount, description })
        });
        if (!response.ok) throw new Error('Failed to adjust balance');
        return response.json();
    },

    async injectFakeStats(userId: string, tasks: number, withdrawals: number, referrals: number): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/inject-stats`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ tasks, withdrawals, referrals })
        });
        if (!response.ok) throw new Error('Failed to inject stats');
        return response.json();
    },

    async cleanupFakeData(userId: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/cleanup-fake`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to cleanup fake data');
        return response.json();
    }
};
export const tasksApi = {
    async getCustomTasks(): Promise<any[]> {
        const response = await fetch(`${API_BASE}/admin/tasks`, {
            headers: { 'Authorization': `tma ${mockInitData}` }
        });
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return response.json();
    },

    async createCustomTask(title: string, description: string, reward: number, instructions?: string, logoUrl?: string, link?: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ title, description, reward, instructions, logoUrl, link })
        });
        if (!response.ok) throw new Error('Failed to create task');
        return response.json();
    },

    async updateCustomTask(id: string, updateData: any): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error('Failed to update task');
        return response.json();
    },

    async deleteCustomTask(id: string): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `tma ${mockInitData}` }
        });
        if (!response.ok) throw new Error('Failed to delete task');
        return response.json();
    },

    async getFlashConfig(): Promise<{ ogads: string, adblue: string, custom: string }> {
        const response = await fetch(`${API_BASE}/admin/configs/flash-tasks`, {
            headers: {
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch flash configs');
        return response.json();
    },

    async updateFlashConfig(config: { ogads: string, adblue: string, custom: string }): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/configs/flash-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify(config)
        });
        if (!response.ok) throw new Error('Failed to update flash configs');
        return response.json();
    }
};

export const analyticsApi = {
    async getDashboard(): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/analytics`, {
            headers: { 'Authorization': `tma ${mockInitData}` }
        });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        return response.json();
    }
};

export const settingsApi = {
    async getAllConfigs(): Promise<Record<string, string>> {
        const response = await fetch(`${API_BASE}/admin/configs`, {
            headers: {
                'Authorization': `tma ${mockInitData}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch configs');
        return response.json();
    },

    async updateConfigs(configs: Record<string, string>): Promise<{ success: boolean }> {
        const response = await fetch(`${API_BASE}/admin/configs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ configs })
        });
        if (!response.ok) throw new Error('Failed to update configs');
        return response.json();
    }
};
