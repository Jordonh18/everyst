"""
System utility functions for the everyst API.
Includes functions for collecting system metrics and server information.
"""
import psutil
import time
from datetime import datetime
import os
import socket
import platform
import subprocess

def bytes_to_gb(bytes_value):
    """Convert bytes to GB with 1 decimal place"""
    return round(bytes_value / (1024 ** 3), 1)

def get_server_info():
    """
    Get server information like hostname, IPs, etc.
    """
    # Get hostname
    hostname = socket.gethostname()
    
    # Get private IP
    try:
        private_ip = socket.gethostbyname(hostname)
    except:
        private_ip = "Unknown"
    
    # Get public IP (using external service)
    try:
        # Use a simple command to get public IP
        public_ip_cmd = "curl -s https://api.ipify.org || echo 'Unknown'"
        public_ip = subprocess.check_output(public_ip_cmd, shell=True).decode('utf-8').strip()
    except:
        public_ip = "Unknown"
    
    # Get OS information
    os_name = platform.system()
    os_version = platform.release()
    
    # Get platform/architecture
    architecture = platform.machine()
    
    # Get kernel version
    try:
        kernel = platform.uname().release
    except:
        kernel = "Unknown"
    
    # Return server information dictionary
    return {
        'hostname': hostname,
        'private_ip': private_ip,
        'public_ip': public_ip,
        'os': f"{os_name} {os_version}",
        'architecture': architecture,
        'kernel': kernel
    }

def get_system_metrics():
    """
    Collect real-time system metrics using psutil with accurate system totals
    """
    # CPU usage - use interval=None for instantaneous reading to avoid blocking
    cpu_usage = psutil.cpu_percent(interval=0.1)
    
    # Get physical CPU cores (not logical/hyperthreaded)
    cpu_count_physical = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    
    # Get CPU frequency (speed in GHz)
    try:
        cpu_freq = psutil.cpu_freq()
        if cpu_freq:
            cpu_speed = round(cpu_freq.current / 1000, 1)  # Convert MHz to GHz
        else:
            # Try to get CPU info from /proc/cpuinfo on Linux
            if os.path.exists('/proc/cpuinfo'):
                with open('/proc/cpuinfo', 'r') as f:
                    for line in f:
                        if line.startswith('model name'):
                            # Extract speed from model name if available
                            parts = line.split('@')
                            if len(parts) > 1:
                                try:
                                    speed_str = parts[1].strip()
                                    if 'GHz' in speed_str:
                                        cpu_speed = float(speed_str.split('GHz')[0].strip())
                                    else:
                                        cpu_speed = 0
                                except:
                                    cpu_speed = 0
                            break
            else:
                cpu_speed = 0
    except Exception:
        cpu_speed = 0
    
    # Memory usage
    memory = psutil.virtual_memory()
    memory_usage = memory.percent
    memory_total = bytes_to_gb(memory.total)  # Total physical memory in GB
    memory_used = bytes_to_gb(memory.used)    # Used memory in GB
    
    # Disk usage (main disk)
    disk = psutil.disk_usage('/')
    disk_usage = disk.percent
    disk_total = bytes_to_gb(disk.total)     # Total disk size in GB
    disk_used = bytes_to_gb(disk.used)       # Used disk space in GB
    
    # Network usage (get bytes sent and received)
    net_io_counters_start = psutil.net_io_counters()
    time.sleep(0.1)  # Wait for a fraction of a second to calculate network speed
    net_io_counters_end = psutil.net_io_counters()
    
    # Calculate network speed (bytes/second)
    network_rx = (net_io_counters_end.bytes_recv - net_io_counters_start.bytes_recv) * 10  # Convert to bytes/second
    network_tx = (net_io_counters_end.bytes_sent - net_io_counters_start.bytes_sent) * 10  # Convert to bytes/second
    
    # System uptime
    uptime_seconds = time.time() - psutil.boot_time()
    days, remainder = divmod(uptime_seconds, 86400)
    hours, remainder = divmod(remainder, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    # Calculate actual uptime percentage from database
    try:
        from api.models.system import SystemUptimeEvent
        uptime_percentage = SystemUptimeEvent.calculate_uptime_percentage(period_days=365)
        print(f"DEBUG: Calculated uptime percentage: {uptime_percentage}")
    except Exception as e:
        print(f"DEBUG: Error calculating uptime: {e}")
        # Fallback to a calculation based on current session
        # Assume 99.9% if no historical data is available
        uptime_percentage = 99.9
    
    uptime = {
        'percentage': round(uptime_percentage, 1),
        'duration': f"{int(days)}d {int(hours)}h {int(minutes)}m"
    }
    
    # Get a timestamp for the metrics
    timestamp = datetime.now().isoformat()
    
    # Get server information
    server_info = get_server_info()
    
    return {
        'timestamp': timestamp,
        'cpu_usage': cpu_usage,
        'cpu_cores': cpu_count_physical or 6,  # Default to 6 cores if detection fails
        'cpu_speed': cpu_speed,
        'memory_usage': memory_usage,
        'memory_total': memory_total,
        'memory_used': memory_used,
        'disk_usage': disk_usage,
        'disk_total': disk_total,
        'disk_used': disk_used,
        'network_rx': network_rx,
        'network_tx': network_tx,
        'uptime': uptime,
        'server_info': server_info,
    }
