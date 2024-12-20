// notifications.js

/**
 * NotificationManager handles the creation and display of in-app notifications.
 * It supports different types of notifications: info, warning, and error.
 * Notifications are displayed in the notification area and automatically dismissed after a set duration.
 */

export class NotificationManager {
    constructor() {
        this.notificationContainer = document.getElementById("notification");
        if (!this.notificationContainer) {
            this.createNotificationArea();
        }
    }

    /**
     * Creates the notification area in the DOM if it doesn't exist.
     */
    createNotificationArea() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = "notification";
        this.notificationContainer.setAttribute('aria-live', 'polite');
        this.notificationContainer.setAttribute('aria-atomic', 'true');
        this.notificationContainer.style.position = 'fixed';
        this.notificationContainer.style.top = '20px';
        this.notificationContainer.style.right = '20px';
        this.notificationContainer.style.zIndex = '1000';
        this.notificationContainer.style.display = 'flex';
        this.notificationContainer.style.flexDirection = 'column';
        this.notificationContainer.style.gap = '5px';
        document.body.appendChild(this.notificationContainer);
    }

    /**
     * Displays an informational notification.
     * @param {string} message - The message to display.
     */
    showInfo(message) {
        this.displayNotification(message, 'info');
    }

    /**
     * Displays a warning notification.
     * @param {string} message - The warning message to display.
     */
    showWarning(message) {
        this.displayNotification(message, 'warning');
    }

    /**
     * Displays an error notification.
     * @param {string} message - The error message to display.
     */
    showError(message) {
        this.displayNotification(message, 'error');
    }

    /**
     * Creates and displays a notification message.
     * @param {string} message - The message to display.
     * @param {string} type - The type of notification ('info', 'warning', 'error').
     */
    displayNotification(message, type = 'info') {
        if (!this.notificationContainer) {
            console.warn("Notification container not found.");
            return;
        }

        const notification = document.createElement('div');
        notification.classList.add('notification', type);
        notification.textContent = message;

        // Append the notification to the container
        this.notificationContainer.appendChild(notification);

        // Automatically remove the notification after 5 seconds
        setTimeout(() => {
            this.notificationContainer.removeChild(notification);
        }, 5000);
    }
}
