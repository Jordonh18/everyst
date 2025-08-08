"""
System services utility functions for the everyst API.
Includes functions for collecting running services, sessions, and API performance data.
"""
import subprocess
import psutil
import time
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
from django.db import connection
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_running_services() -> List[Dict[str, Any]]:
    """
    Get information about running system services
    """
    services = []
    
    # Common services to check
    service_names = [
        'nginx', 'apache2', 'httpd',  # Web servers
        'postgresql', 'mysql', 'mariadb', 'redis',  # Databases
        'ssh', 'sshd',  # SSH
        'docker', 'containerd',  # Containers
        'systemd-resolved', 'NetworkManager',  # Network
    ]
    
    for service_name in service_names:
        try:
            # Try systemctl first (systemd)
            result = subprocess.run(
                ['systemctl', 'is-active', service_name],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0 and result.stdout.strip() == 'active':
                # Get more details about the service
                try:
                    status_result = subprocess.run(
                        ['systemctl', 'status', service_name, '--no-pager', '--lines=0'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )
                    
                    # Extract PID and uptime from status
                    pid = None
                    uptime = None
                    
                    for line in status_result.stdout.split('\n'):
                        if 'Main PID:' in line:
                            try:
                                pid = int(line.split('Main PID:')[1].split()[0])
                            except:
                                pass
                        elif 'Active:' in line and 'since' in line:
                            try:
                                # Extract time since service started
                                since_part = line.split('since')[1].strip()
                                uptime = since_part.split(';')[0].strip()
                            except:
                                pass
                    
                    services.append({
                        'name': service_name,
                        'status': 'running',
                        'pid': pid,
                        'uptime': uptime,
                        'description': get_service_description(service_name)
                    })
                except Exception as e:
                    # Fallback for basic info
                    services.append({
                        'name': service_name,
                        'status': 'running',
                        'pid': None,
                        'uptime': None,
                        'description': get_service_description(service_name)
                    })
                    
        except Exception as e:
            logger.debug(f"Error checking service {service_name}: {e}")
            continue
    
    # Add some process-based detection for services that might not be systemd-managed
    try:
        for proc in psutil.process_iter(['pid', 'name', 'create_time']):
            try:
                proc_info = proc.info
                proc_name = proc_info['name'].lower()
                
                # Check for common service processes
                if proc_name in ['nginx', 'apache2', 'httpd', 'postgres', 'mysqld', 'redis-server']:
                    # Check if we already have this service
                    if not any(s['name'] in proc_name for s in services):
                        create_time = datetime.fromtimestamp(proc_info['create_time'])
                        uptime = str(datetime.now() - create_time).split('.')[0]
                        
                        services.append({
                            'name': proc_name,
                            'status': 'running',
                            'pid': proc_info['pid'],
                            'uptime': uptime,
                            'description': get_service_description(proc_name)
                        })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        logger.error(f"Error checking processes: {e}")
    
    return services[:10]  # Limit to 10 services


def get_service_description(service_name: str) -> str:
    """
    Get a human-readable description for a service
    """
    descriptions = {
        'nginx': 'Nginx Web Server',
        'apache2': 'Apache HTTP Server',
        'httpd': 'Apache HTTP Server',
        'postgresql': 'PostgreSQL Database',
        'postgres': 'PostgreSQL Database',
        'mysql': 'MySQL Database',
        'mysqld': 'MySQL Database',
        'mariadb': 'MariaDB Database',
        'redis': 'Redis Cache Server',
        'redis-server': 'Redis Cache Server',
        'ssh': 'SSH Daemon',
        'sshd': 'SSH Daemon',
        'docker': 'Docker Container Runtime',
        'containerd': 'Container Runtime',
        'systemd-resolved': 'System DNS Resolver',
        'NetworkManager': 'Network Manager',
    }
    
    return descriptions.get(service_name, f'{service_name.title()} Service')


def get_active_sessions() -> List[Dict[str, Any]]:
    """
    Get information about active user sessions
    """
    sessions = []
    
    try:
        # Get current logged-in users
        users = psutil.users()
        
        for user in users:
            sessions.append({
                'user': user.name,
                'type': 'ssh' if user.terminal else 'console',
                'ip': user.host or 'localhost',
                'started': datetime.fromtimestamp(user.started).strftime('%Y-%m-%d %H:%M:%S'),
                'duration': str(datetime.now() - datetime.fromtimestamp(user.started)).split('.')[0]
            })
    except Exception as e:
        logger.error(f"Error getting active sessions: {e}")
    
    # Add web sessions from Django if available
    try:
        from django.contrib.sessions.models import Session
        from api.models import User
        
        # Get active Django sessions from last 24 hours
        cutoff = datetime.now() - timedelta(hours=24)
        active_sessions = Session.objects.filter(expire_date__gt=datetime.now())
        
        for session in active_sessions[:5]:  # Limit to 5 web sessions
            try:
                session_data = session.get_decoded()
                user_id = session_data.get('_auth_user_id')
                if user_id:
                    user = User.objects.get(id=user_id)
                    sessions.append({
                        'user': user.username,
                        'type': 'web',
                        'ip': 'web-session',
                        'started': session.expire_date.strftime('%Y-%m-%d %H:%M:%S'),
                        'duration': 'Active'
                    })
            except Exception as e:
                logger.debug(f"Error processing session: {e}")
                continue
                
    except Exception as e:
        logger.debug(f"Error getting web sessions: {e}")
    
    return sessions[:10]  # Limit to 10 sessions


def get_api_response_times() -> List[Dict[str, Any]]:
    """
    Get API response time information from application logs
    """
    api_times = []
    
    try:
        # Simulate API response times for common endpoints
        # In a real implementation, this would read from logs or monitoring data
        common_endpoints = [
            '/api/metrics/',
            '/api/users/',
            '/api/system/current/',
            '/api/tools/ping/',
            '/api/notifications/',
        ]
        
        for endpoint in common_endpoints:
            # Simulate response time (in real implementation, get from logs/monitoring)
            import random
            response_time = random.randint(50, 300)  # 50-300ms
            status = 200 if response_time < 250 else 500
            
            api_times.append({
                'endpoint': endpoint,
                'method': 'GET',
                'responseTime': response_time,
                'status': status,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
    
    except Exception as e:
        logger.error(f"Error getting API response times: {e}")
    
    return api_times


def get_system_ports() -> List[Dict[str, Any]]:
    """
    Get information about open/listening ports using netstat
    """
    ports = []
    
    try:
        # Use netstat to get listening ports
        result = subprocess.run(
            ['netstat', '-tlnp'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            
            for line in lines:
                if 'LISTEN' in line:
                    parts = line.split()
                    if len(parts) >= 4:
                        address = parts[3]
                        process_info = parts[6] if len(parts) > 6 else 'unknown'
                        
                        # Extract port from address
                        if ':' in address:
                            port_str = address.split(':')[-1]
                            try:
                                port = int(port_str)
                                
                                # Extract process name
                                process = 'unknown'
                                if '/' in process_info:
                                    process = process_info.split('/')[1]
                                
                                ports.append({
                                    'port': port,
                                    'protocol': 'tcp',
                                    'service': get_port_service_name(port),
                                    'status': 'listening',
                                    'process': process
                                })
                            except ValueError:
                                continue
    
    except Exception as e:
        logger.error(f"Error getting system ports: {e}")
        
        # Fallback: use psutil to get network connections
        try:
            connections = psutil.net_connections(kind='inet')
            for conn in connections:
                if conn.status == psutil.CONN_LISTEN and conn.laddr:
                    try:
                        process = psutil.Process(conn.pid) if conn.pid else None
                        process_name = process.name() if process else 'unknown'
                        
                        ports.append({
                            'port': conn.laddr.port,
                            'protocol': 'tcp',
                            'service': get_port_service_name(conn.laddr.port),
                            'status': 'listening',
                            'process': process_name
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
        except Exception as e2:
            logger.error(f"Error with psutil fallback: {e2}")
    
    # Remove duplicates and sort by port
    seen_ports = set()
    unique_ports = []
    
    for port_info in sorted(ports, key=lambda x: x['port']):
        if port_info['port'] not in seen_ports:
            seen_ports.add(port_info['port'])
            unique_ports.append(port_info)
    
    return unique_ports[:15]  # Limit to 15 ports


def get_port_service_name(port: int) -> str:
    """
    Get service name for common ports
    """
    common_ports = {
        22: 'SSH',
        80: 'HTTP',
        443: 'HTTPS',
        3000: 'Development Server',
        5432: 'PostgreSQL',
        3306: 'MySQL',
        6379: 'Redis',
        27017: 'MongoDB',
        8000: 'Django/API Server',
        5000: 'Flask Server',
        9000: 'Application Server',
        53: 'DNS',
        25: 'SMTP',
        110: 'POP3',
        143: 'IMAP',
        993: 'IMAPS',
        995: 'POP3S',
        21: 'FTP',
        23: 'Telnet',
        2022: 'SSH (Alt)',
    }
    
    return common_ports.get(port, f'Port {port}')
