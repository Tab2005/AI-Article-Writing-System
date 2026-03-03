/**
 * useApiWithCredits：包裝 fetch，自動攔截 402 點數不足錯誤
 * 在任何呼叫 API 的組件中使用此 hook 來取得 apiFetch 函數
 */
import { useState, useCallback } from 'react';

export interface InsufficientCreditsError {
    code: 'INSUFFICIENT_CREDITS';
    message: string;
    required: number;
    available: number;
}

interface CreditsModalState {
    isOpen: boolean;
    required?: number;
    available?: number;
    message?: string;
}

const TOKEN_KEY = 'seonize_token';
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function useApiWithCredits() {
    const [creditsModal, setCreditsModal] = useState<CreditsModalState>({ isOpen: false });

    const apiFetch = useCallback(async (
        endpoint: string,
        options: RequestInit = {}
    ): Promise<Response> => {
        const token = localStorage.getItem(TOKEN_KEY);
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        } as Record<string, string>;

        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

        // 攔截 402 點數不足
        if (res.status === 402) {
            const data = await res.json().catch(() => ({}));
            const detail = data.detail || {};
            setCreditsModal({
                isOpen: true,
                required: typeof detail === 'object' ? detail.required : undefined,
                available: typeof detail === 'object' ? detail.available : undefined,
                message: typeof detail === 'string' ? detail : (detail.message || '點數不足以執行此操作。'),
            });
            // 拋出特殊錯誤讓呼叫端知道已被攔截
            const err = new Error('INSUFFICIENT_CREDITS') as Error & { isCreditsError: boolean };
            err.isCreditsError = true;
            throw err;
        }

        return res;
    }, []);

    const closeCreditsModal = useCallback(() => {
        setCreditsModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    return { apiFetch, creditsModal, closeCreditsModal };
}
