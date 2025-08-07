"""
SSH Terminal WebSocket Handler

Provides secure SSH terminal access through WebSocket connections.
Supports password and SSH key authentication.
"""

import json
import asyncio
import logging
import paramiko
import threading
import queue
from django.conf import settings
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, ed25519
from api.models import SSHKey, SSHSession
import jwt

User = get_user_model()
logger = logging.getLogger(__name__)

class SSHTerminalConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for SSH terminal sessions"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.ssh_client = None
        self.ssh_channel = None
        self.user = None
        self.output_thread = None
        self.input_queue = queue.Queue()
        self.authenticated = False
        
    async def connect(self):
        """Accept WebSocket connection"""
        await self.accept()
        logger.info(f"SSH terminal WebSocket connected: {self.channel_name}")
        
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if self.ssh_channel:
            self.ssh_channel.close()
        if self.ssh_client:
            self.ssh_client.close()
        if self.output_thread:
            self.output_thread.join(timeout=1)
        logger.info(f"SSH terminal WebSocket disconnected: {self.channel_name}")
        
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'auth':
                await self.handle_authentication(data)
            elif message_type == 'command' and self.authenticated:
                await self.handle_command(data)
            else:
                await self.send_error("Invalid message type or not authenticated")
                
        except json.JSONDecodeError:
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send_error("Internal server error")
            
    async def handle_authentication(self, data):
        """Handle SSH authentication"""
        try:
            # Verify JWT token
            token = data.get('token')
            if not token:
                await self.send_error("Authentication token required")
                return
                
            self.user = await self.verify_token(token)
            if not self.user:
                await self.send_error("Invalid authentication token")
                return
                
            # Get SSH credentials
            username = data.get('username')
            password = data.get('password')
            ssh_key = data.get('sshKey')
            
            if not username:
                await self.send_error("Username is required")
                return
                
            # Establish SSH connection
            success = await self.establish_ssh_connection(username, password, ssh_key)
            
            if success:
                self.authenticated = True
                await self.send_message('auth_success', {'message': 'SSH authentication successful'})
                # Start output monitoring thread
                self.start_output_thread()
            else:
                await self.send_error("SSH authentication failed")
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            await self.send_error("Authentication failed")
            
    async def establish_ssh_connection(self, username, password=None, ssh_key=None):
        """Establish SSH connection to localhost"""
        try:
            self.ssh_client = paramiko.SSHClient()
            self.ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect based on authentication method
            if ssh_key:
                # Use SSH key authentication
                try:
                    key_obj = paramiko.RSAKey.from_private_key_file(ssh_key) if ssh_key.startswith('/') else paramiko.RSAKey.from_private_key(ssh_key)
                except:
                    try:
                        key_obj = paramiko.Ed25519Key.from_private_key_file(ssh_key) if ssh_key.startswith('/') else paramiko.Ed25519Key.from_private_key(ssh_key)
                    except:
                        return False
                        
                self.ssh_client.connect(
                    hostname='localhost',
                    username=username,
                    pkey=key_obj,
                    timeout=10
                )
            else:
                # Use password authentication
                self.ssh_client.connect(
                    hostname='localhost',
                    username=username,
                    password=password,
                    timeout=10
                )
                
            # Create interactive shell
            self.ssh_channel = self.ssh_client.invoke_shell(
                term='xterm-256color',
                width=80,
                height=24
            )
            
            return True
            
        except paramiko.AuthenticationException:
            logger.warning(f"SSH authentication failed for user {username}")
            return False
        except paramiko.SSHException as e:
            logger.error(f"SSH connection error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected SSH error: {e}")
            return False
            
    async def handle_command(self, data):
        """Handle command execution"""
        try:
            command = data.get('data', '')
            if self.ssh_channel and self.ssh_channel.send_ready():
                self.ssh_channel.send(command)
            else:
                await self.send_error("SSH channel not ready")
                
        except Exception as e:
            logger.error(f"Error sending command: {e}")
            await self.send_error("Failed to execute command")
            
    def start_output_thread(self):
        """Start thread to monitor SSH output"""
        self.output_thread = threading.Thread(target=self.monitor_output, daemon=True)
        self.output_thread.start()
        
    def monitor_output(self):
        """Monitor SSH channel output and send to WebSocket"""
        try:
            while self.ssh_channel and not self.ssh_channel.closed:
                if self.ssh_channel.recv_ready():
                    output = self.ssh_channel.recv(1024).decode('utf-8', errors='ignore')
                    if output:
                        asyncio.run_coroutine_threadsafe(
                            self.send_message('output', {'data': output}),
                            asyncio.get_event_loop()
                        )
                asyncio.sleep(0.1)
                
        except Exception as e:
            logger.error(f"Output monitoring error: {e}")
            asyncio.run_coroutine_threadsafe(
                self.send_error("SSH session terminated"),
                asyncio.get_event_loop()
            )
            
    async def send_message(self, message_type, data):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': message_type,
            **data
        }))
        
    async def send_error(self, message):
        """Send error message to WebSocket"""
        await self.send_message('error', {'message': message})
        
    @database_sync_to_async
    def verify_token(self, token):
        """Verify JWT token and return user"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            return User.objects.get(id=user_id, is_active=True)
        except (jwt.InvalidTokenError, User.DoesNotExist):
            return None
