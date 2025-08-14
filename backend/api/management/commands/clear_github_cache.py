"""
Management command to clear old GitHub API cache entries
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models.github_cache import GitHubAPICache


class Command(BaseCommand):
    help = 'Clear old GitHub API cache entries older than specified days'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Delete cache entries older than this many days (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        old_entries = GitHubAPICache.objects.filter(cached_at__lt=cutoff_date)
        count = old_entries.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} cache entries older than {days} days'
                )
            )
            for entry in old_entries:
                self.stdout.write(f'  - {entry.url} (cached: {entry.cached_at})')
        else:
            if count > 0:
                old_entries.delete()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully deleted {count} cache entries older than {days} days'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('No old cache entries found to delete')
                )
