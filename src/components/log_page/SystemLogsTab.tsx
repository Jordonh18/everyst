import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Table, TableBody, TableRow, TableCell, TableHeader, TableHead, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { 
  Search, 
  RefreshCw,
  Clock,
  AlertCircle,
  Server,
  Shield,
  Database,
  Globe,
  Activity,
  HardDrive,
  Monitor,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';
import { getApiUrl } from '../../utils/apiUrl';

// System log entry type
interface SystemLogEntry {
  raw: string;
  timestamp: string | null;
  level: string | null;
  message: string;
  source: string | null;
  process: string | null;
}

// System log info type
interface SystemLogInfo {
  paths: string[];
  description: string;
  category: string;
  format: string;
  path: string;
  size: number;
  last_modified: string;
}

// System logs dashboard data
interface SystemLogsDashboard {
  distribution: {
    ID: string;
    NAME: string;
    VERSION_ID: string;
  };
  logs: Record<string, {
    info: SystemLogInfo;
    stats: {
      total_recent_entries: number;
      level_distribution: Record<string, number>;
      file_size: number;
      last_modified: string;
    } | null;
  }>;
  summary: {
    total_logs: number;
    categories: Record<string, number>;
  };
}

// Category icons mapping
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'system': return <Server size={16} />;
    case 'security': return <Shield size={16} />;
    case 'webserver': return <Globe size={16} />;
    case 'database': return <Database size={16} />;
    case 'services': return <Activity size={16} />;
    case 'kernel': return <Monitor size={16} />;
    default: return <HardDrive size={16} />;
  }
};

// Level badge with appropriate color based on log severity
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const upperSeverity = severity.toUpperCase();
  const severityStyles: Record<string, string> = {
    'INFO': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'WARNING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'WARN': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'ERROR': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'CRITICAL': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'CRIT': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'DEBUG': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'NOTICE': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
  };

  const className = severityStyles[upperSeverity] || severityStyles['INFO'];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      {upperSeverity}
    </span>
  );
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
};

// System Logs Tab Component
const SystemLogsTab: React.FC = () => {
  const { user: currentUser, getAccessToken, canViewLogs } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  
  const [dashboard, setDashboard] = useState<SystemLogsDashboard | null>(null);
  const [selectedLog, setSelectedLog] = useState<string>('');
  const [logEntries, setLogEntries] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [lines, setLines] = useState<number>(100);

  // Fetch system logs dashboard
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const response = await fetch(`${getApiUrl()}/system-logs/dashboard/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You don\'t have permission to view system logs. Admin or Owner role required.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch system logs dashboard');
          }
        }
        
        const data = await response.json();
        setDashboard(data);
        
        // Set the first available log as selected
        const logNames = Object.keys(data.logs);
        if (logNames.length > 0) {
          setSelectedLog(logNames[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching system logs dashboard:', err);
        setError('Failed to load system logs. Please check permissions.');
        sendUserNotification(
          currentUser?.id as string,
          'Error',
          'Failed to load system logs data.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboard();
  }, [getAccessToken, sendUserNotification, currentUser]);

  // Fetch log entries when selected log changes
  useEffect(() => {
    const fetchLogEntries = async () => {
      if (!selectedLog || !dashboard) return;
      
      setEntriesLoading(true);
      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        const params = new URLSearchParams();
        params.append('lines', lines.toString());
        if (levelFilter !== 'all') {
          params.append('level', levelFilter);
        }
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        const response = await fetch(`${getApiUrl()}/system-logs/${encodeURIComponent(selectedLog)}/read/?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('You don\'t have permission to read system logs.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please log in again.');
          } else if (response.status === 404) {
            throw new Error(`Log file "${selectedLog}" not found.`);
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch log entries');
          }
        }
        
        const data = await response.json();
        setLogEntries(data.entries || []);
        
      } catch (err) {
        console.error('Error fetching log entries:', err);
        sendUserNotification(
          currentUser?.id as string,
          'Error',
          'Failed to load log entries.',
          'error'
        );
        setLogEntries([]);
      } finally {
        setEntriesLoading(false);
      }
    };
    
    fetchLogEntries();
  }, [selectedLog, dashboard, lines, levelFilter, searchTerm, getAccessToken, sendUserNotification, currentUser]);

  // Available log level options from entries
  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    logEntries.forEach(entry => {
      if (entry.level) {
        levels.add(entry.level.toUpperCase());
      }
    });
    return Array.from(levels).sort();
  }, [logEntries]);

  // Check permissions first
  if (!canViewLogs) {
    return (
      <div className="text-center py-8">
        <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-medium mb-2">Access Denied</h3>
        <p className="text-muted-foreground mb-4">
          You don't have permission to view system logs. Please contact your administrator.
        </p>
        <p className="text-sm text-muted-foreground">
          Required role: Admin or Owner
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-8">
          <div className="animate-pulse text-center">
            <div className="h-8 w-8 bg-muted rounded-full mx-auto mb-4"></div>
            <div className="h-4 w-48 bg-muted rounded mb-2"></div>
            <div className="h-4 w-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h3 className="text-lg font-medium mb-2">System Logs Unavailable</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No System Logs Found</h3>
        <p className="text-muted-foreground">No system logs are available on this server.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search log entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
          {/* Log Selection */}
          <Select value={selectedLog} onValueChange={setSelectedLog}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select log file" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dashboard.logs).map(([logName, logData]) => (
                <SelectItem key={logName} value={logName}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(logData.info.category)}
                    {logName}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {availableLevels.map(level => (
                <SelectItem key={level} value={level.toLowerCase()}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Lines */}
          <Select value={lines.toString()} onValueChange={(value) => setLines(parseInt(value))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50 lines</SelectItem>
              <SelectItem value="100">100 lines</SelectItem>
              <SelectItem value="500">500 lines</SelectItem>
              <SelectItem value="1000">1000 lines</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button 
            variant="outline" 
            aria-label="Refresh logs"
            title="Refresh logs"
            className="p-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Log Entries Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead className="w-[100px]">Level</TableHead>
            <TableHead className="w-[120px]">Source</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entriesLoading ? (
            // Loading state
            Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={`loading-${index}`} className="animate-pulse">
                <TableCell><div className="h-4 w-32 bg-muted rounded"></div></TableCell>
                <TableCell><div className="h-5 w-16 bg-muted rounded-full"></div></TableCell>
                <TableCell><div className="h-4 w-20 bg-muted rounded"></div></TableCell>
                <TableCell><div className="h-4 w-full bg-muted rounded"></div></TableCell>
              </TableRow>
            ))
          ) : logEntries.length === 0 ? (
            // Empty state
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-3" />
                <p className="text-lg font-medium mb-2">No Log Entries Found</p>
                <p className="text-sm">
                  {selectedLog ? 'No entries match your current filters' : 'Select a log file to view entries'}
                </p>
              </TableCell>
            </TableRow>
          ) : (
            // Log entries
            logEntries.map((entry, index) => (
              <TableRow key={index} className={index % 2 === 0 ? '' : 'bg-muted/5'}>
                <TableCell className="text-sm font-mono">
                  {entry.timestamp ? formatDate(entry.timestamp) : 'N/A'}
                </TableCell>
                <TableCell>
                  {entry.level ? (
                    <SeverityBadge severity={entry.level} />
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {entry.source || entry.process || 'N/A'}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="max-w-2xl">
                    <code className="text-xs whitespace-pre-wrap break-words">
                      {entry.message || entry.raw}
                    </code>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SystemLogsTab;
