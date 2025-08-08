"""
System dashboard API views for the everyst API.
Provides additional dashboard data like services, sessions, ports, and API performance.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from api.utils.services import (
    get_running_services,
    get_active_sessions,
    get_api_response_times,
    get_system_ports
)


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
def get_system_ports(request):
    """
    Get information about open/listening ports
    """
    try:
        ports = get_system_ports()
        return Response(ports, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {'error': f'Failed to get system ports: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
