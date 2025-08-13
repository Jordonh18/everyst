"""
SSH Key models for secure key management and authentication.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, ed25519
from cryptography.hazmat.backends import default_backend
import logging

logger = logging.getLogger(__name__)


class SSHKey(models.Model):
    """
    Model for storing SSH private keys for users.
    Keys are stored temporarily and only in memory during SSH sessions.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ssh_keys')
    name = models.CharField(max_length=255, help_text="Friendly name for this SSH key")
    key_type = models.CharField(
        max_length=50,
        choices=[
            ('rsa', 'RSA'),
            ('ed25519', 'Ed25519'),
            ('ecdsa', 'ECDSA'),
        ],
        default='rsa'
    )
    fingerprint = models.CharField(max_length=255, unique=True, help_text="SSH key fingerprint")
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'user_ssh_keys'
        unique_together = ['user', 'name']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['fingerprint']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.name} ({self.key_type})"
    
    @staticmethod
    def validate_private_key(key_content: str) -> dict:
        """
        Validate an SSH private key and extract metadata.
        Returns key type and fingerprint if valid.
        """
        try:
            # Try to load the private key
            private_key = serialization.load_pem_private_key(
                key_content.encode(),
                password=None,
                backend=default_backend()
            )
            
            # Get public key and fingerprint
            public_key = private_key.public_key()
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.OpenSSH,
                format=serialization.PublicFormat.OpenSSH
            )
            
            # Generate fingerprint (SHA256)
            import hashlib
            import base64
            
            # Remove the key type prefix and decode
            key_data = public_pem.decode().split()[1]
            key_bytes = base64.b64decode(key_data)
            fingerprint = base64.b64encode(hashlib.sha256(key_bytes).digest()).decode().rstrip('=')
            
            # Determine key type
            if isinstance(private_key, rsa.RSAPrivateKey):
                key_type = 'rsa'
            elif isinstance(private_key, ed25519.Ed25519PrivateKey):
                key_type = 'ed25519'
            else:
                key_type = 'ecdsa'  # fallback for other types
            
            return {
                'is_valid': True,
                'key_type': key_type,
                'fingerprint': f"SHA256:{fingerprint}",
                'key_size': getattr(private_key, 'key_size', None)
            }
            
        except Exception as e:
            logger.warning(f"SSH key validation failed: {e}")
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    def clean(self):
        """Validate the model before saving."""
        super().clean()
        
        # Validate that the user has permission to create keys
        if not self.user.is_active:
            raise ValidationError("Cannot create SSH keys for inactive users")


class SSHSession(models.Model):
    """
    Model to track active SSH sessions for auditing and management.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ssh_sessions')
    ssh_key = models.ForeignKey(SSHKey, on_delete=models.CASCADE, null=True, blank=True)
    host = models.CharField(max_length=255, help_text="SSH target host")
    port = models.IntegerField(default=22)
    username = models.CharField(max_length=100, help_text="SSH username")
    session_id = models.CharField(max_length=255, unique=True)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('connecting', 'Connecting'),
            ('active', 'Active'),
            ('disconnected', 'Disconnected'),
            ('failed', 'Failed'),
        ],
        default='connecting'
    )
    
    class Meta:
        db_table = 'ssh_sessions'
        indexes = [
            models.Index(fields=['user', 'started_at']),
            models.Index(fields=['session_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.user.username}@{self.host}:{self.port} ({self.status})"
