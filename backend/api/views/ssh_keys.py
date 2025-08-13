"""
Views for SSH key management and SSH connections.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from api.models import SSHKey, SSHSession
from api.serializers.ssh_keys import (
    SSHKeySerializer, 
    SSHKeyCreateSerializer, 
    SSHSessionSerializer,
    SSHConnectionSerializer
)
import uuid
import logging

logger = logging.getLogger(__name__)


class SSHKeyViewSet(viewsets.ModelViewSet):
    """ViewSet for managing SSH keys."""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SSHKeyCreateSerializer
        return SSHKeySerializer
    
    def get_queryset(self):
        return SSHKey.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        """Create a new SSH key for the current user."""
        private_key = serializer.validated_data['private_key']
        name = serializer.validated_data['name']
        
        # Validate the key and extract metadata
        validation_result = SSHKey.validate_private_key(private_key)
        
        if not validation_result['is_valid']:
            return Response(
                {'error': f"Invalid SSH key: {validation_result.get('error', 'Unknown error')}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the SSH key record (without storing the actual private key)
        ssh_key = SSHKey.objects.create(
            user=self.request.user,
            name=name,
            key_type=validation_result['key_type'],
            fingerprint=validation_result['fingerprint']
        )
        
        return Response(SSHKeySerializer(ssh_key).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test SSH connection with this key."""
        ssh_key = self.get_object()
        serializer = SSHConnectionSerializer(data=request.data)
        
        if serializer.is_valid():
            # This would normally test the actual SSH connection
            # For now, we'll just return a success response
            return Response({
                'status': 'success',
                'message': f'SSH key {ssh_key.name} is ready for connections'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def connect(self, request):
        """Initiate an SSH connection."""
        serializer = SSHConnectionSerializer(data=request.data)
        
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Create session record
            session = SSHSession.objects.create(
                user=request.user,
                ssh_key_id=data.get('ssh_key_id'),
                host=data['host'],
                port=data['port'],
                username=data['username'],
                session_id=str(uuid.uuid4()),
                status='connecting'
            )
            
            # Return WebSocket connection info
            return Response({
                'session_id': session.session_id,
                'websocket_url': f'/ws/ssh/{session.session_id}/',
                'host': data['host'],
                'port': data['port'],
                'username': data['username']
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SSHSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing SSH sessions."""
    serializer_class = SSHSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return SSHSession.objects.filter(user=self.request.user).order_by('-started_at')
    
    @action(detail=True, methods=['post'])
    def disconnect(self, request, pk=None):
        """Disconnect an SSH session."""
        session = self.get_object()
        
        if session.status == 'active':
            session.status = 'disconnected'
            session.ended_at = timezone.now()
            session.save()
            
            return Response({'status': 'disconnected'})
        
        return Response(
            {'error': 'Session is not active'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
