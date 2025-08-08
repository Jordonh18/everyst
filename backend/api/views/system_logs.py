"""
System log monitoring API views.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import logging

from api.services.system_logs import SystemLogManager
from api.permissions import CanViewLogs

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewLogs])
def list_system_logs(request):
    """
    List all available system logs with metadata.
    """
    try:
        # Check if user has permission to view logs
        if not hasattr(request.user, 'role') or not getattr(request.user.role, 'can_view_logs', False):
            return Response(
                {"detail": "You don't have permission to view system logs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        log_manager = SystemLogManager()
        available_logs = log_manager.get_available_logs()
        
        return Response(available_logs, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error listing system logs: {e}")
        return Response(
            {"detail": "Failed to retrieve system logs list."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewLogs])
def read_system_log(request, log_name):
    """
    Read content from a specific system log file.
    
    Query parameters:
    - lines: Number of lines to return (default: 100)
    - search: Search term to filter lines
    - level: Log level filter (ERROR, WARN, INFO, DEBUG)
    - start_date: Start date filter (ISO format)
    - end_date: End date filter (ISO format)
    """
    try:
        # Check if user has permission to view logs
        if not hasattr(request.user, 'role') or not getattr(request.user.role, 'can_view_logs', False):
            return Response(
                {"detail": "You don't have permission to view system logs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get query parameters
        lines = int(request.GET.get('lines', 100))
        search_term = request.GET.get('search', '')
        log_level = request.GET.get('level', '')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        # Validate lines parameter
        if lines > 1000:  # Limit to prevent performance issues
            lines = 1000
        elif lines < 1:
            lines = 100
        
        log_manager = SystemLogManager()
        log_data = log_manager.read_log_file(
            log_name=log_name,
            lines=lines,
            search_term=search_term,
            log_level=log_level,
            start_date=start_date,
            end_date=end_date
        )
        
        return Response(log_data, status=status.HTTP_200_OK)
    
    except ValueError as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error reading system log {log_name}: {e}")
        return Response(
            {"detail": f"Failed to read system log: {log_name}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewLogs])
def system_log_statistics(request, log_name):
    """
    Get statistics for a specific system log.
    
    Query parameters:
    - hours: Time period in hours for statistics (default: 24)
    """
    try:
        # Check if user has permission to view logs
        if not hasattr(request.user, 'role') or not getattr(request.user.role, 'can_view_logs', False):
            return Response(
                {"detail": "You don't have permission to view system logs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        hours = int(request.GET.get('hours', 24))
        if hours > 168:  # Limit to 1 week
            hours = 168
        elif hours < 1:
            hours = 24
        
        log_manager = SystemLogManager()
        statistics = log_manager.get_log_statistics(log_name, hours)
        
        return Response(statistics, status=status.HTTP_200_OK)
    
    except ValueError as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Error getting statistics for system log {log_name}: {e}")
        return Response(
            {"detail": f"Failed to get statistics for system log: {log_name}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewLogs])
def system_logs_dashboard(request):
    """
    Get dashboard data for all system logs including basic statistics.
    """
    try:
        # Check if user has permission to view logs
        if not hasattr(request.user, 'role') or not getattr(request.user.role, 'can_view_logs', False):
            return Response(
                {"detail": "You don't have permission to view system logs."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        log_manager = SystemLogManager()
        available_logs = log_manager.get_available_logs()
        
        # Get basic statistics for each log
        dashboard_data = {
            'distribution': available_logs['distribution'],
            'logs': {},
            'summary': {
                'total_logs': len(available_logs['logs']),
                'categories': {}
            }
        }
        
        category_counts = {}
        for log_name, log_info in available_logs['logs'].items():
            try:
                # Get basic stats for each log (limit to 1 hour for dashboard)
                stats = log_manager.get_log_statistics(log_name, hours=1)
                dashboard_data['logs'][log_name] = {
                    'info': log_info,
                    'stats': stats
                }
                
                # Count categories
                category = log_info.get('category', 'unknown')
                category_counts[category] = category_counts.get(category, 0) + 1
                
            except Exception as e:
                logger.warning(f"Could not get statistics for {log_name}: {e}")
                dashboard_data['logs'][log_name] = {
                    'info': log_info,
                    'stats': None
                }
        
        dashboard_data['summary']['categories'] = category_counts
        
        return Response(dashboard_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        logger.error(f"Error generating system logs dashboard: {e}")
        return Response(
            {"detail": "Failed to generate system logs dashboard."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
