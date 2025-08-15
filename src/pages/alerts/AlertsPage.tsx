/**
 * Enhanced Alerts/Metrics Page - Alert Management and Configuration
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  Bell,
  Play,
  Pause,
  Edit,
  Trash2,
  TestTube,
  Download,
  Upload,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { alertsApi } from '@/utils/alertsApi';
import { AlertWizard } from '@/components/alerts/AlertWizard';
import type { 
  AlertConfiguration, 
  AlertMetrics, 
  AlertFilters,
  AlertTestResponse
} from '@/types/alerts';

interface AlertsPageState {
  alerts: AlertConfiguration[];
  metrics: AlertMetrics | null;
  filters: AlertFilters;
  selectedAlerts: string[];
  isLoading: boolean;
  showCreateDialog: boolean;
  showEditDialog: boolean;
  editingAlert: AlertConfiguration | null;
  showTestDialog: boolean;
  testingAlert: AlertConfiguration | null;
  testResult: AlertTestResponse | null;
  testValue: string;
  isTesting: boolean;
}

export const AlertsPage: React.FC = () => {
  const [state, setState] = useState<AlertsPageState>({
    alerts: [],
    metrics: null,
    filters: {},
    selectedAlerts: [],
    isLoading: true,
    showCreateDialog: false,
    showEditDialog: false,
    editingAlert: null,
    showTestDialog: false,
    testingAlert: null,
    testResult: null,
    testValue: '',
    isTesting: false,
  });

  // Load alerts and metrics
  const loadData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const [alertsResponse, metricsResponse] = await Promise.all([
        alertsApi.configurations.list(state.filters),
        alertsApi.configurations.metrics()
      ]);
      
      setState(prev => ({
        ...prev,
        alerts: alertsResponse.results,
        metrics: metricsResponse,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load alerts data:', error);
      toast('Error: Failed to load alerts data');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<AlertFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  };

  // Handle alert toggle
  const handleToggleAlert = async (alertId: string) => {
    try {
      const result = await alertsApi.configurations.toggle(alertId);
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === alertId ? { ...alert, enabled: result.enabled } : alert
        )
      }));
      
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to toggle alert:', error);
      toast.error('Failed to toggle alert');
    }
  };

  // Handle bulk operations
  const handleBulkToggle = async (enable: boolean) => {
    if (state.selectedAlerts.length === 0) return;
    
    try {
      const result = await alertsApi.configurations.bulkToggle({
        alert_ids: state.selectedAlerts,
        enable
      });
      
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          state.selectedAlerts.includes(alert.id) 
            ? { ...alert, enabled: enable } 
            : alert
        ),
        selectedAlerts: []
      }));
      
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to bulk toggle alerts:', error);
      toast.error('Failed to bulk toggle alerts');
    }
  };

  // Handle alert testing
  const handleTestAlert = async (alert: AlertConfiguration) => {
    // Set a default test value that would trigger the alert for demonstration
    const defaultTestValue = getDefaultTestValue(alert);
    
    setState(prev => ({ 
      ...prev, 
      testingAlert: alert, 
      showTestDialog: true,
      testResult: null,
      testValue: defaultTestValue,
      isTesting: false
    }));
  };

  // Get a sensible default test value based on the alert configuration
  const getDefaultTestValue = (alert: AlertConfiguration): string => {
    const threshold = alert.threshold_value;
    const operator = alert.condition_operator;
    
    // Suggest a value that would trigger the alert
    switch (operator) {
      case 'gt':
      case 'gte':
        return (threshold + 10).toString();
      case 'lt':
      case 'lte':
        return Math.max(0, threshold - 10).toString();
      case 'eq':
        return threshold.toString();
      case 'ne':
        return (threshold + 1).toString();
      default:
        return threshold.toString();
    }
  };

  // Evaluate condition for preview
  const evaluateCondition = (value: number, threshold: number, operator: string): boolean => {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      default: return false;
    }
  };

  // Handle running the test with custom value
  const handleRunTest = async () => {
    if (!state.testingAlert) return;
    
    setState(prev => ({ ...prev, isTesting: true, testResult: null }));
    
    try {
      const testValueNum = parseFloat(state.testValue);
      if (isNaN(testValueNum)) {
        toast.error('Please enter a valid number');
        return;
      }
      
      const result = await alertsApi.configurations.test(state.testingAlert.id, {
        test_value: testValueNum
      });
      setState(prev => ({ ...prev, testResult: result }));
      
      if (result.would_trigger && result.condition_met) {
        const deliveryCount = Object.keys(result.delivery_results || {}).length;
        if (deliveryCount > 0) {
          toast.success(`Alert triggered! Executed ${deliveryCount} delivery method(s). Check your notifications.`);
        } else {
          toast.success('Alert condition met, but no delivery methods are configured.');
        }
      } else if (result.condition_met) {
        toast.info('Alert condition met, but alert is currently throttled.');
      } else {
        toast.success('Alert test completed - Condition not met, alert would not trigger.');
      }
    } catch (error) {
      console.error('Failed to test alert:', error);
      toast.error('Failed to test alert');
    } finally {
      setState(prev => ({ ...prev, isTesting: false }));
    }
  };

  // Handle editing an alert
  const handleEditAlert = (alert: AlertConfiguration) => {
    setState(prev => ({
      ...prev,
      editingAlert: alert,
      showEditDialog: true
    }));
  };

  // Handle alert deletion
  const handleDeleteAlert = async (alertId: string) => {
    try {
      await alertsApi.configurations.delete(alertId);
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.filter(alert => alert.id !== alertId),
        selectedAlerts: prev.selectedAlerts.filter(id => id !== alertId)
      }));
      
      toast.success('Alert deleted successfully');
    } catch (error) {
      console.error('Failed to delete alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  // Get severity badge variant
  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  // Get metric type icon
  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'cpu': return <Activity className="h-4 w-4" />;
      case 'memory': return <TrendingUp className="h-4 w-4" />;
      case 'disk': return <Activity className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedAlerts: checked ? prev.alerts.map(alert => alert.id) : []
    }));
  };

  // Handle individual selection
  const handleSelectAlert = (alertId: string, checked: boolean) => {
    setState(prev => ({
      ...prev,
      selectedAlerts: checked 
        ? [...prev.selectedAlerts, alertId]
        : prev.selectedAlerts.filter(id => id !== alertId)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button 
            onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Alert
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {state.metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.metrics.total_configurations}</div>
              <p className="text-xs text-muted-foreground">
                {state.metrics.enabled_configurations} enabled
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Executions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{state.metrics.total_executions_today}</div>
              <p className="text-xs text-muted-foreground">
                {state.metrics.successful_executions_today} successful
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.metrics.total_executions_today > 0 
                  ? Math.round((state.metrics.successful_executions_today / state.metrics.total_executions_today) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Over last 24 hours
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {state.metrics.most_triggered_alert ? '🔥' : '✨'}
              </div>
              <p className="text-xs text-muted-foreground">
                {state.metrics.most_triggered_alert || 'All quiet'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Configuration</CardTitle>
          <CardDescription>
            Manage your alert rules and monitoring thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={state.filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select
              value={state.filters.enabled?.toString() || 'all'}
              onValueChange={(value) => updateFilters({ 
                enabled: value === 'all' ? undefined : value === 'true' 
              })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={state.filters.severity || 'all'}
              onValueChange={(value) => updateFilters({ 
                severity: value === 'all' ? undefined : value as 'info' | 'warning' | 'error' | 'critical'
              })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={state.filters.metric_type || 'all'}
              onValueChange={(value) => updateFilters({ 
                metric_type: value === 'all' ? undefined : value as 'cpu' | 'memory' | 'disk' | 'network_rx' | 'network_tx' | 'custom'
              })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="cpu">CPU</SelectItem>
                <SelectItem value="memory">Memory</SelectItem>
                <SelectItem value="disk">Disk</SelectItem>
                <SelectItem value="network_rx">Network RX</SelectItem>
                <SelectItem value="network_tx">Network TX</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Bulk Actions */}
          {state.selectedAlerts.length > 0 && (
            <div className="mt-4 flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {state.selectedAlerts.length} alert(s) selected
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkToggle(true)}
              >
                <Play className="h-4 w-4 mr-2" />
                Enable
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleBulkToggle(false)}
              >
                <Pause className="h-4 w-4 mr-2" />
                Disable
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={state.selectedAlerts.length === state.alerts.length && state.alerts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Alert Name</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Loading alerts...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : state.alerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No alerts configured</h3>
                      <p className="text-muted-foreground mb-4">
                        Get started by creating your first alert rule
                      </p>
                      <Button 
                        onClick={() => setState(prev => ({ ...prev, showCreateDialog: true }))}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Alert
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                state.alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Checkbox
                        checked={state.selectedAlerts.includes(alert.id)}
                        onCheckedChange={(checked) => handleSelectAlert(alert.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getMetricIcon(alert.metric_type)}
                        <div>
                          <div className="font-medium">{alert.name}</div>
                          {alert.description && (
                            <div className="text-sm text-muted-foreground">
                              {alert.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {alert.metric_type_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {alert.condition_display}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(alert.severity)}>
                        {alert.severity_display}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={alert.enabled}
                          onCheckedChange={() => handleToggleAlert(alert.id)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {alert.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {alert.last_triggered ? (
                        <div className="text-sm">
                          <div>{new Date(alert.last_triggered).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            {new Date(alert.last_triggered).toLocaleTimeString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
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
                          <DropdownMenuItem onClick={() => handleTestAlert(alert)}>
                            <TestTube className="h-4 w-4 mr-2" />
                            Test Alert
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAlert(alert)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteAlert(alert.id)}
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
        </CardContent>
      </Card>

      {/* Test Alert Dialog */}
      <Dialog 
        open={state.showTestDialog} 
        onOpenChange={(open) => setState(prev => ({ 
          ...prev, 
          showTestDialog: open,
          testingAlert: open ? prev.testingAlert : null,
          testResult: open ? prev.testResult : null,
          testValue: open ? prev.testValue : '',
          isTesting: false
        }))}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Alert: {state.testingAlert?.name}</DialogTitle>
            <DialogDescription>
              Enter a test value to simulate and verify your alert configuration works correctly
            </DialogDescription>
          </DialogHeader>
          
          {/* Test Input Section */}
          {!state.testResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Test Value ({state.testingAlert?.metric_type_display})
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={state.testValue}
                    onChange={(e) => setState(prev => ({ ...prev, testValue: e.target.value }))}
                    placeholder="Enter test value..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Current threshold: {state.testingAlert?.threshold_value} ({state.testingAlert?.condition_display})
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Expected Result</label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {state.testValue && !isNaN(parseFloat(state.testValue)) ? (
                      evaluateCondition(
                        parseFloat(state.testValue), 
                        state.testingAlert?.threshold_value || 0, 
                        state.testingAlert?.condition_operator || 'gt'
                      ) ? (
                        <span className="text-orange-600 font-medium">Would Trigger Alert</span>
                      ) : (
                        <span className="text-green-600 font-medium">Would Not Trigger</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">Enter a test value</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setState(prev => ({ 
                    ...prev, 
                    showTestDialog: false,
                    testingAlert: null,
                    testResult: null,
                    testValue: '',
                    isTesting: false
                  }))}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRunTest}
                  disabled={state.isTesting || !state.testValue || isNaN(parseFloat(state.testValue))}
                >
                  {state.isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Test Results Section */}
          {state.testResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Value</label>
                  <div className="p-3 bg-muted rounded-lg">
                    {state.testResult.test_value}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Threshold</label>
                  <div className="p-3 bg-muted rounded-lg">
                    {state.testResult.threshold_value}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <div className="p-3 bg-muted rounded-lg">
                  {state.testResult.condition_description}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {state.testResult.condition_met ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    Condition {state.testResult.condition_met ? 'Met' : 'Not Met'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {state.testResult.would_trigger ? (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  <span className="text-sm">
                    {state.testResult.would_trigger ? 'Would Trigger' : 'Would Not Trigger'}
                  </span>
                </div>
              </div>
              
              {state.testResult.delivery_results && Object.keys(state.testResult.delivery_results).length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Delivery Results</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-sm">
                      {JSON.stringify(state.testResult.delivery_results, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Test Another Value Button */}
              <div className="flex justify-center">
                <Button 
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, testResult: null }))}
                >
                  Test Another Value
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setState(prev => ({ 
                ...prev, 
                showTestDialog: false,
                testingAlert: null,
                testResult: null,
                testValue: '',
                isTesting: false
              }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Creation Wizard */}
      <AlertWizard
        open={state.showCreateDialog}
        onOpenChange={(open) => setState(prev => ({ ...prev, showCreateDialog: open }))}
        onAlertCreated={loadData}
      />

      {/* Alert Edit Wizard */}
      <AlertWizard
        open={state.showEditDialog}
        onOpenChange={(open) => setState(prev => ({ 
          ...prev, 
          showEditDialog: open,
          editingAlert: open ? prev.editingAlert : null
        }))}
        onAlertCreated={loadData}
        editingAlert={state.editingAlert}
      />
    </div>
  );
};
