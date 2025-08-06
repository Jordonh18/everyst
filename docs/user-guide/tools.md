# GearRoom Network Tools

The GearRoom module provides a suite of network diagnostic tools to help you troubleshoot issues, analyze network connectivity, and monitor system status.

## Overview

GearRoom offers a collection of essential network utilities in a unified interface, eliminating the need to access the command line for common tasks.

## Tool Categories

The tools are organized into three main categories:

1. **Network Diagnostic Tools**: Tools for testing connectivity and resolving network issues
2. **System Network Tools**: Utilities for analyzing local network configuration
3. **Advanced Security Tools**: Network security analysis tools

## Network Diagnostic Tools

### Ping Tool

The Ping tool tests basic network connectivity to a host.

**Usage:**
1. Enter a hostname or IP address (e.g., `google.com` or `8.8.8.8`)
2. Click "Ping"
3. View results showing:
   - Response times
   - Packet loss statistics
   - Round-trip time statistics

**Example commands:**
- `google.com`
- `8.8.8.8`
- `github.com`

### Port Scanner (nmap)

The Port Scanner identifies open ports and running services on target hosts.

**Usage:**
1. Enter a target hostname or IP address
2. Optionally add nmap parameters
3. Click "Scan"
4. View results showing:
   - Open ports
   - Service identification
   - Version detection (when available)

**Example commands:**
- `192.168.1.1`
- `localhost -p 1-1000`
- `example.com -F`

### DNS Lookup Tool

The DNS Lookup tool resolves domain names and provides DNS information.

**Usage:**
1. Enter a domain name
2. Click "Lookup"
3. View results showing:
   - IP addresses
   - DNS records
   - Name servers
   - TTL values

**Example commands:**
- `google.com`
- `github.com`
- `example.org`

### Traceroute Tool

The Traceroute tool traces the path of packets through the network.

**Usage:**
1. Enter a target hostname or IP address
2. Click "Trace"
3. View results showing:
   - Each hop in the path
   - Response times
   - IP addresses of intermediate routers

**Example commands:**
- `google.com`
- `8.8.8.8`
- `github.com`

### WHOIS Lookup

The WHOIS tool provides domain registration information.

**Usage:**
1. Enter a domain name
2. Click "Lookup"
3. View results showing:
   - Registrar information
   - Registration dates
   - Name servers
   - Contact information (if available)

**Example commands:**
- `google.com`
- `microsoft.com`
- `example.org`

## System Network Tools

### Network Connections

The Network Connections tool displays active network connections on the server.

**Usage:**
1. Optionally enter netstat parameters
2. Click "View Connections"
3. View results showing:
   - Protocol (TCP/UDP)
   - Local address and port
   - Remote address and port
   - Connection state
   - Process ID (when available)

**Example commands:**
- `-tuln` (TCP/UDP listening ports)
- `-ap` (All ports with process info)
- `-r` (Routing table)

### Routing Table

The Routing Table tool displays IP routing information.

**Usage:**
1. Optionally enter route parameters
2. Click "View Routes"
3. View results showing:
   - Destination networks
   - Gateway addresses
   - Interface information
   - Metrics

**Example commands:**
- Empty (default view)

### Packet Capture

The Packet Capture tool allows network traffic inspection at the packet level.

**Usage:**
1. Enter tcpdump options or interfaces
2. Click "Capture"
3. View results showing:
   - Packet headers
   - Protocol information
   - Source and destination data

**Example commands:**
- `-i eth0` (Capture on eth0 interface)
- `-i eth0 port 80` (Capture HTTP traffic)
- `-i eth0 host 192.168.1.1` (Capture traffic to/from specific host)

## Advanced Security Tools

### SSL Certificate Checker

The SSL Certificate Checker analyzes SSL/TLS certificates.

**Usage:**
1. Enter a domain name
2. Click "Check"
3. View results showing:
   - Certificate validity
   - Expiration date
   - Issuer information
   - Cipher strengths

**Example commands:**
- `google.com`
- `github.com:443`

### Firewall Rule Checker

The Firewall Rule Checker displays current firewall rules.

**Usage:**
1. Click "Check Rules"
2. View results showing:
   - Active firewall rules
   - Chain configurations
   - Policy settings

### Port Status Checker

The Port Status Checker verifies if specific ports are open on the server.

**Usage:**
1. Enter port numbers separated by commas
2. Click "Check"
3. View results showing open and closed ports

**Example commands:**
- `80,443,22,3306`

## System Terminal

GearRoom also includes a secure terminal interface for advanced operations.

**Features:**
- Restricted shell environment
- Command history
- Syntax highlighting
- Output formatting

**Note:** The terminal requires appropriate permissions and is not available in all deployments.

## Using the Tool Interface

Each tool in GearRoom follows a consistent interface:

1. **Tool Card**: Contains the tool with:
   - Title and description
   - Input field for command parameters
   - Execute button
   - Example commands
   - Results display

2. **Result Display**: Shows:
   - Command executed
   - Timestamp
   - Formatted output
   - Status (success/error)
   - Copy button

3. **Example Commands**: Click on any example to automatically fill the input field

## Tool Execution Process

When you run a tool, the following process occurs:

1. Input validation on the client side
2. Command sent to backend via API
3. Server executes the command in a controlled environment
4. Results captured and formatted
5. Response returned to client
6. Output displayed in the tool interface

## Permissions and Security

Tool access is controlled by user permissions:

- Basic tools are available to all users
- Advanced tools require specific permissions
- Some tools are restricted to admin users
- Command parameters are validated and sanitized

## Troubleshooting

### Command Execution Issues

If a command fails to execute:
1. Check if you have the necessary permissions
2. Verify the target is accessible from the server
3. Check input parameters for errors
4. Review server logs for detailed error messages

### Tool Availability

If a tool is not available:
1. Verify that your user role has permissions to use it
2. Check if the tool is installed on the server
3. Ask your administrator to enable the tool

### Performance Issues

For slow-responding tools:
1. Try simpler commands with fewer options
2. Check network connectivity
3. Verify server resources are not overloaded
