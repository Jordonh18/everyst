/**
 * Alert Creation Wizard - Step-by-step alert configuration
 */
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Gauge,
  Clock,
  Target,
  Send
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import { alertsApi } from '@/utils/alertsApi';
import type {
  AlertConfigurationForm,
  AvailableMetric,
  DeliveryOption,
  MetricType,
  ConditionOperator,
  AlertSeverity,
  AlertFrequencyType,
  DeliveryType
} from '@/types/alerts';

interface AlertWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAlertCreated: () => void;
}

const WIZARD_STEPS = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Configure alert name and description',
    icon: Info
  },
  {
    id: 'metric',
    title: 'Metric & Condition',
    description: 'Select what to monitor and trigger conditions',
    icon: Gauge
  },
  {
    id: 'timing',
    title: 'Timing & Frequency',
    description: 'Set evaluation frequency and timing options',
    icon: Clock
  },
  {
    id: 'severity',
    title: 'Severity & Type',
    description: 'Configure alert severity and frequency type',
    icon: Target
  },
  {
    id: 'delivery',
    title: 'Delivery Methods',
    description: 'Choose how to receive notifications',
    icon: Send
  }
];

export const AlertWizard: React.FC<AlertWizardProps> = ({
  open,
  onOpenChange,
  onAlertCreated
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  
  const [formData, setFormData] = useState<AlertConfigurationForm>({
    name: '',
    description: '',
    enabled: true,
    metric_type: 'cpu',
    custom_metric_name: '',
    condition_operator: 'gt',
    threshold_value: 80,
    time_window_minutes: 5,
    evaluation_frequency_minutes: 5,
    severity: 'warning',
    frequency_type: 'throttled',
    throttle_minutes: 60,
    schedule_cron: '',
    delivery_methods: []
  });

  // Load available metrics and delivery options when wizard opens
  useEffect(() => {
    if (open) {
      loadWizardData();
    }
  }, [open]);

  const loadWizardData = async () => {
    try {
      const [metrics, options] = await Promise.all([
        alertsApi.metrics.getAvailable(),
        alertsApi.deliveryOptions.getOptions()
      ]);
      
      setAvailableMetrics(metrics);
      setDeliveryOptions(options);
      
      // Set default delivery method to in-app
      setFormData(prev => ({
        ...prev,
        delivery_methods: [{
          delivery_type: 'in_app',
          enabled: true,
          configuration: {},
          max_retries: 3,
          retry_delay_minutes: 5
        }]
      }));
    } catch (error) {
      console.error('Failed to load wizard data:', error);
      toast.error('Failed to load configuration options');
    }
  };

  const updateFormData = (updates: Partial<AlertConfigurationForm>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canProceedToNext = (): boolean => {
    switch (currentStep) {
      case 0: // Basic info
        return formData.name.trim().length > 0;
      case 1: // Metric & condition
        return formData.metric_type && formData.threshold_value > 0;
      case 2: // Timing
        return formData.time_window_minutes > 0 && formData.evaluation_frequency_minutes > 0;
      case 3: // Severity
        return Boolean(formData.severity && formData.frequency_type);
      case 4: // Delivery
        return formData.delivery_methods.some(dm => dm.enabled);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleCreateAlert = async () => {
    if (!canProceedToNext()) {
      toast.error('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    try {
      await alertsApi.configurations.create(formData);
      toast.success('Alert created successfully!');
      onAlertCreated();
      onOpenChange(false);
      
      // Reset form
      setCurrentStep(0);
      setFormData({
        name: '',
        description: '',
        enabled: true,
        metric_type: 'cpu',
        custom_metric_name: '',
        condition_operator: 'gt',
        threshold_value: 80,
        time_window_minutes: 5,
        evaluation_frequency_minutes: 5,
        severity: 'warning',
        frequency_type: 'throttled',
        throttle_minutes: 60,
        schedule_cron: '',
        delivery_methods: []
      });
    } catch (error) {
      console.error('Failed to create alert:', error);
      toast.error('Failed to create alert. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeliveryMethod = (index: number, updates: Partial<typeof formData.delivery_methods[0]>) => {
    const updatedMethods = [...formData.delivery_methods];
    updatedMethods[index] = { ...updatedMethods[index], ...updates };
    updateFormData({ delivery_methods: updatedMethods });
  };

  const addDeliveryMethod = (type: DeliveryType) => {
    const newMethod = {
      delivery_type: type,
      enabled: true,
      configuration: {},
      max_retries: 3,
      retry_delay_minutes: 5
    };
    updateFormData({ 
      delivery_methods: [...formData.delivery_methods, newMethod] 
    });
  };

  const removeDeliveryMethod = (index: number) => {
    const updatedMethods = formData.delivery_methods.filter((_, i) => i !== index);
    updateFormData({ delivery_methods: updatedMethods });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-medium">Alert Name *</Label>
              <Input
                id="name"
                placeholder="e.g., High CPU Usage Alert"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                className="h-10"
              />
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description of this alert"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(enabled) => updateFormData({ enabled })}
              />
              <Label htmlFor="enabled" className="text-sm font-medium">Enable this alert</Label>
            </div>
          </div>
        );

      case 1: { // Metric & Condition
        const selectedMetric = availableMetrics.find(m => m.key === formData.metric_type);
        
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Metric to Monitor *</Label>
              <Select 
                value={formData.metric_type} 
                onValueChange={(value: MetricType) => updateFormData({ metric_type: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a metric" />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric.key} value={metric.key}>
                      <div className="flex flex-col py-1">
                        <span className="font-medium">{metric.name}</span>
                        <span className="text-xs text-muted-foreground">{metric.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMetric?.current_value !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Current value: {selectedMetric.current_value} {selectedMetric.unit}
                </p>
              )}
            </div>

            {formData.metric_type === 'custom' && (
              <div className="space-y-3">
                <Label htmlFor="custom_metric" className="text-sm font-medium">Custom Metric Name</Label>
                <Input
                  id="custom_metric"
                  placeholder="Enter custom metric name"
                  value={formData.custom_metric_name}
                  onChange={(e) => updateFormData({ custom_metric_name: e.target.value })}
                  className="h-10"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Condition</Label>
                <Select 
                  value={formData.condition_operator} 
                  onValueChange={(value: ConditionOperator) => updateFormData({ condition_operator: value })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                    <SelectItem value="gte">Greater than or equal (≥)</SelectItem>
                    <SelectItem value="lt">Less than (&lt;)</SelectItem>
                    <SelectItem value="lte">Less than or equal (≤)</SelectItem>
                    <SelectItem value="eq">Equal to (=)</SelectItem>
                    <SelectItem value="ne">Not equal to (≠)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="threshold" className="text-sm font-medium">Threshold Value *</Label>
                <Input
                  id="threshold"
                  type="number"
                  step="0.1"
                  value={formData.threshold_value}
                  onChange={(e) => updateFormData({ threshold_value: parseFloat(e.target.value) || 0 })}
                  className="h-10"
                />
              </div>
            </div>
            
            {selectedMetric && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Condition:</strong> Alert when {selectedMetric.name} {
                    formData.condition_operator === 'gt' ? '>' :
                    formData.condition_operator === 'gte' ? '≥' :
                    formData.condition_operator === 'lt' ? '<' :
                    formData.condition_operator === 'lte' ? '≤' :
                    formData.condition_operator === 'eq' ? '=' : '≠'
                  } {formData.threshold_value} {selectedMetric.unit}
                </p>
              </div>
            )}
          </div>
        );
      }

      case 2: // Timing & Frequency
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="time_window" className="text-sm font-medium">Time Window (minutes) *</Label>
                <Input
                  id="time_window"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.time_window_minutes}
                  onChange={(e) => updateFormData({ time_window_minutes: parseInt(e.target.value) || 5 })}
                  className="h-10"
                />
                <p className="text-sm text-muted-foreground">
                  How long to evaluate the condition
                </p>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="eval_frequency" className="text-sm font-medium">Check Every (minutes) *</Label>
                <Input
                  id="eval_frequency"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.evaluation_frequency_minutes}
                  onChange={(e) => updateFormData({ evaluation_frequency_minutes: parseInt(e.target.value) || 5 })}
                  className="h-10"
                />
                <p className="text-sm text-muted-foreground">
                  How often to check this condition
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Summary:</strong> Check every {formData.evaluation_frequency_minutes} minutes, 
                evaluating data from the last {formData.time_window_minutes} minutes.
              </p>
            </div>
          </div>
        );

      case 3: // Severity & Type
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alert Severity *</Label>
              <Select 
                value={formData.severity} 
                onValueChange={(value: AlertSeverity) => updateFormData({ severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center">
                      <Badge variant="secondary" className="mr-2">Info</Badge>
                      Informational alerts
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center">
                      <Badge variant="default" className="mr-2">Warning</Badge>
                      Warning alerts
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center">
                      <Badge variant="destructive" className="mr-2">Error</Badge>
                      Error alerts
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center">
                      <Badge variant="destructive" className="mr-2">Critical</Badge>
                      Critical alerts
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency Type *</Label>
              <Select 
                value={formData.frequency_type} 
                onValueChange={(value: AlertFrequencyType) => updateFormData({ frequency_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">
                    <div className="flex flex-col">
                      <span>Immediate</span>
                      <span className="text-xs text-muted-foreground">Send alert every time condition is met</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="throttled">
                    <div className="flex flex-col">
                      <span>Throttled</span>
                      <span className="text-xs text-muted-foreground">Limit alert frequency to prevent spam</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="scheduled">
                    <div className="flex flex-col">
                      <span>Scheduled</span>
                      <span className="text-xs text-muted-foreground">Send alerts on a specific schedule</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="batched">
                    <div className="flex flex-col">
                      <span>Batched</span>
                      <span className="text-xs text-muted-foreground">Group multiple alerts together</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.frequency_type === 'throttled' && (
              <div className="space-y-2">
                <Label htmlFor="throttle">Throttle Duration (minutes)</Label>
                <Input
                  id="throttle"
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.throttle_minutes}
                  onChange={(e) => updateFormData({ throttle_minutes: parseInt(e.target.value) || 60 })}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum time between alerts of this type
                </p>
              </div>
            )}

            {formData.frequency_type === 'scheduled' && (
              <div className="space-y-2">
                <Label htmlFor="cron">Cron Schedule</Label>
                <Input
                  id="cron"
                  placeholder="0 */4 * * * (every 4 hours)"
                  value={formData.schedule_cron}
                  onChange={(e) => updateFormData({ schedule_cron: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Cron expression for when to send scheduled alerts
                </p>
              </div>
            )}
          </div>
        );

      case 4: // Delivery Methods
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Methods *</Label>
              <p className="text-sm text-muted-foreground">
                Choose how you want to receive notifications for this alert
              </p>
            </div>

            <div className="space-y-3">
              {formData.delivery_methods.map((method, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={method.enabled}
                          onCheckedChange={(enabled) => updateDeliveryMethod(index, { enabled })}
                        />
                        <div>
                          <p className="font-medium">
                            {deliveryOptions.find(opt => opt.key === method.delivery_type)?.name || method.delivery_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {deliveryOptions.find(opt => opt.key === method.delivery_type)?.description}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeliveryMethod(index)}
                        disabled={formData.delivery_methods.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Add Delivery Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {deliveryOptions
                  .filter(option => !formData.delivery_methods.some(dm => dm.delivery_type === option.key))
                  .map((option) => (
                    <Button
                      key={option.key}
                      variant="outline"
                      size="sm"
                      onClick={() => addDeliveryMethod(option.key)}
                      disabled={!option.available}
                    >
                      {option.name}
                      {!option.available && (
                        <Badge variant="secondary" className="ml-2">Not Configured</Badge>
                      )}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-5xl w-[85vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Alert Configuration</DialogTitle>
          <DialogDescription>
            Configure a new alert to monitor your system metrics and receive notifications
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Sidebar with steps */}
          <div className="w-64 flex-shrink-0">
            <div className="space-y-2">
              {WIZARD_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg transition-colors ${
                      isCurrent 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted 
                          ? 'bg-muted text-muted-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCurrent 
                        ? 'bg-primary-foreground text-primary' 
                        : isCompleted 
                          ? 'bg-green-500 text-white'
                          : 'bg-muted'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isCurrent ? 'text-primary-foreground' : ''}`}>
                        {step.title}
                      </p>
                      <p className={`text-xs ${isCurrent ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center space-x-3 text-lg">
                  {React.createElement(WIZARD_STEPS[currentStep].icon, { className: "w-6 h-6" })}
                  <span>{WIZARD_STEPS[currentStep].title}</span>
                </CardTitle>
                <CardDescription className="text-base">
                  {WIZARD_STEPS[currentStep].description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {renderStepContent()}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreateAlert}
              disabled={!canProceedToNext() || isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Alert'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
