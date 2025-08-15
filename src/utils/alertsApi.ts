/**
 * API client for alert configuration and notification management
 */
import { apiClient } from './apiClient';
import type {
  AlertConfiguration,
  AlertConfigurationForm,
  AlertDeliveryMethod,
  AlertExecution,
  UserNotificationPreferences,
  NotificationHistoryItem,
  AvailableMetric,
  DeliveryOption,
  AlertMetrics,
  AlertTestRequest,
  AlertTestResponse,
  BulkAlertAction,
  NotificationBulkAction,
  NotificationStats,
  AlertFilters,
  NotificationFilters,
  AlertConfigurationListResponse,
  NotificationHistoryListResponse
} from '../types/alerts';

const BASE_URL = '';

// Alert Configuration API
const alertConfigurationApi = {
  // List alert configurations with optional filters
  list: async (filters?: AlertFilters): Promise<AlertConfigurationListResponse> => {
    const params = new URLSearchParams();
    if (filters?.enabled !== undefined) params.append('enabled', filters.enabled.toString());
    if (filters?.metric_type) params.append('metric_type', filters.metric_type);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`${BASE_URL}/alert-configurations/?${params.toString()}`);
    return response.data as AlertConfigurationListResponse;
  },

  // Get single alert configuration
  get: async (id: string): Promise<AlertConfiguration> => {
    const response = await apiClient.get(`${BASE_URL}/alert-configurations/${id}/`);
    return response.data as AlertConfiguration;
  },

  // Create new alert configuration
  create: async (data: AlertConfigurationForm): Promise<AlertConfiguration> => {
    const response = await apiClient.post(`${BASE_URL}/alert-configurations/`, data);
    return response.data as AlertConfiguration;
  },

  // Update alert configuration
  update: async (id: string, data: Partial<AlertConfigurationForm>): Promise<AlertConfiguration> => {
    const response = await apiClient.put(`${BASE_URL}/alert-configurations/${id}/`, data);
    return response.data as AlertConfiguration;
  },

  // Partially update alert configuration
  patch: async (id: string, data: Partial<AlertConfigurationForm>): Promise<AlertConfiguration> => {
    const response = await apiClient.patch(`${BASE_URL}/alert-configurations/${id}/`, data);
    return response.data as AlertConfiguration;
  },

  // Delete alert configuration
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/alert-configurations/${id}/`);
  },

  // Test alert configuration
  test: async (id: string, testData: Omit<AlertTestRequest, 'alert_configuration_id'>): Promise<AlertTestResponse> => {
    const fullTestData = {
      ...testData,
      alert_configuration_id: id
    };
    const response = await apiClient.post(`${BASE_URL}/alert-configurations/${id}/test/`, fullTestData);
    return response.data as AlertTestResponse;
  },

  // Toggle alert configuration
  toggle: async (id: string): Promise<{ id: string; enabled: boolean; message: string }> => {
    const response = await apiClient.post(`${BASE_URL}/alert-configurations/${id}/toggle/`);
    return response.data as { id: string; enabled: boolean; message: string };
  },

  // Bulk toggle alerts
  bulkToggle: async (data: BulkAlertAction): Promise<{ updated_count: number; enabled: boolean; message: string }> => {
    const response = await apiClient.post(`${BASE_URL}/alert-configurations/bulk_toggle/`, data);
    return response.data as { updated_count: number; enabled: boolean; message: string };
  },

  // Get alert metrics
  metrics: async (): Promise<AlertMetrics> => {
    const response = await apiClient.get(`${BASE_URL}/alert-configurations/metrics/`);
    return response.data as AlertMetrics;
  }
};

// Alert Delivery Method API
const alertDeliveryMethodApi = {
  // List delivery methods
  list: async (): Promise<AlertDeliveryMethod[]> => {
    const response = await apiClient.get(`${BASE_URL}/alert-delivery-methods/`);
    const data = response.data as { results?: AlertDeliveryMethod[] } | AlertDeliveryMethod[];
    return Array.isArray(data) ? data : (data.results || []);
  },

  // Get single delivery method
  get: async (id: string): Promise<AlertDeliveryMethod> => {
    const response = await apiClient.get(`${BASE_URL}/alert-delivery-methods/${id}/`);
    return response.data as AlertDeliveryMethod;
  },

  // Create delivery method
  create: async (data: { alert_configuration: string } & Omit<AlertDeliveryMethod, 'id' | 'created_at' | 'updated_at' | 'delivery_type_display'>): Promise<AlertDeliveryMethod> => {
    const response = await apiClient.post(`${BASE_URL}/alert-delivery-methods/`, data);
    return response.data as AlertDeliveryMethod;
  },

  // Update delivery method
  update: async (id: string, data: Partial<AlertDeliveryMethod>): Promise<AlertDeliveryMethod> => {
    const response = await apiClient.put(`${BASE_URL}/alert-delivery-methods/${id}/`, data);
    return response.data as AlertDeliveryMethod;
  },

  // Delete delivery method
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/alert-delivery-methods/${id}/`);
  }
};

