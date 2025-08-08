import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Badge, Button } from '../../components/ui';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { 
  RefreshCw, Cpu, Server, HardDrive, Activity, Wifi, Shield, 
  AlertTriangle, Network, Settings, Users, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../context/WebSocketContext';
import { socketService } from '../../utils/socket';
import { useAuth } from '../../context/AuthContext';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../../components/ui/chart";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer
} from 'recharts';

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

// Additional data types for new dashboard features
interface PortInfo {
  port: number;
  protocol: string;
  service: string;
  status: 'listening' | 'closed';
  process?: string;
}

interface ServiceInfo {
  name: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
  uptime?: string;
  description: string;
}

interface SessionInfo {
  user: string;
  type: 'ssh' | 'web' | 'api';
  ip: string;
  started: string;
  duration?: string;
}

interface ApiResponseTime {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: string;
}

// Historical data point for charts
interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
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
  historicalData: MetricPoint[];
  // New dashboard features
  ports: PortInfo[];
  services: ServiceInfo[];
  sessions: SessionInfo[];
  apiResponseTimes: ApiResponseTime[];
}

export const DashboardPage: React.FC = () => {
  const { getAccessToken } = useAuth();
  
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
    server_info: undefined,
    historicalData: [],
    ports: [],
    services: [],
    sessions: [],
    apiResponseTimes: []
  });
  
  // Loading state
  const [isMetricsLoading, setIsMetricsLoading] = useState<boolean>(true);
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

  // Format uptime duration
  const formatUptime = (duration: string | null): string => {
    if (!duration) return 'Unknown';
    return duration;
  };

  // Function to fetch additional dashboard data
  const fetchDashboardData = React.useCallback(async () => {
    if (!getAccessToken()) return;

    try {
      const token = getAccessToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch port information using dedicated endpoint
      const portsResponse = await fetch('/api/system/ports/', {
        method: 'GET',
        headers,
      });

      // Fetch running services
      const servicesResponse = await fetch('/api/system/services/', {
        method: 'GET',
        headers,
      });

      // Fetch active sessions
      const sessionsResponse = await fetch('/api/system/sessions/', {
        method: 'GET',
        headers,
      });

      // Fetch API response times
      const apiTimesResponse = await fetch('/api/system/api-times/', {
        method: 'GET',
        headers,
      });

      // Process port data
      if (portsResponse.ok) {
        const portsData = await portsResponse.json();
        setMetrics(prev => ({ ...prev, ports: portsData || [] }));
      }

      // Process services data
      if (servicesResponse.ok) {
        const servicesData = await servicesResponse.json();
        setMetrics(prev => ({ ...prev, services: servicesData || [] }));
      }

      // Process sessions data  
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setMetrics(prev => ({ ...prev, sessions: sessionsData || [] }));
      }

      // Process API response times
      if (apiTimesResponse.ok) {
        const apiTimesData = await apiTimesResponse.json();
        setMetrics(prev => ({ ...prev, apiResponseTimes: apiTimesData || [] }));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [getAccessToken]);

  // Add new data point to historical data with proper management
  const addToHistoricalData = (newData: RawMetricsData) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit',
      minute: '2-digit', 
      second: '2-digit' 
    });

    const newPoint: MetricPoint = {
      timestamp,
      cpu: newData.cpu_usage || 0,
      memory: newData.memory_usage || 0,
      disk: newData.disk_usage || 0,
      network: Math.min(100, ((newData.network_tx + newData.network_rx) / (1024 * 1024)) / 125 * 100) // Network utilization as percentage
    };

    setMetrics(prev => {
      // Keep only the last 20 points and ensure no duplicates
      const existingData = prev.historicalData;
      const lastPoint = existingData[existingData.length - 1];
      
      // Only add if timestamp is different from last point
      if (!lastPoint || lastPoint.timestamp !== timestamp) {
        const newData = [...existingData, newPoint].slice(-20);
        return {
          ...prev,
          historicalData: newData
        };
      }
      
      return prev;
    });
  };
  
  // Process metrics data from socket
  const processMetricsData = React.useCallback((data: RawMetricsData) => {
    if (!data) return;

    const cpuStatus = getStatus(data.cpu_usage || 0);
    const memoryStatus = getStatus(data.memory_usage || 0);
    const diskStatus = getStatus(data.disk_usage || 0);

    // Calculate network utilization percentage
    const MAX_NETWORK_SPEED_MBS = 125;
    const networkSpeedMBs = ((data.network_tx || 0) + (data.network_rx || 0)) / (1024 * 1024);
    const networkUtilPercent = Math.min(100, (networkSpeedMBs / MAX_NETWORK_SPEED_MBS) * 100);
    const networkStatus = getStatus(networkUtilPercent);

    const processed = {
      cpu: {
        usage: data.cpu_usage || 0,
        cores: data.cpu_cores || 0,
        speed: data.cpu_speed || 0,
        status: cpuStatus,
      },
      memory: {
        used: data.memory_used || 0,
        total: data.memory_total || 0,
        percentage: data.memory_usage || 0,
        status: memoryStatus,
      },
      disk: {
        used: data.disk_used || 0,
        total: data.disk_total || 0,
        percentage: data.disk_usage || 0,
        status: diskStatus,
      },
      network: {
        speed: parseFloat(networkSpeedMBs.toFixed(2)),
        upload: parseFloat(((data.network_tx || 0) / (1024 * 1024)).toFixed(2)),
        download: parseFloat(((data.network_rx || 0) / (1024 * 1024)).toFixed(2)),
        utilization: networkUtilPercent,
        status: networkStatus,
      },
      uptime: data.uptime || null,
      server_info: data.server_info || undefined,
      security: data.security || null,
      threats: data.threats || [],
      alerts: data.alerts || [],
    };

    return processed;
  }, []);

  // Function to refresh metrics
  const refreshMetrics = () => {
    setIsMetricsLoading(true);
    fetchDashboardData(); // Fetch additional data
    
    setTimeout(() => {
      setIsMetricsLoading(false);
    }, 1000);
  };
  
  // Set up metrics data listener
  useEffect(() => {
    if (!isConnected) {
      setIsMetricsLoading(true);
      return;
    }

    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket instance not available');
      setError('Socket connection not available');
      setIsMetricsLoading(false);
      return;
    }
    
    // Function to handle incoming metrics
    const handleMetricsUpdate = (rawData: RawMetricsData) => {
      const processed = processMetricsData(rawData);
      
      if (processed) {
        setMetrics((prevMetrics) => ({
          ...prevMetrics,
          ...processed,
        }));
        
        // Add to historical data
        addToHistoricalData(rawData);
        
        setIsMetricsLoading(false);
      }
    };
    
    socket.on('metrics_update', handleMetricsUpdate);
    setError(null);
    
    // Fetch initial dashboard data
    fetchDashboardData();
    
    return () => {
      socket.off('metrics_update', handleMetricsUpdate);
    };
  }, [isConnected, processMetricsData, fetchDashboardData]);

  // Fetch additional dashboard data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected && !isMetricsLoading) {
        fetchDashboardData();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, isMetricsLoading, fetchDashboardData]);

  // Update error state when connection status changes
  useEffect(() => {
    if (!isConnected) {
      setError('Connection lost to metrics server');
    } else {
      setError(null);
    }
  }, [isConnected]);

  // Chart configuration for shadcn charts
  const chartConfig = {
    cpu: {
      label: "CPU",
      color: "#3b82f6",
    },
    memory: {
      label: "Memory", 
      color: "#ef4444",
    },
    disk: {
      label: "Disk",
      color: "#f59e0b",
    },
    network: {
      label: "Network",
      color: "#10b981",
    },
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshMetrics}
              disabled={isMetricsLoading}
            >
              <RefreshCw size={16} className={isMetricsLoading ? 'animate-spin' : ''} />
            </Button>
            <Badge 
              variant={error ? 'destructive' : isConnected ? 'default' : 'secondary'}
            >
              {error ? 'Connection Error' : isConnected ? 'Live Metrics' : 'Connecting...'}
            </Badge>
          </div>
        </div>
        
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Cpu size={20} />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.cpu ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-bold">{metrics.cpu.usage}%</div>
                      <div className="text-xs text-muted-foreground">
                        {metrics.cpu.cores} cores @ {metrics.cpu.speed}GHz
                      </div>
                    </div>
                    <Badge variant={
                      metrics.cpu.status === 'success' ? 'default' : 
                      metrics.cpu.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {metrics.cpu.status === 'success' ? 'Normal' : 
                       metrics.cpu.status === 'warning' ? 'High' : 'Critical'}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
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
            </CardContent>
          </Card>
          
          {/* Memory Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Server size={20} />
                Memory
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.memory ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-bold">{metrics.memory.used.toFixed(1)} GB</div>
                      <div className="text-xs text-muted-foreground">
                        of {metrics.memory.total} GB ({metrics.memory.percentage}%)
                      </div>
                    </div>
                    <Badge variant={
                      metrics.memory.status === 'success' ? 'default' : 
                      metrics.memory.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {metrics.memory.percentage}%
                    </Badge>
                  </div>
                  
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
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
            </CardContent>
          </Card>
          
          {/* Storage Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <HardDrive size={20} />
                Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.disk ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-bold">{metrics.disk.used} GB</div>
                      <div className="text-xs text-muted-foreground">
                        of {metrics.disk.total} GB ({metrics.disk.percentage}%)
                      </div>
                    </div>
                    <Badge variant={
                      metrics.disk.status === 'success' ? 'default' : 
                      metrics.disk.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {metrics.disk.percentage}%
                    </Badge>
                  </div>
                  
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
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
            </CardContent>
          </Card>
          
          {/* Network Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Wifi size={20} />
                Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.network ? (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-2xl font-bold">{metrics.network.speed} MB/s</div>
                      <div className="text-xs text-muted-foreground">
                        ↑ {metrics.network.upload} MB/s ↓ {metrics.network.download} MB/s
                      </div>
                    </div>
                    <Badge variant={
                      metrics.network.status === 'success' ? 'default' : 
                      metrics.network.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {metrics.network.utilization.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary" 
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
            </CardContent>
          </Card>
        </div>

        {/* Performance Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Performance Trends
            </CardTitle>
            <CardDescription>
              Real-time monitoring of CPU, Memory, Disk, and Network utilization over the last 20 data points
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {metrics.historicalData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      height={20}
                      tick={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: 'Usage (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [
                          `${Number(value).toFixed(1)}%`,
                          name
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="CPU"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Memory"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="disk" 
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Disk"
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="network" 
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Network"
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-full h-64 bg-muted rounded animate-pulse"></div>
                  <p className="text-muted-foreground mt-4">Collecting performance data...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* New Dashboard Features Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Port Information */}
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network size={18} className="text-blue-500" />
                  <span className="text-base font-semibold">Open Ports</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.ports.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.ports.length > 0 ? (
                metrics.ports.slice(0, 6).map((port, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex flex-col">
                      <span className="font-mono font-semibold text-sm">{port.port}/{port.protocol}</span>
                      <span className="text-xs text-muted-foreground">{port.process || 'Unknown'}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {port.service}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex flex-col space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-5 w-12" />
                    </div>
                  ))}
                </div>
              )}
              {metrics.ports.length > 6 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{metrics.ports.length - 6} more ports
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Running Services */}
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings size={18} className="text-green-500" />
                  <span className="text-base font-semibold">Services</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.services.filter(s => s.status === 'running').length}/{metrics.services.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.services.length > 0 ? (
                metrics.services.slice(0, 6).map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{service.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {service.pid ? `PID: ${service.pid}` : 'No PID'} 
                        {service.uptime && ` • ${service.uptime}`}
                      </span>
                    </div>
                    <Badge 
                      variant={service.status === 'running' ? 'default' : service.status === 'stopped' ? 'secondary' : 'destructive'} 
                      className="text-xs shrink-0 ml-2"
                    >
                      {service.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex flex-col space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              )}
              {metrics.services.length > 6 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{metrics.services.length - 6} more services
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-purple-500" />
                  <span className="text-base font-semibold">Active Sessions</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.sessions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.sessions.length > 0 ? (
                metrics.sessions.slice(0, 6).map((session, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{session.user}</span>
                      <span className="text-xs text-muted-foreground font-mono">{session.ip}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <Badge variant="outline" className="text-xs mb-1">
                        {session.type.toUpperCase()}
                      </Badge>
                      {session.duration && (
                        <span className="text-xs text-muted-foreground">{session.duration}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex flex-col space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {metrics.sessions.length > 6 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{metrics.sessions.length - 6} more sessions
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Response Times */}
          <Card className="h-full">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-yellow-500" />
                  <span className="text-base font-semibold">API Performance</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.apiResponseTimes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.apiResponseTimes.length > 0 ? (
                metrics.apiResponseTimes.slice(0, 6).map((api, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium text-sm truncate">{api.endpoint}</span>
                      <span className="text-xs text-muted-foreground">{api.method} • Status {api.status}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <Badge 
                        variant={api.responseTime > 1000 ? 'destructive' : api.responseTime > 500 ? 'secondary' : 'default'} 
                        className="text-xs"
                      >
                        {api.responseTime}ms
                      </Badge>
                      <span className="text-xs text-muted-foreground mt-1">
                        {new Date(api.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex flex-col space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {metrics.apiResponseTimes.length > 6 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{metrics.apiResponseTimes.length - 6} more endpoints
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Compact Server Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server size={18} />
                System Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.server_info ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Hostname</div>
                    <div className="font-medium">{metrics.server_info.hostname}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">OS</div>
                    <div className="font-medium">{metrics.server_info.os}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Architecture</div>
                    <div className="font-medium">{metrics.server_info.architecture}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Kernel</div>
                    <div className="font-medium">{metrics.server_info.kernel}</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Network size={18} />
                Network & Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.server_info ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Private IP</div>
                    <div className="font-medium font-mono">{metrics.server_info.private_ip}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Public IP</div>
                    <div className="font-medium font-mono">{metrics.server_info.public_ip}</div>
                  </div>
                  {metrics.uptime && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">System Uptime</div>
                      <div className="font-medium">{formatUptime(metrics.uptime.duration)}</div>
                    </div>
                  )}
                  {metrics.security && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Security Status</div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">
                          {metrics.security.status === 'success' ? 'Secure' : 
                           metrics.security.status === 'warning' ? 'Warning' : 'Alert'}
                        </div>
                        <Badge variant={
                          metrics.security.status === 'success' ? 'default' : 
                          metrics.security.status === 'warning' ? 'secondary' : 'destructive'
                        } className="text-xs">
                          {metrics.security.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Alerts and Activity */}
        {(metrics.alerts.length > 0 || metrics.threats.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Alerts */}
            {metrics.alerts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Active Alerts ({metrics.alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.alerts.map((alert, index) => (
                      <div 
                        key={index}
                        className={`border-l-4 ${
                          alert.severity === 'error' 
                            ? 'border-destructive bg-red-50 dark:bg-red-900/20' 
                            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        } pl-4 py-3 rounded-r-lg`}
                      >
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Server ID: {alert.serverId}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Recent Threats */}
            {metrics.threats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield size={20} />
                    Recent Security Events ({metrics.threats.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.threats.slice(0, 5).map((threat, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{threat.type}</div>
                          <div className="text-sm text-muted-foreground">{threat.time}</div>
                        </div>
                        <Badge variant={
                          threat.status === 'success' ? 'default' : 
                          threat.status === 'warning' ? 'secondary' : 'destructive'
                        }>
                          {threat.status === 'success' ? 'Blocked' : 
                           threat.status === 'warning' ? 'Monitored' : 'Active'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* No Issues State */}
        {metrics.alerts.length === 0 && metrics.threats.length === 0 && !isMetricsLoading && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Activity className="mx-auto mb-3 text-green-500" size={48} />
                <h3 className="text-lg font-medium">All Systems Operational</h3>
                <p className="text-muted-foreground">No active alerts or security threats detected</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
