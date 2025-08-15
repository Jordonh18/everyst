"""
GitHub API cache models for the everyst API.
"""
from django.db import models
from django.utils import timezone
from .base import BaseModel


class GitHubAPICache(BaseModel):
    """
    Store GitHub API responses with ETag support for conditional requests
    """
    url = models.URLField(max_length=500, unique=True, help_text="GitHub API URL")
    etag = models.CharField(max_length=100, blank=True, null=True, help_text="ETag from GitHub response")
    last_modified = models.CharField(max_length=100, blank=True, null=True, help_text="Last-Modified header from GitHub")
    response_data = models.JSONField(help_text="Cached response data from GitHub API")
    status_code = models.IntegerField(default=200, help_text="HTTP status code from GitHub")
    cached_at = models.DateTimeField(auto_now=True, help_text="When this cache entry was last updated")
    
    class Meta:
        verbose_name = "GitHub API Cache"
        verbose_name_plural = "GitHub API Cache Entries"
        ordering = ['-cached_at']
    
    def __str__(self):
        return f"Cache for {self.url} (ETag: {self.etag})"
    
    @classmethod
    def get_cache_entry(cls, url):
        """Get cache entry for a URL"""
        try:
            return cls.objects.get(url=url)
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def update_cache(cls, url, etag=None, last_modified=None, response_data=None, status_code=200):
        """Update or create cache entry"""
        cache_entry, created = cls.objects.update_or_create(
            url=url,
            defaults={
                'etag': etag,
                'last_modified': last_modified,
                'response_data': response_data,
                'status_code': status_code,
                'cached_at': timezone.now()
            }
        )
        return cache_entry, created
    
    @classmethod
    def is_cache_valid(cls, url, max_age_minutes=5):
        """
        Check if cache is still valid based on age
        For GitHub releases, we want relatively fresh data but not too frequent requests
        """
        cache_entry = cls.get_cache_entry(url)
        if not cache_entry:
            return False
        
        age = timezone.now() - cache_entry.cached_at
        return age.total_seconds() < (max_age_minutes * 60)
