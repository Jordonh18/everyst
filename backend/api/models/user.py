from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _
from .role import UserRole

class UserManager(BaseUserManager):
    """Define a custom user manager to handle email-based authentication"""
    
    def create_user(self, email, password=None, username=None, **extra_fields):
        """Create and save a User with the given email, username, and password."""
        if not email:
            raise ValueError(_('The Email must be set'))
        if not username:
            username = email.split('@')[0]
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        """Create and save a SuperUser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """Custom user model using username as the unique identifier"""
    username = models.CharField(_('username'), max_length=30, unique=True)
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    role = models.ForeignKey(
        UserRole, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='users'
    )
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        ordering = ['username']

    def save(self, *args, **kwargs):
        # Ensure existing users have a username
        if not self.username and self.email:
            # Extract username from email
            self.username = self.email.split('@')[0]
        super().save(*args, **kwargs)
    
    objects = UserManager()
    
    def __str__(self):
        return self.email
