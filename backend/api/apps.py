from django.apps import AppConfig
import logging
from django.utils import timezone
from datetime import timedelta
import threading
import atexit

logger = logging.getLogger('scan_monitor')

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    verbose_name = 'everyst API'
    
    def ready(self):
        """
        Function called when Django starts the application.
        Clean up any stale in-progress scans here and track system startup.
        
        Since this might be called in an async context with ASGI,
        we use a background thread to handle database operations.
        """
        # Import signals
        import api.signals
        
        # Check if this is the main process (not a reloader)
        import sys
        if 'runserver' not in sys.argv and 'uvicorn' not in sys.argv[0]:
            # Start the cleanup in a separate thread to avoid async context issues
            thread = threading.Thread(target=self._startup_tasks, daemon=True)
            thread.start()
    
    def _startup_tasks(self):
        """Run startup tasks in a separate thread to avoid async context issues"""
        try:
            # Delay slightly to ensure Django is fully set up
            import time
            time.sleep(1)
            
            # Run scan cleanup
            self._cleanup_stale_scans()
            
            # Track system startup
            self._track_system_startup()
            
            # Register shutdown handler
            atexit.register(self._track_system_shutdown)
            
        except Exception as e:
            logger.error(f"Error during startup tasks: {e}")
    
    def _track_system_startup(self):
        """Track system startup event"""
        try:
            from .models.system import SystemUptimeEvent
            from django.utils import timezone
            import psutil
            
            # Check if we already have a recent startup event (within last 5 minutes)
            # to avoid duplicates in case of app restarts
            recent_startup = SystemUptimeEvent.objects.filter(
                event_type='startup',
                timestamp__gte=timezone.now() - timezone.timedelta(minutes=5)
            ).first()
            
            if not recent_startup:
                boot_time = timezone.datetime.fromtimestamp(
                    psutil.boot_time(), 
                    tz=timezone.get_current_timezone()
                )
                
                SystemUptimeEvent.objects.create(
                    event_type='startup',
                    boot_time=boot_time
                )
                
                logger.info(f"System startup event recorded at {timezone.now()}")
            else:
                logger.info("Recent startup event already exists, skipping duplicate")
                
        except Exception as e:
            logger.error(f"Failed to record system startup event: {e}")
    
    def _track_system_shutdown(self):
        """Track system shutdown event"""
        try:
            from .models.system import SystemUptimeEvent
            from django.utils import timezone
            
            SystemUptimeEvent.objects.create(event_type='shutdown')
            logger.info(f"System shutdown event recorded at {timezone.now()}")
                
        except Exception as e:
            logger.error(f"Failed to record system shutdown event: {e}")
    
    def _cleanup_stale_scans(self):
        """Run scan cleanup in a separate thread to avoid async context issues"""
        try:
            # Delay slightly to ensure Django is fully set up
            import time
            time.sleep(1)
            
            # Import these here to avoid circular imports
            from .models import NetworkScan
            
            # Find any scans that were left in-progress
            stale_scans = NetworkScan.objects.filter(status='in-progress')
            count = stale_scans.count()
            
            if count > 0:
                logger.info(f"Found {count} stale in-progress network scans. Marking as failed.")
                now = timezone.now()
                
                for scan in stale_scans:
                    scan.status = 'failed'
                    scan.error_message = 'Application restarted while scan was in progress'
                    
                    # If scan has no duration yet, estimate it based on timestamp
                    if not scan.duration:
                        # Calculate an estimated duration up to server restart
                        estimated_duration = min(
                            (now - scan.timestamp).total_seconds(),
                            3600  # Cap at 1 hour maximum
                        )
                        scan.duration = estimated_duration
                    
                    scan.save()
                    logger.info(f"Marked scan {scan.id} as failed (started {scan.timestamp})")
            else:
                logger.info("No stale in-progress scans found at startup")
                
        except Exception as e:
            logger.error(f"Error cleaning up stale network scans: {e}")
