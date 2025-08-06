import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Table, TableBody, TableRow, TableCell, TableHeader, TableHead, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Card } from '../../components/ui';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { 
  Search, 
  RefreshCw,
  Clock,
  AlertCircle,
  FileDown,
  Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotificationsManager } from '../../hooks/state/useNotificationsManager';
import PermissionGate from '../../components/auth/PermissionGate';

// Helper function to get API URL
const getApiUrl = () => {
  return '/api';
};

// Activity log entry type - matches backend ApplicationLog model
interface ActivityLog {
  id: string;
  timestamp: string;
  user: {
    id: string;
    username: string;
    first_name?: string;
    last_name?: string;
  } | null;
  category: string;
  action: string;
  ip_address: string;
  user_agent?: string;
  details: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  object_type?: string;
  object_id?: string;
  object_name?: string;
  retention_days: number;
}

// Level badge with appropriate color based on log severity
const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const upperSeverity = severity.toUpperCase();
  const severityStyles: Record<string, string> = {
    'INFO': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'WARNING': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'ERROR': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'CRITICAL': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
  };

  const className = severityStyles[upperSeverity] || severityStyles['INFO'];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}>
      {upperSeverity}
    </span>
  );
};

// Format date for display in SIEM-standard format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  // SIEM standard: ISO 8601 format with timezone
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
};

// Convert action type to readable format
const formatActionType = (action: string): string => {
  const actionMap: Record<string, string> = {
    'auth_login': 'Login',
    'auth_logout': 'Logout', 
    'auth_failed': 'Failed Login',
    'user_create': 'User Created',
    'user_update': 'User Updated',
    'user_delete': 'User Deleted',
    'user_role_change': 'Role Changed',
    'logout': 'Logout',
    'logout_all': 'Logout All Devices'
  };
  
  return actionMap[action] || action
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Convert category to readable format
const formatCategory = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'auth': 'Authentication',
    'user': 'User Management',
    'security': 'Security',
    'system': 'System',
    'network': 'Network',
    'api': 'API Access',
    'admin': 'Admin Action',
    'data': 'Data Change'
  };
  
  return categoryMap[category] || category
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Props for ActivityLogs component
type ActivityLogsProps = Record<string, never>;

