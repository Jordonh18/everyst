import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Panel, 
  Badge, 
  Button
} from '../../components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { 
  MessageSquare, 
  Bell,
  Cloud,
  CloudCog,
  Laptop,
  Check,
  AlertTriangle,
  ExternalLink,
  Loader,
  ToggleRight,
  Settings,
  Lock,
  User,
  Clock
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
    { id: 'email', name: 'Email Notifications', provider: 'SMTP', icon: <Bell size={24} />, description: 'Email alerts and notifications', comingSoon: false },
    { id: 'sms', name: 'SMS', provider: 'Twilio', icon: <Bell size={24} />, description: 'Text message alerts', comingSoon: true },
    { id: 'push', name: 'Push Notifications', provider: 'Web Push', icon: <Bell size={24} />, description: 'Browser and mobile notifications', comingSoon: true }
  ],
  cloud: [
    { id: 'aws', name: 'AWS', provider: 'Amazon', icon: <Cloud size={24} />, description: 'Amazon Web Services integration', comingSoon: true },
    { id: 'azure', name: 'Azure', provider: 'Microsoft', icon: <CloudCog size={24} />, description: 'Microsoft Azure cloud services', comingSoon: true },
    { id: 'gcp', name: 'Google Cloud', provider: 'Google', icon: <Cloud size={24} />, description: 'Google Cloud Platform', comingSoon: true }
  ]
};

// Custom Coming Soon Banner component
const ComingSoonBanner: React.FC = () => {
  return (
    <div className="absolute top-0 right-0 z-20" style={{ transform: 'translateY(-40%) translateX(30%) rotate(32deg)' }}>
      <div className="flex items-center gap-1 bg-[#2EAAE1] text-white font-bold py-1 px-8 shadow-lg rounded-md border border-white/10"
        style={{ minWidth: 160, boxShadow: '0 2px 8px 0 rgba(46,170,225,0.15)', borderTopLeftRadius: 6, borderTopRightRadius: 12, borderBottomRightRadius: 6, borderBottomLeftRadius: 12 }}>
        <Clock size={12} className="opacity-80 mr-1" />
        <span className="text-[10px] tracking-wider uppercase">Coming Soon</span>
      </div>
    </div>
  );
};

