import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Badge, 
  Button
} from '../../components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { 
  MessageSquare, 
  Bell,
  Cloud,
  CloudCog,
  Check,
  ExternalLink,
  Settings,
  Lock,
  User,
  Clock,
  Shield
} from 'lucide-react';

// Updated types for our integrations to focus on identity and notification integrations
interface ServiceConnection {
  id: string;
  name: string;
  type: 'communication' | 'notification' | 'cloud' | 'authentication';
  provider: string;
  status: 'connected' | 'disconnected' | 'destructive' | 'pending';
  lastConnected: string | null;
  icon: React.ReactNode;
  connectedAccount?: string;
  workspaces?: string[];
  description?: string;
  comingSoon?: boolean;
}

// Predefined services by category
const predefinedServices = {
  authentication: [
    { id: 'github', name: 'GitHub', provider: 'GitHub', icon: <User size={24} />, description: 'GitHub SSO authentication', comingSoon: true },
    { id: 'azure-ad', name: 'Azure AD', provider: 'Microsoft', icon: <User size={24} />, description: 'Microsoft identity services', comingSoon: true },
    { id: 'google', name: 'Google', provider: 'Google', icon: <User size={24} />, description: 'Google account authentication', comingSoon: true },
    { id: 'okta', name: 'Okta', provider: 'Okta', icon: <Lock size={24} />, description: 'Enterprise identity management', comingSoon: true }
  ],
  communication: [
    { id: 'ms-teams', name: 'Microsoft Teams', provider: 'Microsoft', icon: <MessageSquare size={24} />, description: 'Team collaboration and messaging', comingSoon: true },
    { id: 'slack', name: 'Slack', provider: 'Slack', icon: <MessageSquare size={24} />, description: 'Channel-based messaging platform', comingSoon: true },
    { id: 'discord', name: 'Discord', provider: 'Discord', icon: <MessageSquare size={24} />, description: 'Voice and text chat', comingSoon: true }
  ],
  notification: [
    { id: 'email', name: 'Email Notifications', provider: 'SMTP', icon: <Bell size={24} />, description: 'Email alerts and notifications', comingSoon: true },
    { id: 'sms', name: 'SMS', provider: 'Twilio', icon: <Bell size={24} />, description: 'Text message alerts', comingSoon: true },
    { id: 'push', name: 'Push Notifications', provider: 'Web Push', icon: <Bell size={24} />, description: 'Browser and mobile notifications', comingSoon: true }
  ],
  cloud: [
    { id: 'aws', name: 'AWS', provider: 'Amazon', icon: <Cloud size={24} />, description: 'Amazon Web Services integration', comingSoon: true },
    { id: 'azure', name: 'Azure', provider: 'Microsoft', icon: <CloudCog size={24} />, description: 'Microsoft Azure cloud services', comingSoon: true },
    { id: 'gcp', name: 'Google Cloud', provider: 'Google', icon: <Cloud size={24} />, description: 'Google Cloud Platform', comingSoon: true }
  ]
};

// Custom Coming Soon Badge component
const ComingSoonBadge: React.FC = () => {
  return (
    <div className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-1 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800/50">
      <Clock size={10} />
      <span>Coming Soon</span>
    </div>
  );
};

export const IntegrationsPage: React.FC = () => {
  // State for service connections
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Modal state for service configuration
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<Partial<ServiceConnection> | null>(null);
  
  // Filter state
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Sample data - this would come from API in a real app
  useEffect(() => {
    // Simulate API delay
    const fetchData = async () => {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Initialize with empty connections array
      setConnections([]);
      setIsLoading(false);
    };
    
    fetchData();
  }, []);
  
  // Updated filter buttons to match the new integration types
  const filterButtons = [
    { id: null, label: 'All', count: Object.values(predefinedServices).flat().length },
    { id: 'authentication', label: 'Authentication', count: predefinedServices.authentication.length },
    { id: 'communication', label: 'Communication', count: predefinedServices.communication.length },
    { id: 'notification', label: 'Notifications', count: predefinedServices.notification.length },
    { id: 'cloud', label: 'Cloud', count: predefinedServices.cloud.length }
  ];
  
  // Get services to display based on filter
  const displayServices = activeFilter 
    ? predefinedServices[activeFilter as keyof typeof predefinedServices]
    : Object.values(predefinedServices).flat();
  
  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map(button => (
          <Button
            key={button.id === null ? 'all' : button.id}
            onClick={() => setActiveFilter(button.id)}
            variant={activeFilter === button.id ? 'default' : 'outline'}
            className="h-10"
          >
            {button.label}
            <Badge variant="secondary" className="ml-2 text-xs">
              {button.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-muted rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-16 bg-muted rounded"></div>
                </div>
              </div>
              <div className="h-12 w-full bg-muted rounded mb-6"></div>
              <div className="h-9 w-full bg-muted rounded"></div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayServices.map((service) => {
            // Check if this service is already connected
            const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
            
            return (
              <Card 
                key={service.id}
                className="p-6 hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col h-full group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary/20 transition-colors">
                      {service.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">{service.provider}</p>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    {service.comingSoon ? (
                      <ComingSoonBadge />
                    ) : existingConnection ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <Check size={16} />
                        <span className="text-xs font-medium">Connected</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">
                  {service.description}
                </div>
                
                <Button 
                  onClick={() => {
                    if (!service.comingSoon) {
                      setSelectedService({
                        ...service,
                        type: (activeFilter as 'communication' | 'notification' | 'cloud' | 'authentication') || 
                              (Object.keys(predefinedServices).find(key => 
                                predefinedServices[key as keyof typeof predefinedServices].includes(service)
                              ) as 'communication' | 'notification' | 'cloud' | 'authentication'),
                        status: 'disconnected',
                        lastConnected: null
                      });
                      setShowAddModal(true);
                    }
                  }}
                  variant={existingConnection ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  disabled={service.comingSoon}
                >
                  {existingConnection ? (
                    <>
                      <Settings size={16} className="mr-2" />
                      Configure
                    </>
                  ) : (
                    <>
                      <ExternalLink size={16} className="mr-2" />
                      Connect
                    </>
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Add/Configure Service Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedService ? `Configure ${selectedService.name}` : 'Add Integration'}
            </DialogTitle>
            <DialogDescription>
              {selectedService ? 
                `Set up your ${selectedService.name} integration to enable ${selectedService.type} features.` :
                'Connect a new service to your workspace.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedService && (
              <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/50">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {selectedService.icon}
                </div>
                <div>
                  <h3 className="font-medium">{selectedService.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedService.provider}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Connection Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-md bg-background"
                  placeholder={`${selectedService?.name || 'Service'} Connection`}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full p-2 border rounded-md bg-background h-20 resize-none"
                  placeholder="Optional description for this connection"
                />
              </div>
              
              {selectedService?.type === 'authentication' && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-1">
                    <Shield size={16} />
                    OAuth Configuration
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll be redirected to {selectedService.name} to authorize this connection.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle connection logic here
              setShowAddModal(false);
            }}>
              <ExternalLink size={16} className="mr-2" />
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
