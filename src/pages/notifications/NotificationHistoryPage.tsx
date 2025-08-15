/**
 * Notification History Page - View all notifications with filtering and search
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft,
  Search, 
  Filter,
  MoreHorizontal,
  Mail,
  MailOpen,
  Trash2,
  Calendar,
  Tag,
  Bell,
  CheckCheck,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { alertsApi } from '@/utils/alertsApi';
import type { 
  NotificationHistoryItem,
  NotificationFilters,
  NotificationStats
} from '@/types/alerts';

interface NotificationHistoryState {
  notifications: NotificationHistoryItem[];
  stats: NotificationStats | null;
  filters: NotificationFilters;
  selectedNotifications: number[];
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
}

export const NotificationHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<NotificationHistoryState>({
    notifications: [],
    stats: null,
    filters: {},
    selectedNotifications: [],
    isLoading: true,
    hasMore: false,
    currentPage: 1
  });

  // Load notifications and stats
  const loadData = useCallback(async (page = 1, reset = false) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const [notificationsResponse, statsResponse] = await Promise.all([
        alertsApi.history.list({ ...state.filters, page: page.toString() }),
        alertsApi.history.stats()
      ]);
      
      setState(prev => ({
        ...prev,
        notifications: reset ? notificationsResponse.results : [...prev.notifications, ...notificationsResponse.results],
        stats: statsResponse,
        hasMore: !!notificationsResponse.next,
        currentPage: page,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.filters]);

  // Initial load
  useEffect(() => {
    loadData(1, true);
  }, [loadData]);

  // Apply filters
  const handleFilterChange = (newFilters: Partial<NotificationFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
      notifications: [],
      currentPage: 1
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setState(prev => ({
      ...prev,
      filters: {},
      notifications: [],
      currentPage: 1
    }));
  };

  // Load more notifications
  const loadMore = () => {
    if (!state.isLoading && state.hasMore) {
      loadData(state.currentPage + 1, false);
    }
  };

  // Mark notification as read/unread
  const handleToggleRead = async (notificationId: number, currentRead: boolean) => {
    try {
      if (currentRead) {
        // Mark as unread - we'll need to implement this endpoint
        toast.info('Mark as unread functionality coming soon');
      } else {
        await alertsApi.history.markRead(notificationId);
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(notif =>
            notif.id === notificationId 
              ? { ...notif, read: true, read_at: new Date().toISOString() }
              : notif
          )
        }));
        toast.success('Notification marked as read');
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error);
      toast.error('Failed to update notification');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await alertsApi.history.markAllRead();
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notif => ({ 
          ...notif, 
          read: true, 
          read_at: new Date().toISOString() 
        }))
      }));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDeleteNotification = async (notificationId: number) => {
    try {
      await alertsApi.history.delete(notificationId);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(notif => notif.id !== notificationId),
        selectedNotifications: prev.selectedNotifications.filter(id => id !== notificationId)
      }));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Bulk actions
  const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'delete') => {
    if (state.selectedNotifications.length === 0) return;
    
    try {
      await alertsApi.history.bulkAction({
        action,
        notification_ids: state.selectedNotifications
      });
      
      setState(prev => ({
        ...prev,
        notifications: action === 'delete' 
          ? prev.notifications.filter(notif => !state.selectedNotifications.includes(notif.id))
          : prev.notifications.map(notif =>
              state.selectedNotifications.includes(notif.id)
                ? { ...notif, read: action === 'mark_read', read_at: action === 'mark_read' ? new Date().toISOString() : null }
                : notif
            ),
        selectedNotifications: []
      }));
      
      toast.success(`${state.selectedNotifications.length} notifications updated`);
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
      toast.error('Failed to update notifications');
    }
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedNotifications: checked ? prev.notifications.map(notif => notif.id) : []
    }));
  };

  const handleSelectNotification = (notificationId: number, checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedNotifications: checked 
        ? [...prev.selectedNotifications, notificationId]
        : prev.selectedNotifications.filter(id => id !== notificationId)
    }));
  };

  // Get notification type badge variant
  const getNotificationTypeBadge = (type: string) => {
    switch (type) {
      case 'error':
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'success':
        return 'default';
      case 'info':
      case 'system':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notification History</h1>
            <p className="text-muted-foreground">
              View and manage all your notifications
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => loadData(1, true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleMarkAllRead} size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {state.stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.stats.total_count}</div>
              <p className="text-xs text-muted-foreground">
                All time notifications
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.stats.unread_count}</div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read</CardTitle>
              <MailOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.stats.read_count}</div>
              <p className="text-xs text-muted-foreground">
                Already reviewed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.stats.recent_count}</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={state.filters.search || ''}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={state.filters.read?.toString() || 'all'}
                onValueChange={(value) => handleFilterChange({ 
                  read: value === 'all' ? undefined : value === 'true' 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="false">Unread</SelectItem>
                  <SelectItem value="true">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={state.filters.type || 'all'}
                onValueChange={(value) => handleFilterChange({ 
                  type: value === 'all' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={state.filters.category || 'all'}
                onValueChange={(value) => handleFilterChange({ 
                  category: value === 'all' ? undefined : value 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="alerts">Alerts</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="integrations">Integrations</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {Object.keys(state.filters).length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {Object.entries(state.filters).map(([key, value]) => (
                  value && (
                    <Badge key={key} variant="secondary">
                      {key}: {value.toString()}
                    </Badge>
                  )
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {state.selectedNotifications.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {state.selectedNotifications.length} notification(s) selected
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('mark_read')}
                >
                  <MailOpen className="h-4 w-4 mr-2" />
                  Mark Read
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('mark_unread')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Mark Unread
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Chronological list of all notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={state.selectedNotifications.length === state.notifications.length && state.notifications.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.isLoading && state.notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading notifications...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : state.notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No notifications found</h3>
                      <p className="text-muted-foreground">
                        {Object.keys(state.filters).length > 0 
                          ? 'Try adjusting your filters' 
                          : 'Notifications will appear here when you receive them'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                state.notifications.map((notification) => (
                  <TableRow key={notification.id} className={notification.read ? 'opacity-60' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={state.selectedNotifications.includes(notification.id)}
                        onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {notification.read ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {notification.read ? 'Read' : 'Unread'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notification.title}</div>
                        {notification.message && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </div>
                        )}
                        {notification.alert_configuration_name && (
                          <div className="text-xs text-muted-foreground">
                            Alert: {notification.alert_configuration_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getNotificationTypeBadge(notification.notification_type)}>
                        {notification.notification_type_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {notification.category && (
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {notification.category}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {notification.source || 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{new Date(notification.delivered_at).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">
                          {new Date(notification.delivered_at).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {notification.time_since_delivered}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => handleToggleRead(notification.id, notification.read)}
                          >
                            {notification.read ? (
                              <>
                                <Mail className="h-4 w-4 mr-2" />
                                Mark Unread
                              </>
                            ) : (
                              <>
                                <MailOpen className="h-4 w-4 mr-2" />
                                Mark Read
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Load More */}
          {state.hasMore && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={loadMore}
                disabled={state.isLoading}
              >
                {state.isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
