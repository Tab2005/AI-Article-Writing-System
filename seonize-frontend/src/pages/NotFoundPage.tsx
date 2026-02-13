import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import './NotFoundPage.css';

export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="not-found-page">
            <div className="not-found-page__content">
                <div className="not-found-page__icon">🔍</div>
                <h1 className="not-found-page__title">404 - 找不到頁面</h1>
                <p className="not-found-page__text">
                    抱歉，您訪問的頁面不存在或已被移動。
                </p>
                <div className="not-found-page__actions">
                    <Button
                        variant="primary"
                        onClick={() => navigate('/dashboard')}
                    >
                        返回儀表板
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate(-1)}
                    >
                        回到上一頁
                    </Button>
                </div>
            </div>
        </div>
    );
};