const ActivityLogs: React.FC<ActivityLogsProps> = () => {
  const { user: currentUser, getAccessToken } = useAuth();
  const { sendUserNotification } = useNotificationsManager();
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [uniqueActions, setUniqueActions] = useState<string[]>([]);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState<boolean>(false);

  // Table columns definition
  const activityTableColumns = [
    { key: 'timestamp', label: 'Timestamp' },
    { key: 'user', label: 'User' },
    { key: 'action', label: 'Action' },
    { key: 'category', label: 'Category/Object' },
    { key: 'description', label: 'Description' },
    { key: 'ip', label: 'IP Address' },
    { key: 'severity', label: 'Severity' }
  ];

  // Calculate date range options
  const dateRanges = useMemo(() => ({
    'all': { label: 'All Time' },
    '24h': { label: 'Last 24 hours', value: 24 * 60 * 60 * 1000 },
    '7d': { label: 'Last 7 days', value: 7 * 24 * 60 * 60 * 1000 },
    '30d': { label: 'Last 30 days', value: 30 * 24 * 60 * 60 * 1000 },
  }), []);

  // Fetch activity logs
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        if (!token) {
          throw new Error('Authentication token not found');
        }
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('page_size', '25'); // Limit to 25 items per page for better performance
        
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        
        if (severityFilter !== 'all') {
          params.append('severity', severityFilter);
        }
        
        if (actionFilter !== 'all') {
          params.append('action', actionFilter);
        }
        
        if (dateFilter !== 'all') {
          const now = new Date();
          const range = dateRanges[dateFilter as keyof typeof dateRanges];
          if (range && 'value' in range) {
            const pastDate = new Date(now.getTime() - range.value);
            params.append('timestamp_after', pastDate.toISOString());
          }
        }
        
        const response = await fetch(`${getApiUrl()}/activity-logs/?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch activity logs');
        }
        
        const data = await response.json();
        console.log('Activity logs API response:', data);
        
        // Handle pagination data
        if (data && typeof data === 'object') {
          // If it's paginated response with results property
          if (Array.isArray(data.results)) {
            setLogs(data.results);
            setTotalPages(Math.ceil(data.count / 10)); // Assuming 10 items per page
          } else if (Array.isArray(data)) {
            // If it's a direct array
            setLogs(data);
            setTotalPages(1);
          } else {
            // Fallback to empty array
            setLogs([]);
            setTotalPages(1);
          }
        }
        
        // Extract unique action types for filtering
        const actionTypes = new Set<string>();
        
        if (Array.isArray(data.results)) {
          data.results.forEach((log: ActivityLog) => {
            if (log.action) {
              actionTypes.add(log.action);
            }
          });
        } else if (Array.isArray(data)) {
          data.forEach((log: ActivityLog) => {
            if (log.action) {
              actionTypes.add(log.action);
            }
          });
        }
        
        setUniqueActions(Array.from(actionTypes));
        setError(null);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Failed to load activity logs. Please try again.');
        sendUserNotification(
          currentUser?.id as string,
          'Error',
          'Failed to load activity logs data.',
          'error'
        );
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [getAccessToken, sendUserNotification, currentUser, page, searchTerm, severityFilter, actionFilter, dateFilter, dateRanges]);
  
  // Filtered logs based on search term (client-side filtering as backup)
  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);
  
  // Handle resetting filters
  const resetFilters = () => {
    setSearchTerm('');
    setSeverityFilter('all');
    setActionFilter('all');
    setDateFilter('all');
    setPage(1);
  };

  // Handle page navigation
  const handlePreviousPage = () => {
    setPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setPage(prev => Math.min(prev + 1, totalPages));
  };

  // Export logs to CSV
  const exportToCsv = () => {
    try {
      if (logs.length === 0) {
        sendUserNotification(
          currentUser?.id as string,
          'Warning',
          'No logs to export.',
          'warning'
        );
        return;
      }
      
      // Define CSV headers
      const headers = ['ID', 'Timestamp', 'User', 'Action', 'Category', 'Object Type', 'Object ID', 'Object Name', 'IP Address', 'Severity'];
      
      // Convert logs to CSV rows
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const username = log.user ? log.user.username : (log.object_name || 'System');
        const description = (log.details?.message as string) || 'No description';
        const row = [
          log.id,
          log.timestamp,
          username,
          log.action,
          log.category,
          log.object_type || '',
          log.object_id || '',
          log.object_name || '',
          `"${description.replace(/"/g, '""')}"`, // Escape quotes in description
          log.ip_address,
          log.severity
        ];
        csvRows.push(row.join(','));
      });
      
      // Create CSV content and trigger download
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      sendUserNotification(
        currentUser?.id as string,
        'Success',
        'Activity logs exported successfully.',
        'success'
      );
    } catch (err) {
      console.error('Error exporting logs:', err);
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        'Failed to export activity logs.',
        'error'
      );
    }
  };

  // Purge old logs
  const purgeLogs = async () => {
    setShowPurgeConfirmModal(true);
  };

  const confirmPurgeLogs = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(`${getApiUrl()}/activity-logs/purge/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to purge logs');
      }

      const result = await response.json();
      
      sendUserNotification(
        currentUser?.id as string,
        'Success',
        `Successfully purged ${result.deleted_count || 0} old log entries.`,
        'success'
      );

      // Refresh the logs after purging
      setPage(1); // Reset to first page to trigger useEffect
      setShowPurgeConfirmModal(false);
    } catch (err) {
      console.error('Error purging logs:', err);
      sendUserNotification(
        currentUser?.id as string,
        'Error',
        'Failed to purge old logs.',
        'error'
      );
      setShowPurgeConfirmModal(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <PermissionGate 
        permission="canViewLogs"
        fallback={
          <Card className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="p-4 text-yellow-800 dark:text-yellow-200">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                <h3 className="font-medium">Insufficient Permissions</h3>
              </div>
              <p className="mt-1 text-sm">
                You don't have permission to view activity logs. Contact your administrator for access.
              </p>
            </div>
          </Card>
        }
      >
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
              {/* Severity Filter */}
              <div className="relative">
                <Select
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Action Filter */}
              <div className="relative">
                <Select
                  value={actionFilter}
                  onValueChange={setActionFilter}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem 
                        key={action} 
                        value={action}
                      >
                        {formatActionType(action)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Range Filter */}
              <div className="relative">
                <Select
                  value={dateFilter}
                  onValueChange={setDateFilter}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dateRanges).map(([key, { label }]) => (
                      <SelectItem 
                        key={key} 
                        value={key}
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Reset Filters Button */}
              <Button
                onClick={resetFilters}
                variant="ghost"
                className="py-2"
              >
                Reset
              </Button>
              
              {/* Refresh Button */}
              <Button 
                variant="outline" 
                aria-label="Refresh logs"
                title="Refresh logs"
                className="p-2"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 500); // Simulate refresh
                }}
              >
                <RefreshCw size={16} />
              </Button>
              
              {/* Export Button */}
              <Button
                onClick={exportToCsv}
                variant="default"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </Button>

              {/* Purge Button */}
              <Button
                onClick={purgeLogs}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Purge Logs
              </Button>
            </div>
          </div>
          
          {/* Logs Table */}
          <Table>
            <TableHeader>
              <TableRow>
                {activityTableColumns.map((column) => (
                  <TableHead key={column.key}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading state
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`loading-${index}`} className="animate-pulse">
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-4 w-32 bg-muted rounded"></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-16 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-48 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 w-24 bg-muted rounded"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 bg-muted rounded-full"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                // Error state
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                    <p className="text-lg font-medium mb-2">Error Loading Logs</p>
                    <p className="text-sm mb-4">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <Clock className="h-8 w-8 mx-auto mb-3" />
                    <p className="text-lg font-medium mb-2">No Activity Logs Found</p>
                    <p className="text-sm mb-4">
                      {(searchTerm || severityFilter !== 'all' || actionFilter !== 'all' || dateFilter !== 'all') 
                        ? 'No logs match your current filters' 
                        : 'No activity logs are available'
                      }
                    </p>
                    {(searchTerm || severityFilter !== 'all' || actionFilter !== 'all' || dateFilter !== 'all') && (
                      <Button
                        onClick={resetFilters}
                        variant="outline"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                // Log list
                filteredLogs.map((log, index) => (
                  <TableRow 
                    key={log.id} 
                    className={index % 2 === 0 ? '' : 'bg-muted/5'}
                  >
                    <TableCell className="text-sm font-mono">
                      <div className="whitespace-nowrap">{formatDate(log.timestamp)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {log.user ? (
                          <>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={undefined} alt={log.user.first_name && log.user.last_name 
                                ? `${log.user.first_name} ${log.user.last_name}` 
                                : log.user.username} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                                {log.user.first_name ? log.user.first_name[0] : log.user.username[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <div className="text-sm font-medium">
                                {log.user.first_name && log.user.last_name 
                                  ? `${log.user.first_name} ${log.user.last_name}` 
                                  : log.user.username}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={undefined} alt="System" />
                              <AvatarFallback className="bg-muted-foreground text-background text-xs font-medium">
                                {log.object_name ? log.object_name[0] : 'S'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                {log.object_name && (log.action === 'auth_failed' || log.action === 'auth_login') 
                                  ? `${log.object_name} (Failed)` 
                                  : 'System'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatActionType(log.action)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatCategory(log.category)}</span>
                        {log.object_type && (
                          <span className="text-xs text-muted-foreground">
                            {log.object_type}
                            {log.object_id && ` #${log.object_id}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-md">
                      <div className="truncate">
                        {(log.details?.message as string) || log.object_name || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {log.ip_address}
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={log.severity} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {!loading && !error && filteredLogs.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={handlePreviousPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={handleNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </PermissionGate>

      {/* Purge Confirmation Dialog */}
      <AlertDialog open={showPurgeConfirmModal} onOpenChange={setShowPurgeConfirmModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purge Old Logs</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to purge old logs? This will permanently delete old activity log entries and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPurgeConfirmModal(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurgeLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Purge Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivityLogs;
