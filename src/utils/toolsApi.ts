/**
 * Tools API implementation
 * This file contains implementations of the network tools functions
 * that connect to the backend API instead of using mock data
 */
import { type ToolResponse } from './networkTools';

// Helper to get the current auth token
const getAuthToken = (): string => {
  return localStorage.getItem('accessToken') || '';
};

/**
 * Generic function to execute network tool via API
 */
const executeNetworkTool = async (
  endpoint: string,
  params: Record<string, any>,
): Promise<ToolResponse> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`/api/${endpoint}`, {
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

/**
 * Function to run ping using API
 */
export const runPingApi = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/ping/', { target });
};

/**
 * Function to run nmap using API
 */
export const runNmapApi = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/nmap/', { target });
};

/**
 * Function to run dig DNS lookup using API
 */
export const runDigApi = async (target: string, recordType: string = 'A'): Promise<ToolResponse> => {
  return executeNetworkTool('tools/dig/', { target, record_type: recordType });
};

/**
 * Function to run nslookup using API
 */
export const runNslookupApi = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/nslookup/', { target });
};

/**
 * Function to run traceroute using API
 */
export const runTracerouteApi = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/traceroute/', { target });
};

/**
 * Function to run whois lookup using API
 */
export const runWhoisApi = async (target: string): Promise<ToolResponse> => {
  return executeNetworkTool('tools/whois/', { target });
};

/**
 * Function to run SSL check using API
 */
export const runSslCheckApi = async (target: string): Promise<ToolResponse> => {
  // Remove protocol if present for consistency
  const cleanTarget = target.replace(/^https?:\/\//, '');
  return executeNetworkTool('tools/ssl-check/', { target: cleanTarget });
};

/**
 * Function to run netstat using API
 */
export const runNetstatApi = async (options: string = ''): Promise<ToolResponse> => {
  return executeNetworkTool('tools/netstat/', { options });
};

/**
 * Function to run IP route check using API
 */
export const runIpRouteApi = async (): Promise<ToolResponse> => {
  return executeNetworkTool('tools/ip-route/', {});
};

/**
 * Function to run tcpdump packet capture using API
 */
export const runTcpdumpApi = async (
  interfaceName: string = 'any',
  filter: string = '',
  count: number = 25
): Promise<ToolResponse> => {
  return executeNetworkTool('tools/tcpdump/', { 
    interface: interfaceName, 
    filter, 
    count 
  });
};
