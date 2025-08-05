"""
Custom User model signal handlers for the everyst API.
"""
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(pre_save, sender=User)
def track_password_changes(sender, instance, **kwargs):
    """
    Track password changes for the user
    
    This signal handler will:
    1. Update password_last_changed timestamp when a user's password changes
    2. Add the old password to the user's password history
    """
    # Check if this is a new user
    if instance.pk is None:
        # New user, set password_last_changed to now
        instance.password_last_changed = timezone.now()
        return
        
    # Get the old instance from the database
    try:
        old_instance = User.objects.get(pk=instance.pk)
        
        # Check if the password has changed
        if old_instance.password != instance.password:
            # Update the last changed timestamp
            instance.password_last_changed = timezone.now()
            
            # Reset the is_temporary_password flag if it exists
            if hasattr(instance, 'is_temporary_password'):
                instance.is_temporary_password = False
            
            # If we're tracking password history, add the old password to history
            try:
                from api.models.password_history import PasswordHistory
                PasswordHistory.add_password_to_history(instance, old_instance.password)
            except ImportError:
                # Password history model not available
                pass
                
    except User.DoesNotExist:
        # Should not happen but handle it gracefully
        pass