// Alert Execution API
const alertExecutionApi = {
  // List alert executions
  list: async (alertConfigId?: string): Promise<AlertExecution[]> => {
    const params = alertConfigId ? `?alert_configuration=${alertConfigId}` : '';
    const response = await apiClient.get(`${BASE_URL}/alert-executions/${params}`);
    const data = response.data as { results?: AlertExecution[] } | AlertExecution[];
    return Array.isArray(data) ? data : (data.results || []);
  },

  // Get single execution
  get: async (id: string): Promise<AlertExecution> => {
    const response = await apiClient.get(`${BASE_URL}/alert-executions/${id}/`);
    return response.data as AlertExecution;
  }
};

// User Notification Preferences API
const notificationPreferencesApi = {
  // Get user preferences (automatically gets or creates)
  get: async (): Promise<UserNotificationPreferences> => {
    const response = await apiClient.get(`${BASE_URL}/notification-preferences/`);
    return response.data as UserNotificationPreferences;
  },

  // Update preferences
  update: async (data: Partial<UserNotificationPreferences>): Promise<UserNotificationPreferences> => {
    const response = await apiClient.post(`${BASE_URL}/notification-preferences/`, data);
    return response.data as UserNotificationPreferences;
  }
};

// Notification History API
const notificationHistoryApi = {
  // List notification history with filters
  list: async (filters?: NotificationFilters): Promise<NotificationHistoryListResponse> => {
    const params = new URLSearchParams();
    if (filters?.read !== undefined) params.append('read', filters.read.toString());
    if (filters?.category) params.append('category', filters.category);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.since) params.append('since', filters.since);
    if (filters?.search) params.append('search', filters.search);
    
    const response = await apiClient.get(`${BASE_URL}/notification-history/?${params.toString()}`);
    return response.data as NotificationHistoryListResponse;
  },

  // Get single notification
  get: async (id: string): Promise<NotificationHistoryItem> => {
    const response = await apiClient.get(`${BASE_URL}/notification-history/${id}/`);
    return response.data as NotificationHistoryItem;
  },

  // Create notification (for testing purposes)
  create: async (data: Omit<NotificationHistoryItem, 'id' | 'user' | 'user_username' | 'delivered_at' | 'read_at' | 'time_since_delivered' | 'created_at' | 'updated_at'>): Promise<NotificationHistoryItem> => {
    const response = await apiClient.post(`${BASE_URL}/notification-history/`, data);
    return response.data as NotificationHistoryItem;
  },

  // Mark notification as read
  markRead: async (id: string): Promise<{ id: string; read: boolean; read_at: string }> => {
    const response = await apiClient.post(`${BASE_URL}/notification-history/${id}/mark_read/`);
    return response.data as { id: string; read: boolean; read_at: string };
  },

  // Mark all notifications as read
  markAllRead: async (): Promise<{ updated_count: number; message: string }> => {
    const response = await apiClient.post(`${BASE_URL}/notification-history/mark_all_read/`);
    return response.data as { updated_count: number; message: string };
  },

  // Bulk action on notifications
  bulkAction: async (data: NotificationBulkAction): Promise<{ action: string; updated_count: number; message: string }> => {
    const response = await apiClient.post(`${BASE_URL}/notification-history/bulk_action/`, data);
    return response.data as { action: string; updated_count: number; message: string };
  },

  // Get notification statistics
  stats: async (): Promise<NotificationStats> => {
    const response = await apiClient.get(`${BASE_URL}/notification-history/stats/`);
    return response.data as NotificationStats;
  },

  // Delete notification
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_URL}/notification-history/${id}/`);
  }
};

// Available Metrics API
const metricsApi = {
  // Get available metrics for alert configuration
  getAvailable: async (): Promise<AvailableMetric[]> => {
    const response = await apiClient.get(`${BASE_URL}/alerts/available-metrics/`);
    return response.data as AvailableMetric[];
  }
};

// Delivery Options API
const deliveryOptionsApi = {
  // Get available delivery options
  getOptions: async (): Promise<DeliveryOption[]> => {
    const response = await apiClient.get(`${BASE_URL}/alerts/delivery-options/`);
    return response.data as DeliveryOption[];
  }
};

// Combined API exports
export const alertsApi = {
  configurations: alertConfigurationApi,
  deliveryMethods: alertDeliveryMethodApi,
  executions: alertExecutionApi,
  preferences: notificationPreferencesApi,
  history: notificationHistoryApi,
  metrics: metricsApi,
  deliveryOptions: deliveryOptionsApi
};