export const BasecampIntegrations: React.FC = () => {
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
  
  // Get counts for the overview
  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const errorCount = connections.filter(c => c.status === 'destructive').length;
  const pendingCount = connections.filter(c => c.status === 'pending').length;
  
  
  // Updated filter buttons to match the new integration types
  const filterButtons = [
    { id: null, label: 'All' },
    { id: 'communication', label: 'Communication' },
    { id: 'notification', label: 'Notifications' },
    { id: 'cloud', label: 'Cloud' },
    { id: 'authentication', label: 'Authentication' }
  ];
  
  return (
    <div className="space-y-6">
      {/* Page header with breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Basecamp</h1>
          <p className="text-[rgb(var(--color-text-secondary))]">Manage your identity and collaboration tool integrations</p>
        </div>
      </div>

      {/* Overview panel */}
      <Panel 
        title="Connections Overview" 
        description="Status of your identity and notification integrations"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[rgba(var(--color-primary),0.05)]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))]">Total Connections</div>
                <div className="text-2xl font-semibold">{connections.length}</div>
              </div>
              <div className="p-2 bg-[rgba(var(--color-primary),0.1)] rounded-full text-[rgb(var(--color-primary))]">
                <Laptop size={20} />
              </div>
            </div>
          </Card>
          
          <Card className="bg-[rgba(var(--color-success),0.05)]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))]">Connected</div>
                <div className="text-2xl font-semibold">{connectedCount}</div>
              </div>
              <div className="p-2 bg-[rgba(var(--color-success),0.1)] rounded-full text-[rgb(var(--color-success))]">
                <Check size={20} />
              </div>
            </div>
          </Card>
          
          <Card className="bg-[rgba(var(--color-error),0.05)]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))]">Connection Errors</div>
                <div className="text-2xl font-semibold">{errorCount}</div>
              </div>
              <div className="p-2 bg-[rgba(var(--color-error),0.1)] rounded-full text-[rgb(var(--color-error))]">
                <AlertTriangle size={20} />
              </div>
            </div>
          </Card>
          
          <Card className="bg-[rgba(var(--color-warning),0.05)]">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-[rgb(var(--color-text-secondary))]">Pending</div>
                <div className="text-2xl font-semibold">{pendingCount}</div>
              </div>
              <div className="p-2 bg-[rgba(var(--color-warning),0.1)] rounded-full text-[rgb(var(--color-warning))]">
                <Loader size={20} />
              </div>
            </div>
          </Card>
        </div>
      </Panel>
      
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map(button => (
          <Button
            key={button.id === null ? 'all' : button.id}
            onClick={() => setActiveFilter(button.id)}
            variant={activeFilter === button.id ? 'default' : 'outline'}
           
            className={activeFilter === button.id ? '' : 'bg-[rgba(var(--color-primary),0.1)]'}
          >
            {button.label}
          </Button>
        ))}
      </div>

      {/* If filtered view is active */}
      {activeFilter && (
        <Panel title={`${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Services`}>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[rgba(var(--color-card-muted),0.7)] rounded-lg"></div>
                      <div>
                        <div className="h-5 w-24 bg-[rgba(var(--color-card-muted),0.7)] rounded mb-2"></div>
                        <div className="h-4 w-16 bg-[rgba(var(--color-card-muted),0.7)] rounded"></div>
                      </div>
                    </div>
                    <div className="h-6 w-20 bg-[rgba(var(--color-card-muted),0.7)] rounded-full"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices[activeFilter as keyof typeof predefinedServices].map((service) => {
                  // Check if this service is already connected
                  const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
                  
                  return (
                    <Card 
                      key={service.id}
                      className={`hover:border-[rgb(var(--color-primary-light))] transition-colors duration-300 flex flex-col relative`}
                    >
                      {service.comingSoon && <ComingSoonBanner />}
                      <div className="flex justify-between items-start relative z-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 p-3 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              {service.provider}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {existingConnection && (
                            <Badge 
                              variant={
                                existingConnection.status === 'connected' ? 'default' : 
                                existingConnection.status === 'pending' ? 'secondary' : 
                                existingConnection.status === 'destructive' ? 'destructive' : 'secondary'
                              } 
                              
                             
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-[rgb(var(--color-text-secondary))] flex-grow">
                        {service.description}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
                        <Button 
                          onClick={() => {
                            if (!service.comingSoon) {
                              setSelectedService({
                                ...service,
                                type: activeFilter as 'communication' | 'notification' | 'cloud' | 'authentication',
                                status: 'disconnected',
                                lastConnected: null
                              });
                              setShowAddModal(true);
                            }
                          }}
                          variant={existingConnection ? "outline" : "default"}
                         
                          className="w-full"
                          disabled={service.comingSoon}
                        >
                          {existingConnection ? <Settings size={14} className="mr-2" /> : <ExternalLink size={14} className="mr-2" />}
                          {existingConnection ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
          )}
        </Panel>
      )}

      {/* Group by category when no filter is selected */}
      {!activeFilter && (
        <>
          {/* Authentication Services */}
          <Panel 
            title="Authentication Services" 
            description="Identity providers for SSO and authentication"
            defaultExpanded={true}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-20 w-full bg-[rgba(var(--color-card-muted),0.3)] rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices.authentication.map((service) => {
                  // Check if this service is already connected
                  const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
                  
                  return (
                    <Card 
                      key={service.id}
                      className={`hover:border-[rgb(var(--color-primary-light))] transition-colors duration-300 flex flex-col relative`}
                    >
                      {service.comingSoon && <ComingSoonBanner />}
                      <div className="flex justify-between items-start relative z-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 p-3 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              {service.provider}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {existingConnection && (
                            <Badge 
                              variant={
                                existingConnection.status === 'connected' ? 'default' : 
                                existingConnection.status === 'pending' ? 'secondary' : 
                                existingConnection.status === 'destructive' ? 'destructive' : 'secondary'
                              } 
                              
                             
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-[rgb(var(--color-text-secondary))] flex-grow">
                        {service.description}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
                        <Button 
                          onClick={() => {
                            if (!service.comingSoon) {
                              setSelectedService({
                                ...service,
                                type: 'authentication',
                                status: 'disconnected',
                                lastConnected: null
                              });
                              setShowAddModal(true);
                            }
                          }}
                          variant={existingConnection ? "outline" : "default"}
                         
                          className="w-full"
                          disabled={service.comingSoon}
                        >
                          {existingConnection ? <Settings size={14} className="mr-2" /> : <ExternalLink size={14} className="mr-2" />}
                          {existingConnection ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Panel>
          
          {/* Communication Services */}
          <Panel 
            title="Communication Services" 
            description="Team collaboration tools and notification channels"
            defaultExpanded={true}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-20 w-full bg-[rgba(var(--color-card-muted),0.3)] rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices.communication.map((service) => {
                  // Check if this service is already connected
                  const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
                  
                  return (
                    <Card 
                      key={service.id}
                      className={`hover:border-[rgb(var(--color-primary-light))] transition-colors duration-300 flex flex-col relative`}
                    >
                      {service.comingSoon && <ComingSoonBanner />}
                      <div className="flex justify-between items-start relative z-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 p-3 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              {service.provider}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {existingConnection && (
                            <Badge 
                              variant={
                                existingConnection.status === 'connected' ? 'default' : 
                                existingConnection.status === 'pending' ? 'secondary' : 
                                existingConnection.status === 'destructive' ? 'destructive' : 'secondary'
                              } 
                              
                             
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-[rgb(var(--color-text-secondary))] flex-grow">
                        {service.description}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
                        <Button 
                          onClick={() => {
                            if (!service.comingSoon) {
                              setSelectedService({
                                ...service,
                                type: 'communication',
                                status: 'disconnected',
                                lastConnected: null
                              });
                              setShowAddModal(true);
                            }
                          }}
                          variant={existingConnection ? "outline" : "default"}
                         
                          className="w-full"
                          disabled={service.comingSoon}
                        >
                          {existingConnection ? <Settings size={14} className="mr-2" /> : <ExternalLink size={14} className="mr-2" />}
                          {existingConnection ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Panel>
          
          {/* Notification Services */}
          <Panel 
            title="Notification Services" 
            description="Alert channels and notification delivery"
            defaultExpanded={true}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-20 w-full bg-[rgba(var(--color-card-muted),0.3)] rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices.notification.map((service) => {
                  // Check if this service is already connected
                  const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
                  
                  return (
                    <Card 
                      key={service.id}
                      className={`hover:border-[rgb(var(--color-primary-light))] transition-colors duration-300 flex flex-col relative`}
                    >
                      {service.comingSoon && <ComingSoonBanner />}
                      <div className="flex justify-between items-start relative z-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 p-3 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              {service.provider}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {existingConnection && (
                            <Badge 
                              variant={
                                existingConnection.status === 'connected' ? 'default' : 
                                existingConnection.status === 'pending' ? 'secondary' : 
                                existingConnection.status === 'destructive' ? 'destructive' : 'secondary'
                              } 
                              
                             
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-[rgb(var(--color-text-secondary))] flex-grow">
                        {service.description}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
                        <Button 
                          onClick={() => {
                            if (!service.comingSoon) {
                              setSelectedService({
                                ...service,
                                type: 'notification',
                                status: 'disconnected',
                                lastConnected: null
                              });
                              setShowAddModal(true);
                            }
                          }}
                          variant={existingConnection ? "outline" : "default"}
                         
                          className="w-full"
                          disabled={service.comingSoon}
                        >
                          {existingConnection ? <Settings size={14} className="mr-2" /> : <ExternalLink size={14} className="mr-2" />}
                          {existingConnection ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Panel>
          
          {/* Cloud Services */}
          <Panel 
            title="Cloud Services" 
            description="Cloud provider integrations"
            defaultExpanded={true}
          >
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-20 w-full bg-[rgba(var(--color-card-muted),0.3)] rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {predefinedServices.cloud.map((service) => {
                  // Check if this service is already connected
                  const existingConnection = connections.find(conn => conn.id.startsWith(service.id));
                  
                  return (
                    <Card 
                      key={service.id}
                      className={`hover:border-[rgb(var(--color-primary-light))] transition-colors duration-300 flex flex-col relative`}
                    >
                      {service.comingSoon && <ComingSoonBanner />}
                      <div className="flex justify-between items-start relative z-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0 p-3 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                            {service.icon}
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <div className="text-xs text-[rgb(var(--color-text-secondary))]">
                              {service.provider}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {existingConnection && (
                            <Badge 
                              variant={
                                existingConnection.status === 'connected' ? 'default' : 
                                existingConnection.status === 'pending' ? 'secondary' : 
                                existingConnection.status === 'destructive' ? 'destructive' : 'secondary'
                              } 
                              
                             
                            />
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-[rgb(var(--color-text-secondary))] flex-grow">
                        {service.description}
                      </div>
                      
                      <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
                        <Button 
                          onClick={() => {
                            if (!service.comingSoon) {
                              setSelectedService({
                                ...service,
                                type: 'cloud',
                                status: 'disconnected',
                                lastConnected: null
                              });
                              setShowAddModal(true);
                            }
                          }}
                          variant={existingConnection ? "outline" : "default"}
                         
                          className="w-full"
                          disabled={service.comingSoon}
                        >
                          {existingConnection ? <Settings size={14} className="mr-2" /> : <ExternalLink size={14} className="mr-2" />}
                          {existingConnection ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}
      
      {/* Advanced Settings Panel */}
      <Panel 
        title="Connection Settings" 
        description="Global integration preferences"
        defaultExpanded={false}
      >
        <div className="space-y-4">
          <Card>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Auto-Reconnect</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  Automatically attempt reconnection when services disconnect
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-[rgb(var(--color-primary))]"
                aria-label="Toggle auto-reconnect"
              >
                <ToggleRight size={24} />
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">Integration Notifications</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  Receive alerts when integration status changes
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="text-[rgb(var(--color-primary))]"
                aria-label="Toggle integration notifications"
              >
                <ToggleRight size={24} />
              </Button>
            </div>
          </Card>
          
          <Card>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">OAuth Security Level</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))]">
                  Enhanced security for OAuth connection tokens
                </p>
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-sm text-[rgb(var(--color-text-secondary))]">High</span>
                <Lock size={18} className="text-[rgb(var(--color-success))]" />
              </div>
            </div>
          </Card>
        </div>
      </Panel>
      
      {/* Add Integration Modal */}
      {showAddModal && selectedService && (
        <Dialog open={showAddModal} onOpenChange={(open) => !open && setShowAddModal(false)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[rgba(var(--color-primary),0.1)] rounded-lg text-[rgb(var(--color-primary))]">
                    {selectedService.icon}
                  </div>
                  <div>
                    <span>{selectedService.name}</span>
                    <p className="text-sm text-[rgb(var(--color-text-secondary))]">{selectedService.provider}</p>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Configuration Settings</h3>
                <p className="text-sm text-[rgb(var(--color-text-secondary))] mb-4">
                  Configure your {selectedService.name} integration
                </p>
              </div>
              
              {/* Configuration fields */}
              <div className="space-y-4">
                {selectedService.type === 'authentication' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Client ID</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Client Secret</label>
                      <input
                        type="password"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter client secret"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Redirect URI</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] bg-[rgba(var(--color-card-muted),0.3)] rounded-md text-[rgb(var(--color-text))]"
                        value="https://app.everyst.com/auth/callback"
                        disabled
                      />
                      <p className="mt-1 text-xs text-[rgb(var(--color-text-secondary))]">
                        Use this URL in your {selectedService.name} application settings
                      </p>
                    </div>
                  </>
                )}
                
                {selectedService.type === 'communication' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Webhook URL</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter webhook URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">API Key</label>
                      <input
                        type="password"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter API key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Channel</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter channel name"
                      />
                    </div>
                  </>
                )}
                
                {selectedService.type === 'notification' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Notification Endpoint</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter endpoint URL"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">API Key</label>
                      <input
                        type="password"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter API key"
                      />
                    </div>
                  </>
                )}
                
                {selectedService.type === 'cloud' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Access Key</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter access key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Secret Key</label>
                      <input
                        type="password"
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                        placeholder="Enter secret key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgb(var(--color-text))] mb-1">Region</label>
                      <select
                        className="w-full p-2 border border-[rgb(var(--color-border))] rounded-md bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]"
                      >
                        <option value="">Select region</option>
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-1">US West (N. California)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="pt-2">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="mr-2 w-4 h-4 text-[rgb(var(--color-primary))]" 
                    />
                    <span className="text-sm">Enable notifications from this integration</span>
                  </label>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="default"
                onClick={() => {
                  // In a real app, this would save the configuration
                  // and make an API call to connect the service
                  const newConnection: ServiceConnection = {
                    id: `${selectedService.id}-${Date.now()}`,
                    name: selectedService.name || '',
                    type: selectedService.type as 'communication' | 'notification' | 'cloud' | 'authentication',
                    provider: selectedService.provider || '',
                    status: 'connected',
                    lastConnected: new Date().toISOString(),
                    icon: selectedService.icon || <User size={24} />,
                    description: selectedService.description || '',
                    connectedAccount: 'Connected account',
                    workspaces: ['Default workspace'],
                    comingSoon: selectedService.comingSoon
                  };
                  setConnections(prev => [...prev, newConnection]);
                  setShowAddModal(false);
                }}
              >
                Connect Service
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};