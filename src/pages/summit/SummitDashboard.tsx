import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '../../components/ui';
import { Panel } from '../../components/ui/Panel';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { RefreshCw, Cpu, Server, HardDrive, Activity, Wifi, Shield, Plus, AlertTriangle, Globe, Network, Terminal, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../context/WebSocketContext';
import { socketService } from '../../utils/socket';

// Types for raw metrics data received from backend
interface RawMetricsData {
  timestamp?: string;
  cpu_usage: number;
  cpu_cores: number;
  cpu_speed: number;
  memory_usage: number;
  memory_total: number;
  memory_used: number;
  disk_usage: number;
  disk_total: number;
  disk_used: number;
  network_rx: number;
  network_tx: number;
  uptime?: {
    percentage: number;
    duration: string;
  };
  server_info?: {
    hostname: string;
    private_ip: string;
    public_ip: string;
    os: string;
    architecture: string;
    kernel: string;
  };
  security?: {
    status: 'success' | 'warning' | 'error';
    lastScan: string | null;
  };
  threats?: {
    type: string;
    time: string;
    status: 'success' | 'warning' | 'error';
  }[];
  alerts?: {
    title: string;
    serverId: string;
    severity: 'warning' | 'error';
  }[];
}

// Types for our processed system metrics data
interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    speed: number;
    status: 'success' | 'warning' | 'error';
  } | null;
  memory: {
    used: number;
    total: number;
    percentage: number;
    status: 'success' | 'warning' | 'error';
  } | null;
  disk: {
    used: number;
    total: number;
    percentage: number;
    status: 'success' | 'warning' | 'error';
  } | null;
  network: {
    speed: number;
    upload: number;
    download: number;
    utilization: number;
    status: 'success' | 'warning' | 'error';
  } | null;
  security: {
    status: 'success' | 'warning' | 'error';
    lastScan: string | null;
  } | null;
  threats: {
    type: string;
    time: string;
    status: 'success' | 'warning' | 'error';
  }[];
  alerts: {
    title: string;
    serverId: string;
    severity: 'warning' | 'error';
  }[];
  uptime: {
    percentage: number;
    duration: string | null;
  } | null;
  server_info?: {
    hostname: string;
    private_ip: string;
    public_ip: string;
    os: string;
    architecture: string;
    kernel: string;
  };
}

