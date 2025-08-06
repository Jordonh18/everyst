"""
Activity log views for the everyst API.
"""
from django.utils import timezone
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from api.models.activity import ApplicationLog
from api.serializers.activity import ApplicationLogSerializer
from api.permissions import CanViewLogs

class ApplicationLogViewSet(viewsets.ModelViewSet):
    """
    API endpoint for accessing application logs.
    """
    queryset = ApplicationLog.objects.all().order_by('-timestamp')
    serializer_class = ApplicationLogSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewLogs]
    filter_backends = [filters.SearchFilter]
    search_fields = ['user__username', 'action', 'category', 'ip_address', 'details']
    
    def get_permissions(self):
        """
        Override permissions for different actions
        """
        if self.action == 'purge':
            # Purge requires admin permissions
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Prevent normal CRUD operations on logs
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        else:
            # Read operations use the default CanViewLogs permission
            return [permissions.IsAuthenticated(), CanViewLogs()]
    
    def create(self, request, *args, **kwargs):
        """Prevent creation of logs via API"""
        return Response(
            {"detail": "Creating logs via API is not allowed"},
            status=405
        )
    
    def update(self, request, *args, **kwargs):
        """Prevent updating logs via API"""
        return Response(
            {"detail": "Updating logs via API is not allowed"},
            status=405
        )
    
    def partial_update(self, request, *args, **kwargs):
        """Prevent partial updating logs via API"""
        return Response(
            {"detail": "Updating logs via API is not allowed"},
            status=405
        )
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deleting individual logs via API"""
        return Response(
            {"detail": "Deleting individual logs via API is not allowed. Use purge action instead."},
            status=405
        )
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Get query parameters
        username = self.request.query_params.get('username')
        category = self.request.query_params.get('category')
        action = self.request.query_params.get('action')
        days = self.request.query_params.get('days')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        severity = self.request.query_params.get('severity')
        ip_address = self.request.query_params.get('ip_address')
        
        # Apply filters based on query parameters
        if username:
            queryset = queryset.filter(user__username=username)
        
        if category:
            queryset = queryset.filter(category=category)
            
        if action:
            queryset = queryset.filter(action=action)
        
        if severity:
            queryset = queryset.filter(severity=severity)
            
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)
        
        # Filter by date range
        if start_date:
            try:
                start_date = timezone.datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__gte=start_date)
            except (ValueError, TypeError):
                pass
        
        if end_date:
            try:
                end_date = timezone.datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                queryset = queryset.filter(timestamp__lte=end_date)
            except (ValueError, TypeError):
                pass
        
        # Filter by days (last X days)
        if days:
            try:
                days_ago = timezone.now() - timezone.timedelta(days=int(days))
                queryset = queryset.filter(timestamp__gte=days_ago)
            except ValueError:
                pass  # Ignore invalid days parameter
                
        return queryset
        
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Return the list of available log categories"""
        categories = ApplicationLog.CATEGORY_CHOICES
        return Response(dict(categories))
    
    @action(detail=False, methods=['get'])
    def actions(self, request):
        """Return the list of available action types"""
        actions = ApplicationLog.ACTION_TYPES
        return Response(dict(actions))

    @action(detail=False, methods=['post'])
    def purge(self, request):
        """Purge ALL logs"""
        # Additional role-based permission check (beyond IsAdminUser from get_permissions)
        if hasattr(request.user, 'role') and request.user.role:
            if request.user.role.name not in ['admin', 'owner']:
                return Response(
                    {"detail": "Only admin or owner roles can purge logs"},
                    status=403
                )
        elif not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"detail": "Admin permissions required to purge logs"},
                status=403
            )
        
        # Delete ALL logs
        deleted_count, _ = ApplicationLog.objects.all().delete()
        
        # Log the purge action (create a new log entry after purging)
        ApplicationLog.log_activity(
            user=request.user,
            action='admin_action',
            category='admin',
            severity='info',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            object_type='system',
            details={
                'message': f'Admin {request.user.username} purged all {deleted_count} log entries'
            }
        )
        
        return Response({
            "message": f"Successfully purged all {deleted_count} log entries",
            "deleted_count": deleted_count
        })
