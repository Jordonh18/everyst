# Generated migration to fix can_view_logs default values

from django.db import migrations


def set_default_log_permissions(apps, schema_editor):
    """Set proper default values for can_view_logs field"""
    UserRole = apps.get_model('api', 'UserRole')
    
    # Set can_view_logs = True for owner and admin roles
    UserRole.objects.filter(name='owner').update(can_view_logs=True)
    UserRole.objects.filter(name='admin').update(can_view_logs=True)
    
    # Manager and user should remain False (already set by default)


def reverse_log_permissions(apps, schema_editor):
    """Reverse the operation by setting all to False"""
    UserRole = apps.get_model('api', 'UserRole')
    UserRole.objects.all().update(can_view_logs=False)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_alter_usersslcertificate_unique_together_and_more'),
    ]

    operations = [
        migrations.RunPython(
            set_default_log_permissions,
            reverse_log_permissions,
        ),
    ]
