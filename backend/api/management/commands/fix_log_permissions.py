from django.core.management.base import BaseCommand
from api.models.role import UserRole


class Command(BaseCommand):
    help = 'Fix can_view_logs permissions for existing roles'

    def handle(self, *args, **options):
        self.stdout.write('Fixing can_view_logs permissions...')
        
        # Update owner role
        try:
            owner_role = UserRole.objects.get(name='owner')
            owner_role.can_view_logs = True
            owner_role.save()
            self.stdout.write(
                self.style.SUCCESS(f'Updated owner role: can_view_logs = {owner_role.can_view_logs}')
            )
        except UserRole.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Owner role not found')
            )
        
        # Update admin role
        try:
            admin_role = UserRole.objects.get(name='admin')
            admin_role.can_view_logs = True
            admin_role.save()
            self.stdout.write(
                self.style.SUCCESS(f'Updated admin role: can_view_logs = {admin_role.can_view_logs}')
            )
        except UserRole.DoesNotExist:
            self.stdout.write(
                self.style.WARNING('Admin role not found')
            )
        
        # Manager and user should remain False (as per default)
        self.stdout.write(
            self.style.SUCCESS('Successfully updated role permissions!')
        )
