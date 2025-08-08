import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../../components/ui';
import { Skeleton } from '../../components/skeletons/Skeleton';
import { 
  RefreshCw, Cpu, Server, HardDrive, Activity, Wifi, Shield, 
  AlertTriangle, Globe, Network, Terminal, Info, 
  Clock, Monitor
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../context/WebSocketContext';
import { socketService } from '../../utils/socket';
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
}

export const DashboardPage: React.FC = () => {
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
    historicalData: []
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

  // Add new data point to historical data
  const addToHistoricalData = (newData: RawMetricsData) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
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

    setMetrics(prev => ({
      ...prev,
      historicalData: [...prev.historicalData.slice(-19), newPoint] // Keep last 20 points
    }));
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

  // Chart configuration for shadcn charts
  const chartConfig = {
    cpu: {
      label: "CPU",
      color: "hsl(var(--chart-1))",
    },
    memory: {
      label: "Memory",
      color: "hsl(var(--chart-2))",
    },
    disk: {
      label: "Disk",
      color: "hsl(var(--chart-3))",
    },
    network: {
      label: "Network",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
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
          <CardContent className="p-6">
            {metrics.historicalData.length > 0 ? (
              <ChartContainer config={chartConfig} className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="timestamp" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="var(--color-cpu)"
                      strokeWidth={2}
                      dot={false}
                      name="CPU"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="var(--color-memory)"
                      strokeWidth={2}
                      dot={false}
                      name="Memory"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="disk" 
                      stroke="var(--color-disk)"
                      strokeWidth={2}
                      dot={false}
                      name="Disk"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="network" 
                      stroke="var(--color-network)"
                      strokeWidth={2}
                      dot={false}
                      name="Network"
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
        
        {/* Server Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server size={20} />
                System Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.server_info ? (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <Terminal className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg">{metrics.server_info.hostname}</div>
                      <div className="text-sm text-muted-foreground">Hostname</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Monitor className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg">{metrics.server_info.os}</div>
                      <div className="text-sm text-muted-foreground">Operating System</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Info className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg">{metrics.server_info.architecture}</div>
                      <div className="text-sm text-muted-foreground">Architecture</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Terminal className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg">{metrics.server_info.kernel}</div>
                      <div className="text-sm text-muted-foreground">Kernel Version</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center">
                      <Skeleton className="h-6 w-6 mr-4" />
                      <div className="w-full">
                        <Skeleton className="h-5 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network size={20} />
                Network & Uptime
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.server_info ? (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <Network className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg font-mono">{metrics.server_info.private_ip}</div>
                      <div className="text-sm text-muted-foreground">Private IP Address</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Globe className="mr-4 text-primary" size={24} />
                    <div>
                      <div className="font-medium text-lg font-mono">{metrics.server_info.public_ip}</div>
                      <div className="text-sm text-muted-foreground">Public IP Address</div>
                    </div>
                  </div>

                  {metrics.uptime && (
                    <div className="flex items-center">
                      <Clock className="mr-4 text-primary" size={24} />
                      <div>
                        <div className="font-medium text-lg">{formatUptime(metrics.uptime.duration)}</div>
                        <div className="text-sm text-muted-foreground">System Uptime</div>
                      </div>
                    </div>
                  )}

                  {metrics.security && (
                    <div className="flex items-center">
                      <Shield className="mr-4 text-primary" size={24} />
                      <div>
                        <div className="font-medium text-lg">
                          {metrics.security.status === 'success' ? 'Secure' : 
                           metrics.security.status === 'warning' ? 'Warning' : 'Alert'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Last scan: {metrics.security.lastScan || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="flex items-center">
                      <Skeleton className="h-6 w-6 mr-4" />
                      <div className="w-full">
                        <Skeleton className="h-5 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
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
