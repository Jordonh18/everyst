"""
ASGI config for everyst_api project.

It exposes the ASGI callable as a module-level variable named ``application``.

This improved configuration provides clean separation between Django, Socket.IO,
and WebSocket handling with proper lifecycle management for background tasks.
"""

import os
import django
import logging
import asyncio
from typing import Dict, Any
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from channels.security.websocket import AllowedHostsOriginValidator

# Get DEBUG_MODE from environment
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'False').lower() in ('true', '1', 'yes')

# Configure logging with more detail for async operations
logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger('asgi')

# Set up Django environment before importing any Django-dependent modules
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'everyst_api.settings')
django.setup()

# Import the socket application after Django setup
from api.sockets import create_socket_app, sio
from api.sockets.metrics import start_metrics_thread
from api.sockets.network import check_scan_status
from api.sockets.logging_config import configure_socket_logging

# Configure Socket.IO and EngineIO logging to prevent excessive debug logs
configure_socket_logging()

# Import custom middlewares
from api.middlewares import TokenAuthMiddleware, RequestLoggingMiddleware, CorsMiddleware

# Get the Django ASGI application
django_asgi_app = get_asgi_application()

# Add middleware to the Django ASGI application
# Order matters: outermost middleware is applied first
django_asgi_app_with_middleware = CorsMiddleware(
    RequestLoggingMiddleware(
        django_asgi_app
    ),
    # Configure CORS for all origins in development, restrict in production
    allow_origins="*",  # In production, this should be a list of allowed domains
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "User-Agent", "X-Requested-With"],
    allow_credentials=True
)

# Create a URL router that combines Django and Socket.IO with proper middleware
django_application = ProtocolTypeRouter({
    # Django's ASGI application to handle traditional HTTP requests
    "http": django_asgi_app_with_middleware,
    
    # WebSocket handler with proper security and authentication
    "websocket": AllowedHostsOriginValidator(
        TokenAuthMiddleware(  # Apply custom token authentication
            AuthMiddlewareStack(
                URLRouter([
                    # Import WebSocket URL patterns
                    *__import__('api.routing', fromlist=['websocket_urlpatterns']).websocket_urlpatterns
                ])
            )
        )
    ),
})


# Lifecycle management for background tasks
background_tasks = set()
metrics_task = None
startup_complete = False

async def startup_cleanup():
    """Reset scan states and clean up any stale data at startup"""
    logger.info("Cleaning up previous scan states...")
    # Use a dummy sid for internal calls
    result = await check_scan_status("internal")
    logger.info(f"Scan status cleanup: {result.get('message', 'No message')}")
    return result

# Define Socket.IO startup tasks with proper error handling
async def socket_startup_tasks():
    """
    Tasks to run when the Socket.IO server starts
    
    This provides structured initialization of services needed by Socket.IO.
    """
    logger.info("Initializing Socket.IO services...")
    
    try:
        # Reset any stale scans from the previous run
        await startup_cleanup()
        
        # Initialize any other Socket.IO services here
        logger.info("Socket.IO initialization complete")
    except Exception as e:
        logger.error(f"Socket.IO startup error: {e}")
        # Continue running even if there's an error, as the server can still function

# Create the Socket.IO application with startup tasks
socket_app = create_socket_app(socket_startup_tasks)

# Socket.IO integration with lifecycle management
async def application(scope, receive, send):
    """
    ASGI application entry point.
    
    This routes requests to either Socket.IO or Django based on the path,
    with proper handling of background tasks and service initialization.
    """
    global metrics_task, startup_complete
    
    # Handle the lifespan protocol for ASGI startup/shutdown events
    if scope['type'] == 'lifespan':
        while True:
            message = await receive()
            if message['type'] == 'lifespan.startup':
                # Initialize services on lifespan startup
                if not startup_complete:
                    startup_complete = True
                    try:
                        # Start metrics broadcasting in background
                        metrics_task = start_metrics_thread()
                        logger.info("System metrics service started")
                        
                        # Schedule any other initialization tasks here
                        # They will run in the background but be tracked for cleanup
                        
                    except Exception as e:
                        logger.error(f"Service initialization error: {e}")
                
                # Send startup complete message
                await send({'type': 'lifespan.startup.complete'})
            elif message['type'] == 'lifespan.shutdown':
                # Cleanup on shutdown
                logger.info("Shutting down ASGI application")
                # Add any cleanup code here
                
                # Send shutdown complete message
                await send({'type': 'lifespan.shutdown.complete'})
                break
    # Route all Socket.IO traffic to the socket_app
    elif scope['path'].startswith('/socket.io/'):
        await socket_app(scope, receive, send)
    else:
        # Default to Django for all other routes
        await django_application(scope, receive, send)
