"""
Serializers for enhanced alert configuration and notification models.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from api.models.alert_config import (
    AlertConfiguration,
    AlertDeliveryMethod,
    AlertExecution,
    UserNotificationPreferences,
    NotificationHistory
)

User = get_user_model()


class AlertDeliveryMethodSerializer(serializers.ModelSerializer):
    """Serializer for alert delivery methods"""
    
    delivery_type_display = serializers.CharField(source='get_delivery_type_display', read_only=True)
    
    class Meta:
        model = AlertDeliveryMethod
        fields = [
            'id', 'delivery_type', 'delivery_type_display', 'enabled', 
            'configuration', 'max_retries', 'retry_delay_minutes',
            'created_at', 'updated_at'
        ]


class AlertConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for alert configurations"""
    
    delivery_methods = AlertDeliveryMethodSerializer(many=True, read_only=True)
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    condition_operator_display = serializers.CharField(source='get_condition_operator_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    frequency_type_display = serializers.CharField(source='get_frequency_type_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    is_throttled = serializers.BooleanField(read_only=True)
    should_evaluate = serializers.BooleanField(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AlertConfiguration
        fields = [
            'id', 'name', 'description', 'enabled', 'metric_type', 'metric_type_display',
            'custom_metric_name', 'condition_operator', 'condition_operator_display',
            'threshold_value', 'time_window_minutes', 'evaluation_frequency_minutes',
            'severity', 'severity_display', 'frequency_type', 'frequency_type_display',
            'throttle_minutes', 'schedule_cron', 'advanced_config', 
            'last_evaluated', 'last_triggered', 'delivery_methods', 'condition_display',
            'is_throttled', 'should_evaluate', 'user_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'last_evaluated', 'last_triggered']
    
    def create(self, validated_data):
        # Automatically set user from request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate(self, data):
        """Validate alert configuration data"""
        # Validate custom metric name for custom metrics
        if data.get('metric_type') == 'custom' and not data.get('custom_metric_name'):
            raise serializers.ValidationError({
                'custom_metric_name': 'Custom metric name is required for custom metric type.'
            })
        
        # Validate schedule_cron for scheduled frequency
        if data.get('frequency_type') == 'scheduled' and not data.get('schedule_cron'):
            raise serializers.ValidationError({
                'schedule_cron': 'Cron schedule is required for scheduled frequency type.'
            })
        
        # Validate time windows
        evaluation_freq = data.get('evaluation_frequency_minutes', 5)
        time_window = data.get('time_window_minutes', 5)
        
        if evaluation_freq > time_window:
            raise serializers.ValidationError({
                'evaluation_frequency_minutes': 'Evaluation frequency cannot be greater than time window.'
            })
        
        return data


class AlertExecutionSerializer(serializers.ModelSerializer):
    """Serializer for alert executions"""
    
    alert_configuration_name = serializers.CharField(source='alert_configuration.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AlertExecution
        fields = [
            'id', 'alert_configuration', 'alert_configuration_name', 'executed_at',
            'status', 'status_display', 'metric_value', 'threshold_value',
            'delivery_results', 'error_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['alert_configuration', 'executed_at']


class UserNotificationPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user notification preferences"""
    
    min_severity_email_display = serializers.CharField(source='get_min_severity_email_display', read_only=True)
    min_severity_push_display = serializers.CharField(source='get_min_severity_push_display', read_only=True)
    is_in_quiet_hours = serializers.BooleanField(read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserNotificationPreferences
        fields = [
            'id', 'user', 'user_username', 'email_notifications_enabled',
            'in_app_notifications_enabled', 'push_notifications_enabled',
            'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
            'min_severity_email', 'min_severity_email_display',
            'min_severity_push', 'min_severity_push_display',
            'max_emails_per_hour', 'max_push_per_hour',
            'group_similar_alerts', 'auto_mark_read_after_minutes',
            'is_in_quiet_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user']
    
    def create(self, validated_data):
        # Automatically set user from request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
    
    def validate(self, data):
        """Validate notification preferences"""
        # Validate quiet hours
        if data.get('quiet_hours_enabled'):
            if not data.get('quiet_hours_start') or not data.get('quiet_hours_end'):
                raise serializers.ValidationError({
                    'quiet_hours_start': 'Both start and end times are required when quiet hours are enabled.',
                    'quiet_hours_end': 'Both start and end times are required when quiet hours are enabled.'
                })
        
        return data


class NotificationHistorySerializer(serializers.ModelSerializer):
    """Serializer for notification history"""
    
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    alert_configuration_name = serializers.CharField(source='alert_configuration.name', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    time_since_delivered = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationHistory
        fields = [
            'id', 'user', 'user_username', 'title', 'message', 'notification_type',
            'notification_type_display', 'read', 'category', 'source',
            'alert_configuration', 'alert_configuration_name', 'alert_execution',
            'delivery_methods', 'metadata', 'delivered_at', 'read_at',
            'time_since_delivered', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'delivered_at', 'read_at']
    
    def get_time_since_delivered(self, obj):
        """Get human-readable time since delivery"""
        from django.utils.timesince import timesince
        return timesince(obj.delivered_at)
    
    def create(self, validated_data):
        # Automatically set user from request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class NotificationHistoryBulkActionSerializer(serializers.Serializer):
    """Serializer for bulk actions on notification history"""
    
    action = serializers.ChoiceField(choices=['mark_read', 'mark_unread', 'delete'])
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=100,  # Limit bulk operations
        help_text="List of notification IDs to perform action on"
    )
    
    def validate_notification_ids(self, value):
        """Validate that all notification IDs belong to the requesting user"""
        user = self.context['request'].user
        valid_ids = NotificationHistory.objects.filter(
            id__in=value,
            user=user
        ).values_list('id', flat=True)
        
        invalid_ids = set(value) - set(valid_ids)
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid notification IDs: {list(invalid_ids)}"
            )
        
        return value


class AlertTestSerializer(serializers.Serializer):
    """Serializer for testing alert configurations"""
    
    alert_configuration_id = serializers.IntegerField()
    test_value = serializers.FloatField(
        required=False,
        help_text="Optional test value to simulate. If not provided, uses current metric value."
    )
    delivery_methods = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Specific delivery methods to test. If not provided, tests all configured methods."
    )
    
    def validate_alert_configuration_id(self, value):
        """Validate that alert configuration exists and belongs to user"""
        user = self.context['request'].user
        try:
            alert_config = AlertConfiguration.objects.get(id=value, user=user)
            return value
        except AlertConfiguration.DoesNotExist:
            raise serializers.ValidationError("Alert configuration not found or access denied.")


class AlertMetricsSerializer(serializers.Serializer):
    """Serializer for alert metrics and statistics"""
    
    total_configurations = serializers.IntegerField(read_only=True)
    enabled_configurations = serializers.IntegerField(read_only=True)
    disabled_configurations = serializers.IntegerField(read_only=True)
    total_executions_today = serializers.IntegerField(read_only=True)
    successful_executions_today = serializers.IntegerField(read_only=True)
    failed_executions_today = serializers.IntegerField(read_only=True)
    most_triggered_alert = serializers.CharField(read_only=True)
    alerts_by_severity = serializers.DictField(read_only=True)
    recent_executions = AlertExecutionSerializer(many=True, read_only=True)
