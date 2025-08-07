"""
WebSocket URL routing for Everyst API

Defines WebSocket endpoints for real-time features.
"""

from django.urls import re_path
from api.sockets.ssh_terminal import SSHTerminalConsumer

websocket_urlpatterns = [
    re_path(r'ws/terminal/ssh/$', SSHTerminalConsumer.as_asgi()),
]
