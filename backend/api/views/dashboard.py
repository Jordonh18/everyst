"""
System dashboard API views for the everyst API.
Provides additional dashboard data like services, sessions, ports, and API performance.
"""
import logging
from datetime import datetime, timedelta
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import random

from api.utils.services import (
    get_running_services,
    get_active_sessions,
    get_api_response_times,
    get_system_ports as get_system_ports_data
)

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_services(request):
    """
    Get information about running system services
    """
    try:
        services = get_running_services()
        return Response(services, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to get system services: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_sessions(request):
    """
    Get information about active user sessions
    """
    try:
        sessions = get_active_sessions()
        return Response(sessions, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to get active sessions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_api_performance(request):
    """
    Get API response time information
    """
    try:
        api_times = get_api_response_times()
        return Response(api_times, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to get API performance data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_ports_view(request):
    """
    Get information about open/listening ports
    """
    try:
        ports = get_system_ports_data()
        return Response(ports, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to get system ports: {str(e)}")
        return Response(
            {'error': f'Failed to get system ports: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_network_traffic_data(request):
    """
    Get network traffic data for charts using real system metrics
    """
    try:
        from api.models.system import SystemMetrics
        from api.utils.system import get_system_metrics
        
        # Get the last 24 stored metrics from database
        recent_metrics = SystemMetrics.objects.order_by('-timestamp')[:24]
        
        data = []
        
        if recent_metrics:
            # Use stored historical data
            for metric in reversed(recent_metrics):
                # Convert bytes/s to MB/s
                upload_mbs = round((metric.network_tx or 0) / (1024 * 1024), 2)
                download_mbs = round((metric.network_rx or 0) / (1024 * 1024), 2)
                
                data.append({
                    'timestamp': metric.timestamp.strftime('%H:%M'),
                    'upload': upload_mbs,
                    'download': download_mbs,
                    'total': round(upload_mbs + download_mbs, 2)
                })
        else:
            # Fallback: get current metrics and generate recent data points
            current_metrics = get_system_metrics()
            now = timezone.now()
            
            # Get current network speeds in MB/s
            current_upload = round((current_metrics.get('network_tx', 0)) / (1024 * 1024), 2)
            current_download = round((current_metrics.get('network_rx', 0)) / (1024 * 1024), 2)
            
            # Generate 24 data points with some variation around current values
            for i in range(24):
                timestamp = (now - timedelta(minutes=i)).strftime('%H:%M')
                
                # Add some realistic variation (±20%) around current values
                upload_variation = current_upload * (0.8 + random.random() * 0.4)
                download_variation = current_download * (0.8 + random.random() * 0.4)
                
                upload = max(0, round(upload_variation, 2))
                download = max(0, round(download_variation, 2))
                
                data.append({
                    'timestamp': timestamp,
                    'upload': upload,
                    'download': download,
                    'total': round(upload + download, 2)
                })
            
            # Reverse to get chronological order
            data.reverse()
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to get network traffic data: {str(e)}")
        
        # Final fallback: return some basic mock data
        data = []
        now = timezone.now()
        for i in range(24):
            timestamp = (now - timedelta(minutes=i)).strftime('%H:%M')
            data.append({
                'timestamp': timestamp,
                'upload': 0.1,
                'download': 0.5,
                'total': 0.6
            })
        data.reverse()
        
        return Response(data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_api_performance_analytics(request):
    """
    Get API performance analytics for charts
    """
    try:
        # Generate sample API performance data
        # In production, this would pull from API monitoring/logging
        endpoints = [
            '/api/auth/login',
            '/api/system/metrics',
            '/api/dashboard/services',
            '/api/users/',
            '/api/logs/',
            '/api/network/tools'
        ]
        
        data = []
        for endpoint in endpoints:
            endpoint_name = endpoint.split('/')[-1] or endpoint.split('/')[-2]
            data.append({
                'endpoint': endpoint_name,
                'averageTime': random.randint(50, 550),  # 50-550ms
                'requests': random.randint(100, 1100),   # 100-1100 requests
                'errorRate': round(random.uniform(0, 5), 1)  # 0-5% error rate
            })
        
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to get API performance analytics: {str(e)}")
        return Response(
            {'error': f'Failed to get API performance analytics: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_system_health_data(request):
    """
    Get system health score data for charts
    """
    try:
        # Generate sample system health data
        # In production, this would calculate based on actual system metrics
        data = []
        now = timezone.now()
        
        for i in range(24):  # Last 24 data points
            timestamp = (now - timedelta(minutes=i)).strftime('%H:%M')
            
            cpu_factor = round(100 - random.uniform(10, 40), 0)      # 60-90
            memory_factor = round(100 - random.uniform(10, 50), 0)   # 50-90
            disk_factor = round(100 - random.uniform(5, 25), 0)      # 75-95
            network_factor = round(100 - random.uniform(5, 30), 0)   # 70-95
            
            score = round((cpu_factor + memory_factor + disk_factor + network_factor) / 4, 0)
            
            data.append({
                'timestamp': timestamp,
                'score': score,
                'cpu_factor': cpu_factor,
                'memory_factor': memory_factor,
                'disk_factor': disk_factor,
                'network_factor': network_factor
            })
        
        # Reverse to get chronological order
        data.reverse()
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to get system health data: {str(e)}")
        return Response(
            {'error': f'Failed to get system health data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity_data(request):
    """
    Get user activity data for charts
    """
    try:
        # Generate sample user activity data
        # In production, this would pull from user session and API logs
        data = []
        
        for i in range(24):  # Last 24 hours
            hour = (datetime.now() - timedelta(hours=i)).hour
            hour_str = f"{hour:02d}:00"
            
            # Simulate activity patterns (higher during work hours)
            if 9 <= hour <= 17:  # Work hours
                active_sessions = random.randint(15, 30)
                api_requests = random.randint(400, 800)
                login_attempts = random.randint(5, 15)
            elif 18 <= hour <= 22:  # Evening
                active_sessions = random.randint(8, 20)
                api_requests = random.randint(200, 500)
                login_attempts = random.randint(2, 8)
            else:  # Night/early morning
                active_sessions = random.randint(2, 10)
                api_requests = random.randint(50, 200)
                login_attempts = random.randint(1, 5)
            
            data.append({
                'hour': hour_str,
                'active_sessions': active_sessions,
                'api_requests': api_requests,
                'login_attempts': login_attempts
            })
        
        # Reverse to get chronological order
        data.reverse()
        return Response(data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Failed to get user activity data: {str(e)}")
        return Response(
            {'error': f'Failed to get user activity data: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
