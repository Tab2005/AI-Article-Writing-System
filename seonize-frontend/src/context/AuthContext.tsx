import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const validateToken = async () => {
        const token = localStorage.getItem('seonize_token');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await authApi.validate();
            const isSuccess = response.status === 'success' || response.status === 'ok';
            if (isSuccess && response.user) {
                setUser(response.user);
            } else {
                localStorage.removeItem('seonize_token');
                setUser(null);
            }
        } catch (error) {
            localStorage.removeItem('seonize_token');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        validateToken();
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('seonize_token', token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('seonize_token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const response = await authApi.validate();
            if (response.status === 'success' && response.user) {
                setUser(response.user);
            }
        } catch (error) {
            console.error('Refresh user failed:', error);
        }
    };

    const updateUser = (userData: User) => {
        setUser(userData);
    };

    // Removed window.refreshAuthUser global mount to follow React best practices

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
            refreshUser,
            updateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
