# Summit Dashboard

The Summit Dashboard is the main overview screen of Everyst, providing real-time system metrics and server information at a glance.

## Dashboard Overview

![Summit Dashboard Example](/public/images/Everyst-example.jpg)

The Summit Dashboard is divided into several panels:

1. **System Metrics** - Real-time performance metrics
2. **Server Information** - Detailed server specifications
3. **Additional Resources** - Documentation and quick links

## System Metrics Panel

This panel displays real-time performance metrics for your server:

### CPU Usage

- Real-time CPU usage percentage
- Number of CPU cores and speed
- Status indicator that changes color based on load:
  - Green: Low CPU usage (<50%)
  - Yellow: Moderate CPU usage (50-80%)
  - Red: High CPU usage (>80%)

### Memory Usage

- Current memory usage in GB
- Total available memory
- Usage percentage
- Status indicator based on memory consumption

### Disk Usage

- Storage utilization for primary partition
- Available and total space
- Usage percentage
- Read/Write activity
- Status indicator based on disk space availability

### Network Activity

- Current network speed (MB/s)
- Upload and download rates
- Network utilization percentage
- Status indicator based on network activity

## Server Information Panel

This panel provides detailed information about your server configuration:

### System Identity

- Hostname
- Operating System name and version
- Architecture (x86_64, ARM, etc.)
- Kernel version

### Network Configuration

- Primary IP address
- Network interface details
- DNS servers
- Default gateway

### System Uptime

- System boot time
- Total uptime duration
- Last restart information

### Security Status

- Recent security events
- Update status
- Security warnings
- Firewall status

## Additional Resources

At the bottom of the dashboard, you'll find:

- Documentation links
- Support resources
- Release notes
- Quick access to common tasks

## Panel Controls

Each panel on the dashboard has the following controls:

- **Expand/Collapse** - Toggle visibility of panel content
- **Refresh** - Manually refresh panel data
- **Settings** - Panel-specific configuration options

## Customizing the Dashboard

You can customize the Summit dashboard in several ways:

### Rearranging Panels

Click and hold the panel header to drag panels to different positions.

### Toggling Panels

Use the expand/collapse button on each panel to show or hide content.

### Dashboard Settings

Access dashboard settings by clicking the gear icon in the top-right corner:

- **Refresh Rate** - Change how often metrics are updated
- **Theme** - Switch between light and dark modes
- **Metric Units** - Change display units (MB/GB, etc.)

## Data Collection

The Summit dashboard collects data in the following ways:

- Real-time metrics via WebSocket connection
- System information via API calls
- Status information calculated from collected metrics

Data is collected at regular intervals (default: every 5 seconds) and displayed in real-time.

## Troubleshooting

### No Data Displayed

If metrics are not displaying:

1. Check the WebSocket connection status (indicated in the header)
2. Verify the backend server is running
3. Check browser console for connection errors
4. Refresh the page to reconnect

### Inaccurate Metrics

If metrics seem incorrect:

1. Verify the server time is correctly synchronized
2. Check for resource-intensive background processes
3. Compare with system tools like `top` or `htop`

### Performance Issues

If the dashboard is slow to update:

1. Increase the refresh interval in settings
2. Close unused browser tabs
3. Check browser resource usage
4. Verify server resources are not overloaded
