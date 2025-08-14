"""
System metrics broadcasting module.

This module handles collecting and broadcasting system metrics to clients
via Socket.IO, including memory usage alerts.
"""

import asyncio
import logging
import time
import os
from typing import Dict, Any, Optional
from django.utils import timezone
from django.db import close_old_connections
from asgiref.sync import sync_to_async
from api.utils import get_system_metrics
from api.models.notification import Notification
from .server import sio, should_run, connected_clients

# Get DEBUG_MODE from environment
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'False').lower() in ('true', '1', 'yes')

# Set up logging
logger = logging.getLogger('socket_server.metrics')
# DEBUG_MODE directly controls whether detailed metrics logs are shown
if DEBUG_MODE:
    logger.setLevel(logging.DEBUG)
else:
    logger.setLevel(logging.WARNING)

# Memory alert configuration
MEMORY_ALERT_THRESHOLD = 90  # Alert when memory usage is above 90%
MEMORY_ALERT_COOLDOWN = 300  # Don't send more than one alert every 5 minutes (300 seconds)
last_memory_alert_time = 0
memory_alert_active = False
broadcast_counter = 0  # Counter for reducing log frequency


async def broadcast_metrics() -> None:
    """
    Continuously collect and broadcast system metrics to all connected clients.
    
    This coroutine runs indefinitely and broadcasts metrics at regular intervals.
    It also generates notifications for high memory usage.
    """
    global last_memory_alert_time, memory_alert_active, broadcast_counter
    
    logger.info("Starting metrics broadcast loop")
    
    while should_run:
        try:
            # Get system metrics
            metrics = get_system_metrics()
            
            # Check if we need to send metrics (only if clients are connected)
            if connected_clients:
                # Add a debug identifier so we can see if metrics are coming from the new refactored code
                metrics['source'] = 'refactored_metrics_module'
                
                # Store the current client count to check for changes
                client_count = len(connected_clients)
                
                # Track client count changes for logging purposes
                if not hasattr(broadcast_metrics, 'last_client_count'):
                    broadcast_metrics.last_client_count = client_count
                
                # Only log in these cases:
                # 1. Once every 30 broadcasts
                # 2. When the function first starts running
                # 3. When the number of connected clients changes
                broadcast_counter += 1
                if (broadcast_counter % 30 == 0 or 
                    broadcast_counter == 1 or 
                    client_count != broadcast_metrics.last_client_count):
                    logger.info(f"Broadcasting metrics to {client_count} connected clients")
                
                # Update the last client count
                broadcast_metrics.last_client_count = client_count
                
                # Broadcast to all connected clients
                await sio.emit('metrics_update', metrics)
            
            # Check for high memory usage
            memory_usage = metrics.get('memory_usage', 0)
            current_time = time.time()
            
            if memory_usage >= MEMORY_ALERT_THRESHOLD:
                # Send alert if we haven't sent one recently and we aren't in alert state
                if (not memory_alert_active and 
                    current_time - last_memory_alert_time > MEMORY_ALERT_COOLDOWN):
                    memory_alert_active = True
                    last_memory_alert_time = current_time
                    
                    logger.warning(f"High memory usage detected: {memory_usage}%")
                    
                    # Create notification in database
                    # Use sync_to_async for database operations
                    @sync_to_async
                    def create_memory_notification():
                        close_old_connections()
                        return Notification.objects.create(
                            user=None,  # System notification
                            title='High Memory Usage',
                            message=f'System RAM usage has reached {memory_usage}%',
                            type='warning',
                            is_system=True,
                            source='system_monitoring'
                        )
                    
                    db_notification = await create_memory_notification()
                    
                    # Convert to dict for socket transmission
                    @sync_to_async
                    def notification_to_dict(notification):
                        return notification.to_dict()
                    
                    memory_notification = await notification_to_dict(db_notification)
                    
                    # Add custom duration for the toast notification
                    memory_notification['duration'] = 10000  # 10 seconds
                    
                    # Broadcast to all users
                    await sio.emit('notification', memory_notification)
                    logger.warning(f"Memory usage alert sent: {memory_usage}%")
            else:
                # Reset the alert status when memory usage drops below the threshold
                if memory_alert_active and memory_usage < MEMORY_ALERT_THRESHOLD - 5:  # 5% hysteresis
                    memory_alert_active = False
                    logger.info(f"Memory usage returned to normal level: {memory_usage}%")
                    
                    # Send a recovery notification if memory was high before
                    if current_time - last_memory_alert_time < 3600:  # Only if high memory was recent (1 hour)
                        @sync_to_async
                        def create_recovery_notification():
                            close_old_connections()
                            return Notification.objects.create(
                                user=None,  # System notification
                                title='Memory Usage Normal',
                                message=f'System RAM usage has returned to a normal level ({memory_usage}%).',
                                type='success',
                                is_system=True,
                                source='system_monitoring'
                            )
                        
                        db_notification = await create_recovery_notification()
                        
                        @sync_to_async
                        def notification_to_dict(notification):
                            return notification.to_dict()
                        
                        recovery_notification = await notification_to_dict(db_notification)
                        
                        # Add custom duration for the toast notification
                        recovery_notification['duration'] = 5000  # 5 seconds
                        
                        await sio.emit('notification', recovery_notification)
            
            # Wait before next update
            await asyncio.sleep(0.1)  # Send updates every 100ms for ultra-smooth streaming
        except Exception as e:
            logger.error(f"Error broadcasting metrics: {e}")
            await asyncio.sleep(5)  # Wait a bit longer if there was an error


async def start_metrics_broadcast() -> None:
    """
    Start the metrics broadcasting coroutine.
    
    This function is called by the background task handler and 
    directly runs the broadcast_metrics coroutine.
    """
    try:
        logger.info("Starting metrics broadcast loop")
        await broadcast_metrics()
    except Exception as e:
        logger.error(f"Error in metrics broadcast task: {e}")
    finally:
        logger.info("Metrics broadcast task stopping")


def start_metrics_thread():
    """
    Start metrics broadcasting in a background task.
    
    Returns:
        The background task object
    """
    from .server import start_background_task
    return start_background_task(start_metrics_broadcast)


@sio.event
async def connect(sid, environ):
    """
    Handle client connection by sending initial metrics.
    
    Args:
        sid: Socket.IO session ID
        environ: WSGI environment dictionary with request details
    """
    # Send initial metrics to the new client
    try:
        metrics = get_system_metrics()
        await sio.emit('metrics_update', metrics, room=sid)
        logger.info(f"Initial metrics sent to {sid}")
    except Exception as e:
        logger.error(f"Error sending initial metrics: {e}")