export const SummitDashboard: React.FC = () => {
  // State to hold our system metrics data
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: null,
    memory: null,
    disk: null,
    network: null,
    security: null,
    threats: [],
    alerts: [],
    uptime: null,
    server_info: undefined
  });
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Specific loading states for individual cards
  const [isAlertsLoading, setIsAlertsLoading] = useState<boolean>(false);
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Get WebSocket connection status from context
  const { isConnected } = useWebSocket();
  
  // Calculate status based on usage percentages
  const getStatus = (usage: number): 'success' | 'warning' | 'error' => {
      if (usage >= 90) return 'error';
      if (usage >= 70) return 'warning';
      return 'success';
  };
  
  // Process metrics data from socket
  const processMetricsData = React.useCallback((data: Partial<SystemMetrics>) => {
    if (!data) return;

    const cpuStatus = getStatus(data.cpu?.usage || 0);
    const memoryStatus = getStatus(data.memory?.percentage || 0);
    const diskStatus = getStatus(data.disk?.percentage || 0);

    // Calculate network utilization percentage for the progress bar
    // Assuming 1 Gbps (125 MB/s) as maximum network capacity
    const MAX_NETWORK_SPEED_MBS = 125;
    const networkSpeedMBs = ((data.network?.upload || 0) + (data.network?.download || 0)) / (1024 * 1024);
    const networkUtilPercent = Math.min(100, (networkSpeedMBs / MAX_NETWORK_SPEED_MBS) * 100);

    // Network status based on utilization
    const networkStatus = getStatus(networkUtilPercent);

    const processed = {
      cpu: {
        usage: data.cpu?.usage || 0,
        cores: data.cpu?.cores || 0,
        speed: data.cpu?.speed || 0,
        status: cpuStatus,
      },
      memory: {
        used: data.memory?.used || 0,
        total: data.memory?.total || 0,
        percentage: data.memory?.percentage || 0,
        status: memoryStatus,
      },
      disk: {
        used: data.disk?.used || 0,
        total: data.disk?.total || 0,
        percentage: data.disk?.percentage || 0,
        status: diskStatus,
      },
      network: {
        speed: parseFloat(networkSpeedMBs.toFixed(2)), // MB/s
        upload: parseFloat((data.network?.upload || 0).toFixed(2)), // MB/s
        download: parseFloat((data.network?.download || 0).toFixed(2)), // MB/s
        utilization: networkUtilPercent, // Add utilization percentage for progress bar
        status: networkStatus,
      },
      uptime: data.uptime || null,
      // Add server information if available
      server_info: data.server_info || undefined,
    };

    return processed;
  }, []);
  
  // Function to manually refresh connection
  const refreshConnection = () => {
    setIsLoading(true);
    setError(null);
    
    // The centralized WebSocket will handle reconnection automatically
    // Just reset our local loading state
    setTimeout(() => {
      if (!isConnected) {
        setError('Unable to connect to metrics server');
        setIsLoading(false);
      }
    }, 3000);
  };
  
  // Function to refresh only the alerts data
  const refreshAlerts = () => {
    setIsAlertsLoading(true);
    
    // Simulate alerts data fetch completion
    setTimeout(() => {
      setIsAlertsLoading(false);
    }, 800);
  };
  
  // Set up metrics data listener
  useEffect(() => {
    if (!isConnected) {
      setIsLoading(true);
      return;
    }

    // Access the socket directly through socketService
    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket instance not available');
      setError('Socket connection not available');
      setIsLoading(false);
      return;
    }
    
    // Function to handle incoming metrics
    const handleMetricsUpdate = (rawData: RawMetricsData) => {
      // Transform the raw backend data format to match our component's expected structure
      const transformedData: Partial<SystemMetrics> = {
        cpu: {
          usage: rawData.cpu_usage || 0,
          cores: rawData.cpu_cores || 0,
          speed: rawData.cpu_speed || 0,
          status: 'success'
        },
        memory: {
          used: rawData.memory_used || 0,
          total: rawData.memory_total || 0,
          percentage: rawData.memory_usage || 0,
          status: 'success'
        },
        disk: {
          used: rawData.disk_used || 0,
          total: rawData.disk_total || 0,
          percentage: rawData.disk_usage || 0,
          status: 'success'
        },
        network: {
          upload: rawData.network_tx ? rawData.network_tx / (1024 * 1024) : 0, // Convert bytes to MB
          download: rawData.network_rx ? rawData.network_rx / (1024 * 1024) : 0, // Convert bytes to MB
          speed: 0, // Will be calculated in processMetricsData
          utilization: 0, // Will be calculated in processMetricsData
          status: 'success'
        },
        uptime: rawData.uptime || null,
        server_info: rawData.server_info || undefined,
        security: null,
        threats: [],
        alerts: []
      };
      
      // Now process the transformed data to calculate additional fields and statuses
      const processed = processMetricsData(transformedData);
      
      if (processed) {
        setMetrics((prevMetrics) => ({
          ...prevMetrics,
          ...processed,
          security: rawData.security || null,
          threats: rawData.threats || [],
          alerts: rawData.alerts || [],
        }));
        setIsLoading(false);
      }
      
      // Removing console log to reduce console clutter
      // console.log('Received metrics update:', rawData);
    };
    
    // Listen for metrics updates
    socket.on('metrics_update', handleMetricsUpdate);
    
    // Reset error when connected
    setError(null);
    
    // Clean up listener on unmount
    return () => {
      socket.off('metrics_update', handleMetricsUpdate);
    };
  }, [isConnected, processMetricsData]);

  // Update error state when connection status changes
  useEffect(() => {
    if (!isConnected) {
      setError('Connection lost to metrics server');
    } else {
      setError(null);
    }
  }, [isConnected]);
  
  return (
    <div className="space-y-6">
      {/* Page header with breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Summit</h1>
          <p className="text-[rgb(var(--color-text-secondary))]">Your system at a glance</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            leftIcon={<RefreshCw size={16} />}
            onClick={refreshConnection}
            isLoading={isLoading}
            size="sm"
          >
            Refresh
          </Button>
          <Button 
            variant="default" 
            leftIcon={<Plus size={16} />}
            size="sm"
          >
            Add Widget
          </Button>
        </div>
      </div>

      {/* System status overview panel */}
      <Panel 
        title="System Status" 
        description="Real-time health and performance indicators"
        actions={
          <Badge 
            variant={error ? 'destructive' : isConnected ? 'default' : 'secondary'}
          >
            {error ? 'Connection Error' : isConnected ? 'Live Metrics' : 'Connecting...'}
          </Badge>
        }
      >
        {/* All cards now have the same frost level */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="CPU Usage" isLoading={isLoading}>
            {metrics.cpu ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Cpu className="mr-2 text-[rgb(var(--color-primary))]" size={24} />
                    <div>
                      <div className="text-2xl font-semibold">{metrics.cpu.usage}%</div>
                      <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                        {metrics.cpu.cores} cores @ {metrics.cpu.speed}GHz
                      </div>
                    </div>
                  </div>
                  <Badge status={metrics.cpu.status} size="sm" />
                </div>
                <div className="mt-4 h-2 bg-[rgb(var(--color-progress-bg))] dark:bg-[rgb(var(--color-progress-bg-dark))] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[rgb(var(--color-primary))]" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${metrics.cpu.usage}%` }} 
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
          </Card>
          
          <Card title="Memory" isLoading={isLoading}>
            {metrics.memory ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Server className="mr-2 text-[rgb(var(--color-primary))]" size={24} />
                    <div>
                      <div className="text-2xl font-semibold">{metrics.memory.used.toFixed(1)} GB</div>
                      <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                        of {metrics.memory.total} GB used ({metrics.memory.percentage}%)
                      </div>
                    </div>
                  </div>
                  <Badge status={metrics.memory.status} size="sm" />
                </div>
                <div className="mt-4 h-2 bg-[rgb(var(--color-progress-bg))] dark:bg-[rgb(var(--color-progress-bg-dark))] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[rgb(var(--color-primary))]" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${metrics.memory.percentage}%` }} 
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
          </Card>
          
          <Card title="Disk" isLoading={isLoading}>
            {metrics.disk ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <HardDrive className="mr-2 text-[rgb(var(--color-primary))]" size={24} />
                    <div>
                      <div className="text-2xl font-semibold">{metrics.disk.used} GB</div>
                      <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                        of {metrics.disk.total} GB used ({metrics.disk.percentage}%)
                      </div>
                    </div>
                  </div>
                  <Badge status={metrics.disk.status} text={`${metrics.disk.percentage}%`} size="sm" />
                </div>
                <div className="mt-4 h-2 bg-[rgb(var(--color-progress-bg))] dark:bg-[rgb(var(--color-progress-bg-dark))] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[rgb(var(--color-primary))]" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${metrics.disk.percentage}%` }} 
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
          </Card>
          
          <Card title="Network" isLoading={isLoading}>
            {metrics.network ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Wifi className="mr-2 text-[rgb(var(--color-primary))]" size={24} />
                    <div>
                      <div className="text-2xl font-semibold">{metrics.network.speed} MB/s</div>
                      <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                        {metrics.network.upload} MB/s ↑ / {metrics.network.download} MB/s ↓
                      </div>
                    </div>
                  </div>
                  <Badge status={metrics.network.status} size="sm" />
                </div>
                <div className="mt-4 h-2 bg-[rgb(var(--color-progress-bg))] dark:bg-[rgb(var(--color-progress-bg-dark))] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[rgb(var(--color-primary))]" 
                    initial={{ width: 0 }} 
                    animate={{ width: `${metrics.network.utilization}%` }} 
                    transition={{ duration: 0.5 }}
                  ></motion.div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}
          </Card>
        </div>
      </Panel>
      
      {/* Server Information Panel */}
      <Panel title="Server Information" description="Detailed server specifications and network information">
        {metrics.server_info ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="System Identity">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Server className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Hostname</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.hostname}</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Terminal className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Operating System</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.os}</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Info className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Architecture</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.architecture}</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Terminal className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Kernel Version</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.kernel}</div>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card title="Network Configuration">
              <div className="space-y-4">
                <div className="flex items-start">
                  <Network className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Private IP Address</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.private_ip}</div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Globe className="mt-0.5 mr-3 text-[rgb(var(--color-primary))]" size={20} />
                  <div>
                    <div className="font-medium">Public IP Address</div>
                    <div className="text-[rgb(var(--color-text-secondary))]">{metrics.server_info.public_ip}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center mt-6">
                  <Button 
                    variant="default"
                    leftIcon={<RefreshCw size={16} />}
                  >
                    Refresh Network Information
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="System Identity">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start">
                    <Skeleton className="h-5 w-5 mr-3" />
                    <div className="w-full">
                      <Skeleton className="h-4 w-1/3 mb-1" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <Card title="Network Configuration">
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-start">
                    <Skeleton className="h-5 w-5 mr-3" />
                    <div className="w-full">
                      <Skeleton className="h-4 w-1/3 mb-1" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-center mt-6">
                  <Skeleton className="h-10 w-48 rounded-md" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </Panel>
      
      {/* Middle row with two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Security Status" description="IceWall status report">
          <Card title="Security Posture" className="mb-4" isLoading={isLoading}>
            {metrics.security ? (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Shield className="mr-3 text-[rgb(var(--color-primary))]" size={32} />
                  <div>
                    <div className="text-lg font-medium">
                      {metrics.security.status === 'success' ? 'Secure' : 
                       metrics.security.status === 'warning' ? 'Warning' : 'Alert'}
                    </div>
                    <div className="text-sm text-[rgb(var(--color-text-secondary))]">
                      Last scan: {metrics.security.lastScan || 'Unknown'}
                    </div>
                  </div>
                </div>
                <Badge 
                  status={metrics.security.status} 
                  text={metrics.security.status === 'success' ? 'Protected' : 
                        metrics.security.status === 'warning' ? 'Caution' : 'At Risk'} 
                />
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Skeleton className="h-8 w-8 mr-3 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            )}
          </Card>
          
          <Card title="Recent Threats" isLoading={isLoading}>
            {metrics.threats && metrics.threats.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[rgb(var(--color-text-secondary))]">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.threats.map((threat, index) => (
                    <tr key={index} className="border-t border-[rgb(var(--color-border))]">
                      <td className="py-2">{threat.type}</td>
                      <td className="py-2">{threat.time}</td>
                      <td className="py-2"><Badge status={threat.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : metrics.threats && metrics.threats.length === 0 ? (
              <CardEmptyState message="No recent threats detected" />
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            )}
          </Card>
        </Panel>
        
        <Panel title="System Health" description="Active alerts and notifications">
          <Card title="Alerts" className="mb-4" isLoading={isLoading || isAlertsLoading}>
            {metrics.alerts ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="text-[rgb(var(--color-primary))] mr-2" size={20} />
                    <span>{metrics.alerts.length} active alerts require attention</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<RefreshCw size={16} />}
                    onClick={refreshAlerts}
                    isLoading={isAlertsLoading}
                  >
                    Refresh
                  </Button>
                </div>
                
                {metrics.alerts.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {metrics.alerts.map((alert, index) => (
                      <div 
                        key={index}
                        className={`border-l-4 ${
                          alert.severity === 'error' 
                            ? 'border-error-light dark:border-error' 
                            : 'border-warning-light dark:border-warning'
                        } pl-3 py-2`}
                      >
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-[rgb(var(--color-text-secondary))]">
                          Server ID: {alert.serverId}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 py-4 text-center text-[rgb(var(--color-text-secondary))]">
                    No active alerts
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            )}
          </Card>
          
          <Card title="System Uptime" isLoading={isLoading}>
            {metrics.uptime ? (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Activity className="mr-3 text-[rgb(var(--color-primary))]" size={24} />
                    <div>
                      <div className="text-lg font-medium">{metrics.uptime.percentage}% SLA</div>
                      <div className="text-sm text-[rgb(var(--color-text-secondary))]">
                        {metrics.uptime.duration ? `Current session: ${metrics.uptime.duration}` : 'Uptime data unavailable'}
                      </div>
                    </div>
                  </div>
                  <Badge 
                    status={metrics.uptime.percentage >= 99.9 ? 'success' : metrics.uptime.percentage >= 99.0 ? 'warning' : 'error'} 
                    text={`${metrics.uptime.percentage}%`}
                    size="sm" 
                  />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[rgb(var(--color-text-secondary))] mb-1">
                    <span>Annual uptime target: 99.9%</span>
                    <span>Actual: {metrics.uptime.percentage}%</span>
                  </div>
                  <div className="h-2 bg-[rgb(var(--color-progress-bg))] dark:bg-[rgb(var(--color-progress-bg-dark))] rounded-full overflow-hidden">
                    <motion.div 
                      className={`h-full ${
                        metrics.uptime.percentage >= 99.9 
                          ? 'bg-green-500' 
                          : metrics.uptime.percentage >= 99.0 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }} 
                      animate={{ width: `${Math.min(100, metrics.uptime.percentage)}%` }} 
                      transition={{ duration: 0.5 }}
                    ></motion.div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="h-6 w-6 mr-3 rounded" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            )}
          </Card>
        </Panel>
      </div>
      
      {/* Bottom row */}
      <Panel title="Additional Resources" defaultExpanded={false}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Documentation" collapsible defaultCollapsed={false}>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-[rgb(var(--color-primary))] rounded-full mr-2"></span>
                <a href="#" className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-light))] hover:underline">everyst User Guide</a>
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-[rgb(var(--color-primary))] rounded-full mr-2"></span>
                <a href="#" className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-light))] hover:underline">API Documentation</a>
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 bg-[rgb(var(--color-primary))] rounded-full mr-2"></span>
                <a href="#" className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-light))] hover:underline">Troubleshooting</a>
              </li>
            </ul>
          </Card>
          
          <Card title="Get Support" collapsible defaultCollapsed={true}>
            <CardEmptyState 
              message="Need help with everyst?"
              action={
                <Button variant="default">
                  Submit an issue
                </Button>
              }
            />
          </Card>
        </div>
      </Panel>
    </div>
  );
};
