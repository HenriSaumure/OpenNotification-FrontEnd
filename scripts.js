// Notification Counter WebSocket
class NotificationCounter {
    constructor() {
        this.ws = null;
        this.reconnectInterval = 5000; // 5 seconds
        this.maxReconnectAttempts = 10;
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        this.currentEndpointIndex = 0;
        
        // List of possible endpoints to try
        this.endpoints = [
            'wss://api.opennotification.org/ws/count',
            'wss://api.opennotification.com/ws/count'
        ];
        
        // DOM elements
        this.countElement = document.getElementById('notificationCount');
        this.statusElement = document.getElementById('connectionStatus');
        
        // Initialize connection
        this.connect();
    }

    connect() {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            return;
        }

        this.isConnecting = true;
        this.updateStatus('connecting', 'Connecting...');

        try {
            // Try different endpoints if the current one fails
            const wsUrl = this.endpoints[this.currentEndpointIndex];
            console.log(`Attempting to connect to: ${wsUrl}`);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected to notification counter');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.updateStatus('connected', 'Live updates');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.count !== undefined) {
                        this.updateCount(data.count);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket connection closed:', event.code, event.reason);
                this.isConnecting = false;
                this.updateStatus('disconnected', 'Disconnected');
                
                // Try next endpoint if available
                if (event.code === 1006 && this.currentEndpointIndex < this.endpoints.length - 1) {
                    this.currentEndpointIndex++;
                    console.log(`Trying next endpoint: ${this.endpoints[this.currentEndpointIndex]}`);
                    this.reconnectAttempts = 0; // Reset attempts for new endpoint
                    setTimeout(() => this.connect(), 1000);
                } else {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
                this.updateStatus('disconnected', 'Connection error');
            };

        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.isConnecting = false;
            this.updateStatus('disconnected', 'Connection failed');
            this.scheduleReconnect();
        }
    }

    updateCount(count) {
        if (this.countElement) {
            // Format large numbers
            const formattedCount = this.formatNumber(count);
            this.countElement.textContent = formattedCount;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    updateStatus(type, message) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.className = `counter-status ${type}`;
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.updateStatus('disconnected', 'Connection failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectInterval * this.reconnectAttempts, 30000); // Max 30 seconds
        
        this.updateStatus('connecting', `Reconnecting in ${Math.ceil(delay / 1000)}s...`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

// Initialize the notification counter when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.notificationCounter = new NotificationCounter();
});

// Clean up WebSocket connection when page unloads
window.addEventListener('beforeunload', () => {
    if (window.notificationCounter) {
        window.notificationCounter.disconnect();
    }
});