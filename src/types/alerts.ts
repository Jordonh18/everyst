/**
 * Types for enhanced alert configuration and notification system
 */

export type MetricType = 'cpu' | 'memory' | 'disk' | 'network_rx' | 'network_tx' | 'custom';

export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertFrequencyType = 'immediate' | 'throttled' | 'scheduled' | 'batched';

export type DeliveryType = 'in_app' | 'email' | 'teams' | 'slack' | 'discord' | 'webhook' | 'sms';

export type ExecutionStatus = 'success' | 'failed' | 'partial' | 'throttled';

export interface AlertConfiguration {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  metric_type: MetricType;
  metric_type_display: string;
  custom_metric_name?: string;
  condition_operator: ConditionOperator;
  condition_operator_display: string;
  threshold_value: number;
  time_window_minutes: number;
  evaluation_frequency_minutes: number;
  severity: AlertSeverity;
  severity_display: string;
  frequency_type: AlertFrequencyType;
  frequency_type_display: string;
  throttle_minutes: number;
  schedule_cron?: string;
  advanced_config: Record<string, unknown>;
  last_evaluated?: string;
  last_triggered?: string;
  delivery_methods: AlertDeliveryMethod[];
  condition_display: string;
  is_throttled: boolean;
  should_evaluate: boolean;
  user_username: string;
  created_at: string;
  updated_at: string;
}

export interface AlertDeliveryMethod {
  id: number;
  delivery_type: DeliveryType;
  delivery_type_display: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
  max_retries: number;
  retry_delay_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface AlertExecution {
  id: number;
  alert_configuration: number;
  alert_configuration_name: string;
  executed_at: string;
  status: ExecutionStatus;
  status_display: string;
  metric_value: number;
  threshold_value: number;
  delivery_results: Record<string, unknown>;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  id: number;
  user: number;
  user_username: string;
  email_notifications_enabled: boolean;
  in_app_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  min_severity_email: AlertSeverity;
  min_severity_email_display: string;
  min_severity_push: AlertSeverity;
  min_severity_push_display: string;
  max_emails_per_hour: number;
  max_push_per_hour: number;
  group_similar_alerts: boolean;
  auto_mark_read_after_minutes: number;
  is_in_quiet_hours: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistoryItem {
  id: number;
  user: number;
  user_username: string;
  title: string;
  message?: string;
  notification_type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'alert';
  notification_type_display: string;
  read: boolean;
  category?: string;
  source?: string;
  alert_configuration?: number;
  alert_configuration_name?: string;
  alert_execution?: number;
  delivery_methods: string[];
  metadata: Record<string, unknown>;
  delivered_at: string;
  read_at?: string;
  time_since_delivered: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableMetric {
  key: MetricType;
  name: string;
  description: string;
  unit: string;
  current_value?: number;
}

export interface DeliveryOption {
  key: DeliveryType;
  name: string;
  description: string;
  available: boolean;
  configuration_required: boolean;
  configuration_fields: ConfigurationField[];
}

export interface ConfigurationField {
  key: string;
  name: string;
  type: 'text' | 'email_list' | 'url' | 'select' | 'json' | 'number' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface AlertMetrics {
  total_configurations: number;
  enabled_configurations: number;
  disabled_configurations: number;
  total_executions_today: number;
  successful_executions_today: number;
  failed_executions_today: number;
  most_triggered_alert?: string;
  alerts_by_severity: Record<AlertSeverity, number>;
  recent_executions: AlertExecution[];
}

export interface AlertTestRequest {
  alert_configuration_id: number;
  test_value?: number;
  delivery_methods?: string[];
}

export interface AlertTestResponse {
  test_value: number;
  threshold_value: number;
  condition_met: boolean;
  condition_description: string;
  delivery_results: Record<string, unknown>;
  would_trigger: boolean;
}

export interface BulkAlertAction {
  alert_ids: number[];
  enable: boolean;
}

export interface NotificationBulkAction {
  action: 'mark_read' | 'mark_unread' | 'delete';
  notification_ids: number[];
}

export interface NotificationStats {
  total_count: number;
  unread_count: number;
  read_count: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  recent_count: number;
}

// Form types for creating/editing alerts
export interface AlertConfigurationForm {
  name: string;
  description?: string;
  enabled: boolean;
  metric_type: MetricType;
  custom_metric_name?: string;
  condition_operator: ConditionOperator;
  threshold_value: number;
  time_window_minutes: number;
  evaluation_frequency_minutes: number;
  severity: AlertSeverity;
  frequency_type: AlertFrequencyType;
  throttle_minutes: number;
  schedule_cron?: string;
  delivery_methods: AlertDeliveryMethodForm[];
}

export interface AlertDeliveryMethodForm {
  delivery_type: DeliveryType;
  enabled: boolean;
  configuration: Record<string, unknown>;
  max_retries: number;
  retry_delay_minutes: number;
}

// Filter types
export interface AlertFilters {
  enabled?: boolean;
  metric_type?: MetricType;
  severity?: AlertSeverity;
  search?: string;
}

export interface NotificationFilters {
  read?: boolean;
  category?: string;
  type?: string;
  since?: string;
  search?: string;
}

// API response types
export interface AlertConfigurationListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: AlertConfiguration[];
}

export interface NotificationHistoryListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: NotificationHistoryItem[];
}

// Wizard step types for alert creation
export interface AlertWizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface AlertWizardData {
  step: number;
  totalSteps: number;
  steps: AlertWizardStep[];
  formData: Partial<AlertConfigurationForm>;
}
