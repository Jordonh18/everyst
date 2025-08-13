#!/usr/bin/env python
"""
Quick script to check user permissions for debugging.
"""
import os
import sys
import django

# Add the backend directory to Python path
sys.path.append('/home/jordonharrison/everyst/backend')

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'everyst_api.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.models.role import UserRole

User = get_user_model()

def check_permissions():
    print("=== User Permissions Check ===")
    
    # List all users and their roles
    users = User.objects.all()
    print(f"\nFound {users.count()} users:")
    
    for user in users:
        print(f"\nUser: {user.username} ({user.email})")
        print(f"  - is_staff: {user.is_staff}")
        print(f"  - is_superuser: {user.is_superuser}")
        print(f"  - is_active: {user.is_active}")
        
        if user.role:
            print(f"  - Role: {user.role.name}")
            print(f"  - can_view_logs: {user.role.can_view_logs}")
            print(f"  - can_manage_system: {user.role.can_manage_system}")
            print(f"  - can_manage_users: {user.role.can_manage_users}")
        else:
            print(f"  - Role: None (No role assigned!)")
    
    print("\n=== Available Roles ===")
    roles = UserRole.objects.all()
    for role in roles:
        print(f"\nRole: {role.name}")
        print(f"  - Description: {role.description}")
        print(f"  - Priority: {role.priority}")
        print(f"  - can_view_logs: {role.can_view_logs}")
        print(f"  - can_manage_system: {role.can_manage_system}")
        print(f"  - can_manage_users: {role.can_manage_users}")

if __name__ == '__main__':
    check_permissions()
