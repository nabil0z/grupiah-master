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
    }
};

export const tasksApi = {
    async createCustomTask(title: string, description: string, reward: number): Promise<any> {
        const response = await fetch(`${API_BASE}/admin/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tma ${mockInitData}`
            },
            body: JSON.stringify({ title, description, reward })
        });
        if (!response.ok) throw new Error('Failed to create task');
        return response.json();
    }
};
