# Glacier Network Visualization

The Glacier module provides an interactive network visualization map that helps you understand and manage your network topology.

## Overview

Glacier offers a real-time, interactive visualization of your network, allowing you to:
- Discover and monitor network devices
- Visualize connections between devices
- Identify potential security issues
- Manage network inventory

## Network Map Interface

The Glacier interface consists of several components:

1. **Network Map Canvas** - The main visualization area
2. **Network Controls** - Tools for interacting with the map
3. **Device Details Panel** - Information about selected devices
4. **Action Bar** - Scan controls and global actions

## Viewing Your Network

### Map Navigation

- **Pan**: Click and drag on the map background
- **Zoom**: Use mouse wheel or zoom controls
- **Reset View**: Click the "Fit View" button to center the map

### Device Nodes

Devices are represented as nodes on the map with:
- Icon indicating device type
- Name label
- Status indicator
- Connection lines to other devices

### Connections

Lines between devices represent network connections with:
- Line style indicating connection type
- Color indicating connection status
- Thickness indicating bandwidth or importance

## Network Scanning

Glacier allows you to scan your network to discover devices:

### Running a Scan

1. Click the "Scan Network" button in the action bar
2. Choose scan type:
   - Basic: Fast scan with limited fingerprinting
   - Intense: More thorough with OS detection
   - Full: Complete port and service scanning (slow)
3. Select network range or use auto-discovery
4. Click "Start Scan"

### Scan Progress

During scanning, you'll see:
- Progress indicator
- Newly discovered devices appearing in real-time
- Status updates in the notification area

### Scan History

View previous scan results:
1. Click the "History" button
2. Select a previous scan from the list
3. Click "Load" to view that scan's results

## Managing Devices

### Viewing Device Details

1. Click on any device in the network map
2. The Device Details panel will display:
   - Device name
   - IP address
   - MAC address
   - Operating system
   - Device type
   - Open ports
   - Services
   - Status
   - Tags

### Adding Devices Manually

1. Click the "Add Device" button
2. Fill in the device details:
   - Name
   - IP address
   - MAC address
   - Device type
   - Description
   - Tags
3. Click "Add Device"

### Editing Devices

1. Select a device on the map
2. Click "Edit" in the Device Details panel
3. Modify device information
4. Click "Save Changes"

### Removing Devices

1. Select a device on the map
2. Click "Remove" in the Device Details panel
3. Confirm the removal

## Map Layouts

Glacier offers different layout algorithms to organize your network map:

### Changing Layout

1. Click the "Layout" button in the Network Controls
2. Select a layout style:
   - Force: Physics-based layout (default)
   - Grid: Organized grid layout
   - Radial: Circular layout with central nodes
   - Hierarchical: Tree structure layout
3. Click "Apply Layout"

### Saving Layouts

1. Arrange devices as desired
2. Click the "Save Layout" button
3. Enter a name for the layout
4. Click "Save"

## Filtering and Searching

### Filtering Devices

1. Click the "Filter" button
2. Filter by:
   - Device type
   - Status
   - Tags
   - Operating system
   - Open ports
3. The map will update to show only matching devices

### Searching

1. Enter a search term in the search box
2. Results will highlight on the map
3. Click on a search result to focus on that device

## Exporting Data

### Export as Image

1. Click the "Export" button
2. Select "Export as Image"
3. Choose image format (PNG, JPG, SVG)
4. Click "Export"

### Export Device List

1. Click the "Export" button
2. Select "Export Device List"
3. Choose format (CSV, JSON)
4. Click "Export"

## Network Map Controls

The Network Controls panel provides several tools:

- **Zoom Controls**: Zoom in/out and fit view
- **Layout Options**: Change layout algorithm
- **Grid Toggle**: Show/hide background grid
- **Export**: Save as image or data file
- **Save Layout**: Save current device positions

## Troubleshooting

### Scan Issues

If network scanning fails:
1. Check that the backend has sufficient permissions
2. Verify network connectivity
3. Check for firewall rules blocking scans
4. Increase scan timeout in settings

### Visualization Issues

If the map isn't displaying correctly:
1. Try a different layout algorithm
2. Refresh the page
3. Check browser console for errors
4. Verify WebSocket connection is active

### Missing Devices

If devices are not appearing:
1. Try a different scan type
2. Check if the device is behind a firewall
3. Verify the device is powered on and connected
4. Add the device manually if needed

## Performance Optimization

For large networks:
1. Use the basic scan for initial discovery
2. Filter devices to focus on relevant segments
3. Increase the WebSocket buffer size in settings
4. Consider breaking the network into subnet views
