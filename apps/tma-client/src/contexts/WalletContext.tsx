import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { userApi } from '../api/client';

interface WalletContextType {
    balance: number;
    refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({ balance: 0, refreshWallet: async () => { } });

export function WalletProvider({ children }: { children: ReactNode }) {
    const [balance, setBalance] = useState(0);

    const refreshWallet = useCallback(async () => {
        try {
            const data = await userApi.getWallet();
            setBalance(Number(data?.balance || 0));
        } catch (e) {
            console.error('[Wallet] Refresh failed:', e);
        }
    }, []);

    // Initial fetch + polling every 30s
    useEffect(() => {
        refreshWallet();
        const interval = setInterval(refreshWallet, 30000);
        return () => clearInterval(interval);
    }, [refreshWallet]);

    return (
        <WalletContext.Provider value={{ balance, refreshWallet }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    return useContext(WalletContext);
}
