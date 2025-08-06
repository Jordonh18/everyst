from django.db import models
from django.utils.translation import gettext_lazy as _
from .base import BaseModel


class UserRole(models.Model):
    """
    Defines roles for users with different permission levels.
    
    Note: This model doesn't inherit from BaseModel as it uses name as primary key.
    """
    OWNER = 'owner'      # System owner/superuser with full access
    ADMIN = 'admin'      # Admin with elevated permissions
    MANAGER = 'manager'  # Manager with some advanced permissions
    USER = 'user'        # Standard user with basic access
    
    ROLE_CHOICES = [
        (OWNER, _('Owner')),
        (ADMIN, _('Administrator')),
        (MANAGER, _('Manager')),
        (USER, _('User')),
    ]
    
    name = models.CharField(max_length=20, choices=ROLE_CHOICES, primary_key=True)
    description = models.CharField(max_length=255)
    priority = models.IntegerField(unique=True, help_text="Lower numbers have higher priority")
    
    # Permissions
    can_manage_users = models.BooleanField(default=False)
    can_manage_system = models.BooleanField(default=False)
    can_manage_network = models.BooleanField(default=False)
    can_view_all_data = models.BooleanField(default=False)
    can_view_logs = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['priority']
    
    def __str__(self):
        return self.get_name_display()
    
    @classmethod
    def create_default_roles(cls):
        """Create the default roles if they don't exist"""
        defaults = [
            {
                'name': cls.OWNER,
                'description': 'System owner with full administrative privileges',
                'priority': 1, 
                'can_manage_users': True,
                'can_manage_system': True,
                'can_manage_network': True,
                'can_view_all_data': True,
                'can_view_logs': True,
            },
            {
                'name': cls.ADMIN,
                'description': 'Administrator with elevated system control',
                'priority': 2,
                'can_manage_users': True,
                'can_manage_system': True,
                'can_manage_network': True,
                'can_view_all_data': True,
                'can_view_logs': True,
            },
            {
                'name': cls.MANAGER,
                'description': 'Manager with limited administrative privileges',
                'priority': 3,
                'can_manage_users': False,
                'can_manage_system': True,
                'can_manage_network': True,
                'can_view_all_data': True,
                'can_view_logs': False,
            },
            {
                'name': cls.USER,
                'description': 'Standard user with basic access',
                'priority': 4,
                'can_manage_users': False,
                'can_manage_system': False,
                'can_manage_network': False,
                'can_view_all_data': False,
                'can_view_logs': False,
            },
        ]
        
        for role_data in defaults:
            cls.objects.get_or_create(name=role_data['name'], defaults=role_data)
