"""
Management command to track system uptime events.
This command should be run on system startup and shutdown.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models.system import SystemUptimeEvent
import psutil
import time


class Command(BaseCommand):
    help = 'Track system uptime events (startup/shutdown)'

    def add_arguments(self, parser):
        parser.add_argument(
            'event_type',
            choices=['startup', 'shutdown'],
            help='Type of event to record'
        )

    def handle(self, *args, **options):
        event_type = options['event_type']
        
        try:
            if event_type == 'startup':
                # Record startup event with boot time
                boot_time = timezone.datetime.fromtimestamp(
                    psutil.boot_time(), 
                    tz=timezone.get_current_timezone()
                )
                
                event = SystemUptimeEvent.objects.create(
                    event_type='startup',
                    boot_time=boot_time
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully recorded system startup event at {event.timestamp} '
                        f'(boot time: {boot_time})'
                    )
                )
                
            elif event_type == 'shutdown':
                # Record shutdown event
                event = SystemUptimeEvent.objects.create(
                    event_type='shutdown'
                )
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully recorded system shutdown event at {event.timestamp}'
                    )
                )
                
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Error recording {event_type} event: {str(e)}')
            )
            raise
