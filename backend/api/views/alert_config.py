"""
Enhanced views for alert configuration and notification management.
"""
import json
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Q, Count, Avg
from django.http import JsonResponse
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from api.models.alert_config import (
    AlertConfiguration,
    AlertDeliveryMethod,
    AlertExecution,
    UserNotificationPreferences,
    NotificationHistory
)
from api.models.system import SystemMetrics
from api.serializers.alert_config import (
    AlertConfigurationSerializer,
    AlertDeliveryMethodSerializer,
    AlertExecutionSerializer,
    UserNotificationPreferencesSerializer,
    NotificationHistorySerializer,
    NotificationHistoryBulkActionSerializer,
    AlertTestSerializer,
    AlertMetricsSerializer
)
from api.utils import get_system_metrics


class AlertConfigurationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alert configurations
    """
    serializer_class = AlertConfigurationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter alert configurations to current user"""
        return AlertConfiguration.objects.filter(user=self.request.user).prefetch_related('delivery_methods')
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test an alert configuration by executing the full alert workflow"""
        alert_config = self.get_object()
        serializer = AlertTestSerializer(data=request.data, context={'request': request})
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        test_value = serializer.validated_data.get('test_value')
        delivery_methods = serializer.validated_data.get('delivery_methods')
        
        # Get current metric value if test_value not provided
        if test_value is None:
            current_metrics = get_system_metrics()
            metric_map = {
                'cpu': current_metrics.get('cpu_usage', 0),
                'memory': current_metrics.get('memory_usage', 0),
                'disk': current_metrics.get('disk_usage', 0),
                'network_rx': current_metrics.get('network_rx', 0),
                'network_tx': current_metrics.get('network_tx', 0),
            }
            test_value = metric_map.get(alert_config.metric_type, 0)
        
        # Evaluate alert condition
        condition_met = self._evaluate_condition(alert_config, test_value)
        
        # Create an alert execution record for the test
        alert_execution = AlertExecution.objects.create(
            alert_configuration=alert_config,
            executed_at=timezone.now(),
            status='success' if condition_met else 'throttled',
            metric_value=test_value,
            threshold_value=alert_config.threshold_value,
            delivery_results={}
        )
        
        delivery_results = {}
        
        # If condition is met, execute the full alert workflow
        if condition_met and not alert_config.is_throttled():
            available_methods = alert_config.delivery_methods.filter(enabled=True)
            if delivery_methods:
                available_methods = available_methods.filter(delivery_type__in=delivery_methods)
            
            executed_delivery_methods = []
            
            for method in available_methods:
                try:
                    # Execute actual delivery based on method type
                    if method.delivery_type == 'in_app':
                        # Create in-app notification
                        notification = NotificationHistory.objects.create(
                            user=alert_config.user,
                            title=f"[TEST] Alert: {alert_config.name}",
                            message=f"Test alert triggered: {alert_config.metric_type_display} value {test_value} {alert_config.condition_operator_display} {alert_config.threshold_value}",
                            notification_type='alert',
                            category='alerts',
                            source='alert_test',
                            alert_configuration=alert_config,
                            alert_execution=alert_execution,
                            delivery_methods=[method.delivery_type]
                        )
                        
                        delivery_results[method.delivery_type] = {
                            'status': 'success',
                            'message': 'In-app notification created successfully',
                            'notification_id': str(notification.id),
                            'delivered_at': timezone.now().isoformat()
                        }
                        executed_delivery_methods.append(method.delivery_type)
                        
                    elif method.delivery_type == 'email':
                        # For testing, we'll simulate email delivery
                        # In production, this would send actual emails
                        delivery_results[method.delivery_type] = {
                            'status': 'success',
                            'message': 'Test email would be sent (simulated)',
                            'delivered_at': timezone.now().isoformat(),
                            'recipients': method.configuration.get('recipients', [])
                        }
                        executed_delivery_methods.append(method.delivery_type)
                        
                    elif method.delivery_type in ['teams', 'slack', 'discord', 'webhook']:
                        # For testing, simulate webhook/chat delivery
                        delivery_results[method.delivery_type] = {
                            'status': 'success',
                            'message': f'Test {method.delivery_type} notification would be sent (simulated)',
                            'delivered_at': timezone.now().isoformat(),
                            'webhook_url': method.configuration.get('webhook_url', 'Not configured')
                        }
                        executed_delivery_methods.append(method.delivery_type)
                    
                    else:
                        delivery_results[method.delivery_type] = {
                            'status': 'success',
                            'message': f'Test {method.delivery_type} delivery would be executed (simulated)',
                            'delivered_at': timezone.now().isoformat()
                        }
                        executed_delivery_methods.append(method.delivery_type)
                        
                except Exception as e:
                    delivery_results[method.delivery_type] = {
                        'status': 'failed',
                        'message': str(e),
                        'delivered_at': timezone.now().isoformat()
                    }
            
            # Update the alert execution with delivery results
            alert_execution.delivery_results = delivery_results
            alert_execution.save()
            
            # Update alert's last triggered time since this was a successful test execution
            alert_config.last_triggered = timezone.now()
            alert_config.save(update_fields=['last_triggered'])
        
        return Response({
            'test_value': test_value,
            'threshold_value': alert_config.threshold_value,
            'condition_met': condition_met,
            'condition_description': alert_config.get_condition_display(),
            'delivery_results': delivery_results,
            'would_trigger': condition_met and not alert_config.is_throttled(),
            'alert_execution_id': str(alert_execution.id),
            'executed_at': alert_execution.executed_at.isoformat()
        })
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle alert configuration enabled state"""
        alert_config = self.get_object()
        alert_config.enabled = not alert_config.enabled
        alert_config.save(update_fields=['enabled'])
        
        return Response({
            'id': alert_config.id,
            'enabled': alert_config.enabled,
            'message': f"Alert {'enabled' if alert_config.enabled else 'disabled'} successfully"
        })
    
    @action(detail=False, methods=['post'])
    def bulk_toggle(self, request):
        """Bulk toggle multiple alert configurations"""
        alert_ids = request.data.get('alert_ids', [])
        enable = request.data.get('enable', True)
        
        if not alert_ids:
            return Response(
                {'error': 'alert_ids is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = AlertConfiguration.objects.filter(
            id__in=alert_ids,
            user=request.user
        ).update(enabled=enable)
        
        return Response({
            'updated_count': updated_count,
            'enabled': enable,
            'message': f"{'Enabled' if enable else 'Disabled'} {updated_count} alerts"
        })
    
    @action(detail=False)
    def metrics(self, request):
        """Get alert metrics and statistics"""
        user = request.user
        today = timezone.now().date()
        
        # Basic counts
        total_configs = AlertConfiguration.objects.filter(user=user).count()
        enabled_configs = AlertConfiguration.objects.filter(user=user, enabled=True).count()
        disabled_configs = total_configs - enabled_configs
        
        # Execution metrics for today
        today_executions = AlertExecution.objects.filter(
            alert_configuration__user=user,
            executed_at__date=today
        )
        
        total_executions_today = today_executions.count()
        successful_executions_today = today_executions.filter(status='success').count()
        failed_executions_today = today_executions.filter(status='failed').count()
        
        # Most triggered alert
        most_triggered = AlertConfiguration.objects.filter(
            user=user,
            executions__executed_at__gte=timezone.now() - timedelta(days=7)
        ).annotate(
            execution_count=Count('executions')
        ).order_by('-execution_count').first()
        
        most_triggered_name = most_triggered.name if most_triggered else None
        
        # Alerts by severity
        alerts_by_severity = dict(
            AlertConfiguration.objects.filter(user=user)
            .values('severity')
            .annotate(count=Count('id'))
            .values_list('severity', 'count')
        )
        
        # Recent executions
        recent_executions = AlertExecution.objects.filter(
            alert_configuration__user=user
        ).order_by('-executed_at')[:10]
        
        metrics_data = {
            'total_configurations': total_configs,
            'enabled_configurations': enabled_configs,
            'disabled_configurations': disabled_configs,
            'total_executions_today': total_executions_today,
            'successful_executions_today': successful_executions_today,
            'failed_executions_today': failed_executions_today,
            'most_triggered_alert': most_triggered_name,
            'alerts_by_severity': alerts_by_severity,
            'recent_executions': recent_executions
        }
        
        serializer = AlertMetricsSerializer(metrics_data)
        return Response(serializer.data)
    
    def _evaluate_condition(self, alert_config, metric_value):
        """Evaluate if a condition is met"""
        threshold = alert_config.threshold_value
        operator = alert_config.condition_operator
        
        if operator == 'gt':
            return metric_value > threshold
        elif operator == 'gte':
            return metric_value >= threshold
        elif operator == 'lt':
            return metric_value < threshold
        elif operator == 'lte':
            return metric_value <= threshold
        elif operator == 'eq':
            return metric_value == threshold
        elif operator == 'ne':
            return metric_value != threshold
        
        return False


class AlertDeliveryMethodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing alert delivery methods
    """
    serializer_class = AlertDeliveryMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter delivery methods to current user's alert configurations"""
        return AlertDeliveryMethod.objects.filter(
            alert_configuration__user=self.request.user
        ).select_related('alert_configuration')
    
    def perform_create(self, serializer):
        """Ensure delivery method belongs to user's alert configuration"""
        alert_config_id = self.request.data.get('alert_configuration')
        try:
            alert_config = AlertConfiguration.objects.get(
                id=alert_config_id,
                user=self.request.user
            )
            serializer.save(alert_configuration=alert_config)
        except AlertConfiguration.DoesNotExist:
            raise permissions.PermissionDenied("Alert configuration not found or access denied")


class AlertExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing alert executions (read-only)
    """
    serializer_class = AlertExecutionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter executions to current user's alert configurations"""
        return AlertExecution.objects.filter(
            alert_configuration__user=self.request.user
        ).select_related('alert_configuration').order_by('-executed_at')


class UserNotificationPreferencesViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing user notification preferences
    """
    serializer_class = UserNotificationPreferencesSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return preferences for current user only"""
        return UserNotificationPreferences.objects.filter(user=self.request.user)
    
    def get_object(self):
        """Get or create notification preferences for current user"""
        preferences, created = UserNotificationPreferences.objects.get_or_create(
            user=self.request.user
        )
        return preferences
    
    def list(self, request):
        """Return single preferences object instead of list"""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences)
        return Response(serializer.data)
    
    def create(self, request):
        """Override create to use get_or_create behavior"""
        preferences = self.get_object()
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notification history
    """
    serializer_class = NotificationHistorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter notifications to current user"""
        queryset = NotificationHistory.objects.filter(user=self.request.user)
        
        # Filter by read status
        read_status = self.request.query_params.get('read')
        if read_status is not None:
            queryset = queryset.filter(read=read_status.lower() == 'true')
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by notification type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by date range
        since = self.request.query_params.get('since')
        if since:
            try:
                since_date = datetime.fromisoformat(since.replace('Z', '+00:00'))
                queryset = queryset.filter(delivered_at__gte=since_date)
            except ValueError:
                pass
        
        # Search in title and message
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(message__icontains=search)
            )
        
        return queryset.select_related('alert_configuration').order_by('-delivered_at')
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({
            'id': notification.id,
            'read': notification.read,
            'read_at': notification.read_at
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        updated_count = NotificationHistory.objects.filter(
            user=request.user,
            read=False
        ).update(read=True, read_at=timezone.now())
        
        return Response({
            'updated_count': updated_count,
            'message': f"Marked {updated_count} notifications as read"
        })
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform bulk actions on notifications"""
        serializer = NotificationHistoryBulkActionSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        action_type = serializer.validated_data['action']
        notification_ids = serializer.validated_data['notification_ids']
        
        queryset = NotificationHistory.objects.filter(
            id__in=notification_ids,
            user=request.user
        )
        
        if action_type == 'mark_read':
            updated_count = queryset.update(read=True, read_at=timezone.now())
            message = f"Marked {updated_count} notifications as read"
        elif action_type == 'mark_unread':
            updated_count = queryset.update(read=False, read_at=None)
            message = f"Marked {updated_count} notifications as unread"
        elif action_type == 'delete':
            deleted_count, _ = queryset.delete()
            updated_count = deleted_count
            message = f"Deleted {deleted_count} notifications"
        
        return Response({
            'action': action_type,
            'updated_count': updated_count,
            'message': message
        })
    
    @action(detail=False)
    def stats(self, request):
        """Get notification statistics for current user"""
        user = request.user
        
        total_count = NotificationHistory.objects.filter(user=user).count()
        unread_count = NotificationHistory.objects.filter(user=user, read=False).count()
        read_count = total_count - unread_count
        
        # Notifications by type
        by_type = dict(
            NotificationHistory.objects.filter(user=user)
            .values('notification_type')
            .annotate(count=Count('id'))
            .values_list('notification_type', 'count')
        )
        
        # Notifications by category
        by_category = dict(
            NotificationHistory.objects.filter(user=user)
            .exclude(category='')
            .values('category')
            .annotate(count=Count('id'))
            .values_list('category', 'count')
        )
        
        # Recent activity (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_count = NotificationHistory.objects.filter(
            user=user,
            delivered_at__gte=week_ago
        ).count()
        
        return Response({
            'total_count': total_count,
            'unread_count': unread_count,
            'read_count': read_count,
            'by_type': by_type,
            'by_category': by_category,
            'recent_count': recent_count
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_metrics(request):
    """Get list of available metrics for alert configuration"""
    
    # Get recent system metrics to show available fields
    recent_metrics = SystemMetrics.objects.first()
    
    available_metrics = [
        {
            'key': 'cpu',
            'name': 'CPU Usage',
            'description': 'CPU usage percentage',
            'unit': '%',
            'current_value': recent_metrics.cpu_usage if recent_metrics else None
        },
        {
            'key': 'memory',
            'name': 'Memory Usage', 
            'description': 'Memory usage percentage',
            'unit': '%',
            'current_value': recent_metrics.memory_usage if recent_metrics else None
        },
        {
            'key': 'disk',
            'name': 'Disk Usage',
            'description': 'Disk usage percentage', 
            'unit': '%',
            'current_value': recent_metrics.disk_usage if recent_metrics else None
        },
        {
            'key': 'network_rx',
            'name': 'Network Received',
            'description': 'Network bytes received per second',
            'unit': 'bytes/s',
            'current_value': recent_metrics.network_rx if recent_metrics else None
        },
        {
            'key': 'network_tx',
            'name': 'Network Transmitted',
            'description': 'Network bytes transmitted per second',
            'unit': 'bytes/s', 
            'current_value': recent_metrics.network_tx if recent_metrics else None
        },
        {
            'key': 'custom',
            'name': 'Custom Metric',
            'description': 'User-defined custom metric',
            'unit': 'custom',
            'current_value': None
        }
    ]
    
    return Response(available_metrics)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_delivery_options(request):
    """Get available delivery method options"""
    
    # In a real implementation, this would check which integrations are configured
    delivery_options = [
        {
            'key': 'in_app',
            'name': 'In-App Notification',
            'description': 'Show notifications in the application',
            'available': True,
            'configuration_required': False,
            'configuration_fields': []
        },
        {
            'key': 'email',
            'name': 'Email',
            'description': 'Send email notifications',
            'available': True,  # Would check SMTP configuration
            'configuration_required': True,
            'configuration_fields': [
                {'key': 'recipients', 'name': 'Email Recipients', 'type': 'email_list', 'required': True}
            ]
        },
        {
            'key': 'teams',
            'name': 'Microsoft Teams',
            'description': 'Send to Teams channel',
            'available': False,  # Would check Teams integration
            'configuration_required': True,
            'configuration_fields': [
                {'key': 'webhook_url', 'name': 'Webhook URL', 'type': 'url', 'required': True},
                {'key': 'channel', 'name': 'Channel Name', 'type': 'text', 'required': False}
            ]
        },
        {
            'key': 'slack',
            'name': 'Slack',
            'description': 'Send to Slack channel',
            'available': False,  # Would check Slack integration
            'configuration_required': True,
            'configuration_fields': [
                {'key': 'webhook_url', 'name': 'Webhook URL', 'type': 'url', 'required': True},
                {'key': 'channel', 'name': 'Channel', 'type': 'text', 'required': True}
            ]
        },
        {
            'key': 'webhook',
            'name': 'Custom Webhook',
            'description': 'Send to custom webhook endpoint',
            'available': True,
            'configuration_required': True,
            'configuration_fields': [
                {'key': 'url', 'name': 'Webhook URL', 'type': 'url', 'required': True},
                {'key': 'method', 'name': 'HTTP Method', 'type': 'select', 'options': ['POST', 'PUT'], 'required': True},
                {'key': 'headers', 'name': 'Custom Headers', 'type': 'json', 'required': False}
            ]
        }
    ]
    
    return Response(delivery_options)
