/**
 * API client for network tools
 */

// Type definitions for tool responses
export interface ToolResponse {
  output: string;
  status: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
}

// Base API URL - using relative path for proxy support
const API_BASE_URL = '/api';

/**
 * Generic function to execute network tool via API
 */
const executeNetworkTool = async (
  endpoint: string,
  params: Record<string, any>,
  token: string
): Promise<ToolResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        output: `Error: ${response.status} ${response.statusText}\n${errorText}`,
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }

    return await response.json();
  } catch (error) {
    console.error(`Error executing ${endpoint}:`, error);
    return {
      output: `Failed to execute command: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error',
      timestamp: new Date().toISOString()
    };
  }
};

// Helper to get the current auth token
const getAuthToken = (): string => {
  return localStorage.getItem('accessToken') || '';
};

// Individual tool API functions

export const pingHost = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/ping/', { target }, getAuthToken());
};

export const nmapScan = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/nmap/', { target }, getAuthToken());
};

export const digLookup = async (target: string, recordType: string = 'A'): Promise<ToolResponse> => {
  return executeNetworkTool('tools/dig/', { target, record_type: recordType }, getAuthToken());
};

export const nslookup = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/nslookup/', { target }, getAuthToken());
};

export const traceroute = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/traceroute/', { target }, getAuthToken());
};

export const whoisLookup = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/whois/', { target }, getAuthToken());
};

export const sslCheck = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/ssl-check/', { target }, getAuthToken());
};

export const netstat = async (options: string = ''): Promise<ToolResponse> => {
  return executeNetworkTool('tools/netstat/', { options }, getAuthToken());
};

export const ipRoute = async (): Promise<ToolResponse> => {
  return executeNetworkTool('tools/ip-route/', {}, getAuthToken());
};

export const tcpdump = async (
  interface_name: string = 'any',
  filter: string = '',
  count: number = 25
): Promise<ToolResponse> => {
  return executeNetworkTool('tools/tcpdump/', { 
    interface: interface_name, 
    filter, 
    count 
  }, getAuthToken());
};
