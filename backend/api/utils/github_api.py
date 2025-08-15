"""
GitHub API utilities with ETag and conditional request support for rate limiting prevention
"""
import requests
import logging
from typing import Optional, Tuple, Dict, Any
from django.utils import timezone

from api.models.github_cache import GitHubAPICache

logger = logging.getLogger(__name__)


class GitHubAPIClient:
    """
    GitHub API client with ETag and conditional request support
    """
    
    def __init__(self, base_url: str = "https://api.github.com"):
        self.base_url = base_url
        self.timeout = 10
    
    def make_conditional_request(self, 
                               url: str, 
                               force_refresh: bool = False,
                               max_cache_age_minutes: int = 5) -> Tuple[Dict[Any, Any], bool]:
        """
        Make a conditional request to GitHub API using ETag/If-None-Match
        
        Args:
            url: The GitHub API URL to request
            force_refresh: If True, ignore cache and force a fresh request
            max_cache_age_minutes: Maximum age of cache before forcing refresh
            
        Returns:
            Tuple of (response_data, is_fresh_data)
            - response_data: The API response data
            - is_fresh_data: True if data was fetched from API, False if from cache
        """
        # Check if we have a valid cache entry
        cache_entry = GitHubAPICache.get_cache_entry(url)
        
        # If we have cache and it's not too old, check if we should use it
        use_cache_without_request = (
            cache_entry and 
            not force_refresh and 
            GitHubAPICache.is_cache_valid(url, max_cache_age_minutes)
        )
        
        if use_cache_without_request:
            logger.info(f"Using cached data for {url} (cached {cache_entry.cached_at})")
            return cache_entry.response_data, False
        
        # Prepare headers for conditional request
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'everyst-update-manager/1.0'
        }
        
        # Add conditional headers if we have cache
        if cache_entry and not force_refresh:
            if cache_entry.etag:
                headers['If-None-Match'] = cache_entry.etag
            elif cache_entry.last_modified:
                headers['If-Modified-Since'] = cache_entry.last_modified
                
        try:
            logger.info(f"Making {'conditional ' if cache_entry else ''}request to {url}")
            response = requests.get(url, headers=headers, timeout=self.timeout)
            
            # Handle 304 Not Modified - data hasn't changed
            if response.status_code == 304:
                if cache_entry:
                    logger.info(f"GitHub returned 304 Not Modified for {url}, using cached data")
                    # Update the cached_at timestamp to extend cache validity
                    cache_entry.cached_at = timezone.now()
                    cache_entry.save()
                    return cache_entry.response_data, False
                else:
                    # This shouldn't happen, but handle gracefully
                    logger.warning(f"Got 304 but no cache entry exists for {url}")
                    raise requests.RequestException("Got 304 but no cache exists")
            
            # Handle successful response
            response.raise_for_status()
            
            # Parse response data
            response_data = response.json()
            
            # Extract caching headers
            etag = response.headers.get('ETag')
            last_modified = response.headers.get('Last-Modified')
            
            # Update cache
            GitHubAPICache.update_cache(
                url=url,
                etag=etag,
                last_modified=last_modified,
                response_data=response_data,
                status_code=response.status_code
            )
            
            logger.info(f"Successfully fetched and cached data for {url} (ETag: {etag})")
            return response_data, True
            
        except requests.RequestException as e:
            logger.error(f"Request to {url} failed: {str(e)}")
            
            # If we have cache, return it as fallback
            if cache_entry:
                logger.info(f"Using cached data as fallback for {url}")
                return cache_entry.response_data, False
            
            # Re-raise if no cache available
            raise
    
    def get_releases(self, 
                    owner: str, 
                    repo: str, 
                    force_refresh: bool = False,
                    max_cache_age_minutes: int = 5) -> Tuple[list, bool]:
        """
        Get releases for a repository with caching
        
        Args:
            owner: Repository owner
            repo: Repository name
            force_refresh: Force refresh ignoring cache
            max_cache_age_minutes: Maximum cache age before refresh
            
        Returns:
            Tuple of (releases_list, is_fresh_data)
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/releases"
        data, is_fresh = self.make_conditional_request(
            url=url,
            force_refresh=force_refresh,
            max_cache_age_minutes=max_cache_age_minutes
        )
        return data, is_fresh
    
    def get_latest_release(self, 
                          owner: str, 
                          repo: str, 
                          force_refresh: bool = False,
                          max_cache_age_minutes: int = 5) -> Tuple[dict, bool]:
        """
        Get latest release for a repository with caching
        
        Args:
            owner: Repository owner
            repo: Repository name
            force_refresh: Force refresh ignoring cache
            max_cache_age_minutes: Maximum cache age before refresh
            
        Returns:
            Tuple of (release_data, is_fresh_data)
        """
        url = f"{self.base_url}/repos/{owner}/{repo}/releases/latest"
        data, is_fresh = self.make_conditional_request(
            url=url,
            force_refresh=force_refresh,
            max_cache_age_minutes=max_cache_age_minutes
        )
        return data, is_fresh


# Default client instance
github_client = GitHubAPIClient()
