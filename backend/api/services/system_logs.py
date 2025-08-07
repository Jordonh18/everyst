"""
System log monitoring service for Linux distributions.

This service auto-detects system logs based on the distribution and provides
unified access to various log files including syslog, kernel logs, auth logs,
web server logs, and more.
"""

import os
import re
import subprocess
import platform
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class SystemLogManager:
    """
    Manages access to various system logs across different Linux distributions.
    """
    
    def __init__(self):
        self.distro_info = self._detect_distribution()
        self.log_locations = self._discover_log_locations()
        
    def _detect_distribution(self) -> Dict[str, str]:
        """Detect the Linux distribution and version."""
        try:
            # Try to read /etc/os-release (most modern distributions)
            if os.path.exists('/etc/os-release'):
                with open('/etc/os-release', 'r') as f:
                    lines = f.readlines()
                    info = {}
                    for line in lines:
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            info[key] = value.strip('"')
                    return info
            
            # Fallback to platform module
            return {
                'ID': platform.system().lower(),
                'VERSION_ID': platform.release(),
                'NAME': platform.platform()
            }
        except Exception as e:
            logger.warning(f"Could not detect distribution: {e}")
            return {'ID': 'unknown', 'VERSION_ID': 'unknown', 'NAME': 'Unknown Linux'}
    
    def _discover_log_locations(self) -> Dict[str, Dict[str, Any]]:
        """
        Discover log file locations based on the distribution and services.
        """
        locations = {}
        
        # System logs (common across distributions)
        system_logs = {
            'syslog': {
                'paths': ['/var/log/syslog', '/var/log/messages'],
                'description': 'System messages and general activity',
                'category': 'system',
                'format': 'syslog'
            },
            'kern': {
                'paths': ['/var/log/kern.log', '/var/log/kernel.log'],
                'description': 'Kernel messages and hardware events',
                'category': 'system',
                'format': 'syslog'
            },
            'auth': {
                'paths': ['/var/log/auth.log', '/var/log/secure'],
                'description': 'Authentication and authorization events',
                'category': 'security',
                'format': 'syslog'
            },
            'boot': {
                'paths': ['/var/log/boot.log', '/var/log/boot'],
                'description': 'Boot process messages',
                'category': 'system',
                'format': 'syslog'
            },
            'dmesg': {
                'paths': ['/var/log/dmesg'],
                'description': 'Device driver messages',
                'category': 'system',
                'format': 'dmesg'
            },
            'cron': {
                'paths': ['/var/log/cron.log', '/var/log/cron'],
                'description': 'Scheduled task execution logs',
                'category': 'system',
                'format': 'syslog'
            },
            'mail': {
                'paths': ['/var/log/mail.log', '/var/log/maillog'],
                'description': 'Mail server logs',
                'category': 'services',
                'format': 'syslog'
            }
        }
        
        # Web server logs
        web_server_logs = self._discover_web_server_logs()
        
        # Database logs
        database_logs = self._discover_database_logs()
        
        # Check which files actually exist
        for log_name, log_info in {**system_logs, **web_server_logs, **database_logs}.items():
            for path in log_info['paths']:
                if os.path.exists(path) and os.access(path, os.R_OK):
                    locations[log_name] = {
                        **log_info,
                        'path': path,
                        'size': self._get_file_size(path),
                        'last_modified': self._get_last_modified(path)
                    }
                    break
        
        return locations
    
    def _discover_web_server_logs(self) -> Dict[str, Dict[str, Any]]:
        """Discover web server log locations."""
        web_logs = {}
        
        # Apache logs
        apache_paths = [
            '/var/log/apache2/',
            '/var/log/httpd/',
            '/var/log/apache/',
        ]
        
        for apache_path in apache_paths:
            if os.path.exists(apache_path):
                # Access logs
                access_files = [
                    f'{apache_path}access.log',
                    f'{apache_path}access_log',
                    f'{apache_path}other_vhosts_access.log'
                ]
                for access_file in access_files:
                    if os.path.exists(access_file):
                        web_logs['apache_access'] = {
                            'paths': [access_file],
                            'description': 'Apache web server access logs',
                            'category': 'webserver',
                            'format': 'apache_access'
                        }
                        break
                
                # Error logs
                error_files = [
                    f'{apache_path}error.log',
                    f'{apache_path}error_log'
                ]
                for error_file in error_files:
                    if os.path.exists(error_file):
                        web_logs['apache_error'] = {
                            'paths': [error_file],
                            'description': 'Apache web server error logs',
                            'category': 'webserver',
                            'format': 'apache_error'
                        }
                        break
        
        # Nginx logs
        nginx_paths = ['/var/log/nginx/']
        for nginx_path in nginx_paths:
            if os.path.exists(nginx_path):
                access_file = f'{nginx_path}access.log'
                if os.path.exists(access_file):
                    web_logs['nginx_access'] = {
                        'paths': [access_file],
                        'description': 'Nginx web server access logs',
                        'category': 'webserver',
                        'format': 'nginx_access'
                    }
                
                error_file = f'{nginx_path}error.log'
                if os.path.exists(error_file):
                    web_logs['nginx_error'] = {
                        'paths': [error_file],
                        'description': 'Nginx web server error logs',
                        'category': 'webserver',
                        'format': 'nginx_error'
                    }
        
        return web_logs
    
    def _discover_database_logs(self) -> Dict[str, Dict[str, Any]]:
        """Discover database log locations."""
        db_logs = {}
        
        # MySQL/MariaDB
        mysql_paths = [
            '/var/log/mysql/',
            '/var/log/mariadb/',
            '/var/lib/mysql/'
        ]
        for mysql_path in mysql_paths:
            if os.path.exists(mysql_path):
                error_file = f'{mysql_path}error.log'
                if os.path.exists(error_file):
                    db_logs['mysql_error'] = {
                        'paths': [error_file],
                        'description': 'MySQL/MariaDB error logs',
                        'category': 'database',
                        'format': 'mysql'
                    }
                break
        
        # PostgreSQL
        postgres_paths = [
            '/var/log/postgresql/',
            '/var/lib/postgresql/data/log/'
        ]
        for postgres_path in postgres_paths:
            if os.path.exists(postgres_path):
                # PostgreSQL logs are often named with dates
                log_files = [f for f in os.listdir(postgres_path) if f.endswith('.log')]
                if log_files:
                    latest_log = max(log_files, key=lambda x: os.path.getmtime(os.path.join(postgres_path, x)))
                    db_logs['postgresql'] = {
                        'paths': [os.path.join(postgres_path, latest_log)],
                        'description': 'PostgreSQL database logs',
                        'category': 'database',
                        'format': 'postgresql'
                    }
                break
        
        return db_logs
    
    def _get_file_size(self, path: str) -> int:
        """Get file size in bytes."""
        try:
            return os.path.getsize(path)
        except OSError:
            return 0
    
    def _get_last_modified(self, path: str) -> str:
        """Get last modified timestamp."""
        try:
            return datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        except OSError:
            return datetime.now().isoformat()
    
    def get_available_logs(self) -> Dict[str, Any]:
        """Get list of available log files with metadata."""
        return {
            'distribution': self.distro_info,
            'logs': self.log_locations
        }
    
    def read_log_file(self, log_name: str, lines: int = 100, 
                     search_term: str = '', log_level: str = '',
                     start_date: Optional[str] = None, 
                     end_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Read and filter log file content.
        
        Args:
            log_name: Name of the log file to read
            lines: Number of lines to return (from end of file)
            search_term: Search term to filter lines
            log_level: Log level to filter (ERROR, WARN, INFO, DEBUG)
            start_date: Start date filter (ISO format)
            end_date: End date filter (ISO format)
        """
        if log_name not in self.log_locations:
            raise ValueError(f"Log '{log_name}' not found")
        
        log_info = self.log_locations[log_name]
        log_path = log_info['path']
        
        try:
            # Use tail for efficiency on large files
            result = subprocess.run(['tail', '-n', str(lines), log_path], 
                                  capture_output=True, text=True, check=True)
            raw_lines = result.stdout.split('\n')
            
            # Parse and filter lines
            parsed_lines = []
            for line in raw_lines:
                if not line.strip():
                    continue
                
                parsed_line = self._parse_log_line(line, log_info['format'])
                if not parsed_line:
                    continue
                
                # Apply filters
                if search_term and search_term.lower() not in line.lower():
                    continue
                
                if log_level and parsed_line.get('level', '').upper() != log_level.upper():
                    continue
                
                if start_date or end_date:
                    line_date = parsed_line.get('timestamp')
                    if line_date:
                        try:
                            line_dt = datetime.fromisoformat(line_date.replace('Z', '+00:00'))
                            if start_date and line_dt < datetime.fromisoformat(start_date):
                                continue
                            if end_date and line_dt > datetime.fromisoformat(end_date):
                                continue
                        except ValueError:
                            # Skip lines with unparseable dates
                            continue
                
                parsed_lines.append(parsed_line)
            
            return {
                'log_name': log_name,
                'log_info': log_info,
                'lines': parsed_lines,
                'total_lines': len(parsed_lines),
                'file_size': log_info['size'],
                'last_modified': log_info['last_modified']
            }
        
        except subprocess.CalledProcessError as e:
            logger.error(f"Error reading log file {log_path}: {e}")
            raise ValueError(f"Could not read log file: {e}")
        except Exception as e:
            logger.error(f"Unexpected error reading {log_path}: {e}")
            raise ValueError(f"Unexpected error: {e}")
    
    def _parse_log_line(self, line: str, log_format: str) -> Optional[Dict[str, Any]]:
        """
        Parse a log line based on its format.
        """
        if not line.strip():
            return None
        
        parsed = {
            'raw': line,
            'timestamp': None,
            'level': None,
            'message': line,
            'source': None,
            'process': None
        }
        
        try:
            if log_format == 'syslog':
                # Standard syslog format: Month Day Time Host Process[PID]: Message
                syslog_pattern = r'^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+([^:\[\]]+)(?:\[(\d+)\])?\s*:\s*(.*)$'
                match = re.match(syslog_pattern, line)
                if match:
                    timestamp_str, hostname, process, pid, message = match.groups()
                    # Convert to ISO format (assuming current year)
                    try:
                        current_year = datetime.now().year
                        dt = datetime.strptime(f"{current_year} {timestamp_str}", "%Y %b %d %H:%M:%S")
                        parsed['timestamp'] = dt.isoformat()
                    except ValueError:
                        pass
                    parsed['source'] = hostname
                    parsed['process'] = process
                    parsed['message'] = message
                    
                    # Extract log level from message
                    level_match = re.search(r'\b(ERROR|WARN|WARNING|INFO|DEBUG|CRIT|CRITICAL|ALERT|EMERG)\b', message.upper())
                    if level_match:
                        parsed['level'] = level_match.group(1)
            
            elif log_format == 'apache_access':
                # Apache access log format: IP - - [timestamp] "request" status size "referer" "user-agent"
                apache_pattern = r'^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d+)\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"'
                match = re.match(apache_pattern, line)
                if match:
                    ip, timestamp_str, request, status, size, referer, user_agent = match.groups()
                    try:
                        dt = datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z")
                        parsed['timestamp'] = dt.isoformat()
                    except ValueError:
                        pass
                    parsed['source'] = ip
                    parsed['message'] = f"{request} - {status} ({size} bytes)"
                    if int(status) >= 400:
                        parsed['level'] = 'ERROR'
                    elif int(status) >= 300:
                        parsed['level'] = 'WARN'
                    else:
                        parsed['level'] = 'INFO'
            
            elif log_format == 'nginx_access':
                # Nginx access log format similar to Apache
                nginx_pattern = r'^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d+)\s+(\d+)\s+"([^"]*)"\s+"([^"]*)"'
                match = re.match(nginx_pattern, line)
                if match:
                    ip, timestamp_str, request, status, size, referer, user_agent = match.groups()
                    try:
                        dt = datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z")
                        parsed['timestamp'] = dt.isoformat()
                    except ValueError:
                        pass
                    parsed['source'] = ip
                    parsed['message'] = f"{request} - {status} ({size} bytes)"
                    if int(status) >= 400:
                        parsed['level'] = 'ERROR'
                    elif int(status) >= 300:
                        parsed['level'] = 'WARN'
                    else:
                        parsed['level'] = 'INFO'
            
            # Add more format parsers as needed
            
        except Exception as e:
            logger.debug(f"Could not parse line with format {log_format}: {e}")
        
        return parsed
    
    def get_log_statistics(self, log_name: str, hours: int = 24) -> Dict[str, Any]:
        """
        Get statistics for a log file over the specified time period.
        """
        if log_name not in self.log_locations:
            raise ValueError(f"Log '{log_name}' not found")
        
        # Read recent entries
        log_data = self.read_log_file(log_name, lines=1000)
        
        # Calculate statistics
        now = datetime.now()
        cutoff = now - timedelta(hours=hours)
        
        recent_lines = []
        level_counts = {'ERROR': 0, 'WARN': 0, 'INFO': 0, 'DEBUG': 0, 'OTHER': 0}
        
        for line in log_data['lines']:
            if line.get('timestamp'):
                try:
                    line_dt = datetime.fromisoformat(line['timestamp'].replace('Z', '+00:00'))
                    if line_dt >= cutoff:
                        recent_lines.append(line)
                        level = line.get('level', 'OTHER')
                        if level in level_counts:
                            level_counts[level] += 1
                        else:
                            level_counts['OTHER'] += 1
                except ValueError:
                    continue
        
        return {
            'log_name': log_name,
            'period_hours': hours,
            'total_recent_entries': len(recent_lines),
            'level_distribution': level_counts,
            'file_size': log_data['file_size'],
            'last_modified': log_data['last_modified']
        }
