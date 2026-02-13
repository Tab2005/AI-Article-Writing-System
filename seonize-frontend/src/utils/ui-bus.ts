type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationEvent {
    message: string;
    type: NotificationType;
}

type LoadingListener = (isLoading: boolean) => void;
type NotificationListener = (event: NotificationEvent) => void;

class UIBus {
    private loadingListeners: LoadingListener[] = [];
    private notificationListeners: NotificationListener[] = [];

    onLoading(listener: LoadingListener) {
        this.loadingListeners.push(listener);
        return () => {
            this.loadingListeners = this.loadingListeners.filter(l => l !== listener);
        };
    }

    onNotification(listener: NotificationListener) {
        this.notificationListeners.push(listener);
        return () => {
            this.notificationListeners = this.notificationListeners.filter(l => l !== listener);
        };
    }

    showLoading() {
        this.loadingListeners.forEach(l => l(true));
    }

    hideLoading() {
        this.loadingListeners.forEach(l => l(false));
    }

    notify(message: string, type: NotificationType = 'info') {
        this.notificationListeners.forEach(l => l({ message, type }));
    }
}

export const uiBus = new UIBus();
