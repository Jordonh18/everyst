import React, { useState, useRef, useEffect } from 'react';
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
  Terminal, 
  Wifi, 
  Search, 
  Database, 
  Play,
  RefreshCw, 
  Activity,
  Shield,
  Network,
  Copy,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Send,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Key,
  Globe,
  Monitor
} from 'lucide-react';

// Types for tool execution
interface CommandResult {
  output: string;
  status: 'success' | 'error' | 'warning' | 'info' | 'loading';
  timestamp: string;
}

interface ToolState {
  isExecuting: boolean;
  lastResult: CommandResult | null;
}

// SSH Terminal Authentication Modal
const SSHAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAuthenticate: (credentials: {username: string, password?: string, sshKey?: string}) => void;
}> = ({ isOpen, onClose, onAuthenticate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useSSHKey, setUseSSHKey] = useState(false);
  const [sshKey, setSSHKey] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    if (!username.trim()) return;
    
    setIsAuthenticating(true);
    try {
      await onAuthenticate({
        username,
        password: useSSHKey ? undefined : password,
        sshKey: useSSHKey ? sshKey : undefined
      });
      onClose();
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>SSH Authentication</DialogTitle>
          <DialogDescription>
            Authenticate to establish a secure terminal connection
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
              placeholder="System username"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useSSHKey"
              checked={useSSHKey}
              onChange={(e) => setUseSSHKey(e.target.checked)}
            />
            <label htmlFor="useSSHKey" className="text-sm">Use SSH Key instead of password</label>
          </div>

          {useSSHKey ? (
            <div>
              <label className="text-sm font-medium">Private SSH Key</label>
              <textarea
                value={sshKey}
                onChange={(e) => setSSHKey(e.target.value)}
                className="w-full p-2 border rounded-md bg-background h-32 font-mono text-xs"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----
Your private SSH key content here
-----END OPENSSH PRIVATE KEY-----"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
                placeholder="System password"
              />
            </div>
          )}

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-600 text-sm font-medium mb-1">
              <Shield size={16} />
              Security Notice
            </div>
            <p className="text-xs text-muted-foreground">
              Credentials are encrypted and only used for this session. SSH keys are stored securely per user.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAuthenticate}
            disabled={!username.trim() || isAuthenticating}
          >
            {isAuthenticating ? (
              <RefreshCw size={16} className="animate-spin mr-2" />
            ) : (
              <Terminal size={16} className="mr-2" />
            )}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Real SSH Terminal Component
const SSHTerminal: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [currentCommand, setCurrentCommand] = useState('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Establish SSH connection
  const authenticateSSH = async (credentials: {username: string, password?: string, sshKey?: string}) => {
    setIsConnecting(true);
    try {
      // Create WebSocket connection for terminal
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/terminal/ssh`;
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        // Send authentication data
        ws.send(JSON.stringify({
          type: 'auth',
          ...credentials,
          token: localStorage.getItem('accessToken')
        }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'auth_success') {
          setIsConnected(true);
          setIsConnecting(false);
          setTerminalOutput('SSH connection established successfully.\n');
        } else if (data.type === 'auth_error') {
          setIsConnecting(false);
          setTerminalOutput(`Authentication failed: ${data.message}\n`);
        } else if (data.type === 'output') {
          setTerminalOutput(prev => prev + data.data);
        } else if (data.type === 'error') {
          setTerminalOutput(prev => prev + `Error: ${data.message}\n`);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setWebsocket(null);
        setTerminalOutput(prev => prev + '\nConnection closed.\n');
      };

      ws.onerror = () => {
        setIsConnecting(false);
        setTerminalOutput(prev => prev + '\nConnection error occurred.\n');
      };

      setWebsocket(ws);
    } catch (error) {
      setIsConnecting(false);
      console.error('SSH connection failed:', error);
    }
  };

  // Execute command via WebSocket
  const executeCommand = (command: string) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({
        type: 'command',
        data: command + '\n'
      }));
      setCurrentCommand('');
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCommand.trim() && isConnected) {
      executeCommand(currentCommand);
    }
  };

  // Disconnect SSH
  const disconnect = () => {
    if (websocket) {
      websocket.close();
    }
    setIsConnected(false);
    setWebsocket(null);
    setTerminalOutput('');
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  // Focus input when terminal is clicked
  const focusInput = () => {
    if (isConnected) {
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : ''} flex flex-col h-full overflow-hidden p-0`}>
        {/* Terminal Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Terminal size={20} />
              <span className="font-medium">SSH Terminal</span>
            </div>
            
            {isConnected && (
              <div className="flex items-center space-x-1 text-green-600 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Connected</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <RefreshCw size={16} className="animate-spin mr-1" />
                ) : (
                  <Key size={16} className="mr-1" />
                )}
                Connect SSH
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          </div>
        </div>

        {/* Terminal Body */}
        <div 
          className={`flex-1 bg-black text-green-400 font-mono text-sm p-4 overflow-auto cursor-text ${isFullscreen ? 'rounded-b-lg' : 'rounded-b-lg'}`}
          onClick={focusInput}
          ref={terminalRef}
        >
          {!isConnected ? (
            <div className="text-center text-gray-500 py-8">
              <Terminal size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-2">SSH Terminal - Not Connected</p>
              <p className="text-xs">Click "Connect SSH" to establish a secure terminal session</p>
            </div>
          ) : (
            <>
              <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
              
              {/* Input Line */}
              <form onSubmit={handleSubmit} className="flex items-center space-x-1">
                <span className="text-blue-400">user@everyst:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={currentCommand}
                  onChange={(e) => setCurrentCommand(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-green-400"
                  placeholder="Enter command..."
                  autoFocus
                />
              </form>
            </>
          )}
        </div>
      </Card>

      {/* Modals */}
      <SSHAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthenticate={authenticateSSH}
      />
    </>
  );
};

// Modern Tool Card Component
const ModernToolCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' };
  children: React.ReactNode;
}> = ({ icon, title, description, badge, children }) => {
  return (
    <Card className="p-6 hover:border-primary/50 hover:shadow-md transition-all duration-300 h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-base">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant={badge.variant} className="text-xs">
          {badge.text}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  );
};

// Tool Executor Component
const ToolExecutor: React.FC<{
  placeholder: string;
  buttonText: string;
  exampleCommands?: string[];
  processCommand: (command: string) => void;
  isExecuting: boolean;
  result: CommandResult | null;
  clearResult: () => void;
}> = ({ 
  placeholder, 
  buttonText, 
  exampleCommands = [], 
  processCommand, 
  isExecuting, 
  result, 
  clearResult 
}) => {
  const [command, setCommand] = useState('');
  const [showOutput, setShowOutput] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;
    processCommand(command);
  };

  const copyOutput = () => {
    if (result?.output) {
      navigator.clipboard.writeText(result.output);
    }
  };

  const downloadOutput = () => {
    if (result?.output) {
      const blob = new Blob([result.output], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${buttonText.toLowerCase().replace(' ', '_')}_output.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <Button
          type="submit"
          disabled={isExecuting || !command.trim()}
          className="px-4"
        >
          {isExecuting ? (
            <RefreshCw size={16} className="animate-spin mr-2" />
          ) : (
            <Play size={16} className="mr-2" />
          )}
          {buttonText}
        </Button>
      </form>

      {/* Example Commands */}
      {exampleCommands.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Examples:</span>
          {exampleCommands.map((example, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setCommand(example)}
              className="h-6 px-2 text-xs"
            >
              {example}
            </Button>
          ))}
        </div>
      )}

      {/* Output */}
      {result && (
        <div className="border rounded-lg overflow-hidden">
          {/* Output Header */}
          <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Badge 
                variant={
                  result.status === 'success' ? 'default' : 
                  result.status === 'error' ? 'destructive' : 
                  'secondary'
                }
                className="text-xs"
              >
                {result.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOutput(!showOutput)}
                className="h-6 w-6 p-0"
              >
                {showOutput ? <EyeOff size={14} /> : <Eye size={14} />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyOutput}
                className="h-6 w-6 p-0"
              >
                <Copy size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadOutput}
                className="h-6 w-6 p-0"
              >
                <Download size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearResult}
                className="h-6 w-6 p-0"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {/* Output Content */}
          {showOutput && (
            <div className="p-4 bg-black text-green-400 font-mono text-sm max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{result.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main Tools Page Component
export const ToolsPage: React.FC = () => {
  // Tool states
  const [pingState, setPingState] = useState<ToolState>({ isExecuting: false, lastResult: null });
  const [nmapState, setNmapState] = useState<ToolState>({ isExecuting: false, lastResult: null });
  const [digState, setDigState] = useState<ToolState>({ isExecuting: false, lastResult: null });
  const [tracerouteState, setTracerouteState] = useState<ToolState>({ isExecuting: false, lastResult: null });
  const [whoisState, setWhoisState] = useState<ToolState>({ isExecuting: false, lastResult: null });
  const [sslState, setSslState] = useState<ToolState>({ isExecuting: false, lastResult: null });

  // Tool execution functions
  const runPing = async (command: string) => {
    setPingState({ isExecuting: true, lastResult: null });
    
    try {
      const { pingHost } = await import('../../utils/networkTools');
      const result = await pingHost(command);
      setPingState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setPingState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to ping host'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const runNmap = async (command: string) => {
    setNmapState({ isExecuting: true, lastResult: null });
    
    try {
      const { nmapScan } = await import('../../utils/networkTools');
      const result = await nmapScan(command);
      setNmapState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setNmapState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to scan ports'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const runDig = async (command: string) => {
    setDigState({ isExecuting: true, lastResult: null });
    
    try {
      const { digLookup } = await import('../../utils/networkTools');
      const result = await digLookup(command);
      setDigState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setDigState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to lookup DNS'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const runTraceroute = async (command: string) => {
    setTracerouteState({ isExecuting: true, lastResult: null });
    
    try {
      const { traceroute } = await import('../../utils/networkTools');
      const result = await traceroute(command);
      setTracerouteState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setTracerouteState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to trace route'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const runWhois = async (command: string) => {
    setWhoisState({ isExecuting: true, lastResult: null });
    
    try {
      const { whoisLookup } = await import('../../utils/networkTools');
      const result = await whoisLookup(command);
      setWhoisState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setWhoisState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to lookup whois'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  const runSslCheck = async (command: string) => {
    setSslState({ isExecuting: true, lastResult: null });
    
    try {
      const { runSslCheckApi } = await import('../../utils/toolsApi');
      const domain = command.replace(/^https?:\/\//, '');
      const result = await runSslCheckApi(domain);
      setSslState({ isExecuting: false, lastResult: result });
    } catch (error) {
      setSslState({
        isExecuting: false,
        lastResult: {
          output: `Error: ${error instanceof Error ? error.message : 'Failed to check SSL'}`,
          status: 'error',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full space-y-6">
        {/* SSH Terminal Section */}
      <div className="space-y-4">
        <div className="h-[400px]">
          <SSHTerminal />
        </div>
      </div>

      {/* Network Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Network Tools</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ModernToolCard
            icon={<Wifi size={24} />}
            title="Ping"
            description="Test network connectivity to a host"
            badge={{ text: "Basic", variant: "secondary" }}
          >
            <ToolExecutor
              placeholder="Enter hostname or IP address"
              buttonText="Ping"
              exampleCommands={['google.com', '8.8.8.8', 'github.com']}
              processCommand={runPing}
              isExecuting={pingState.isExecuting}
              result={pingState.lastResult}
              clearResult={() => setPingState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>

          <ModernToolCard
            icon={<Search size={24} />}
            title="Port Scanner"
            description="Scan for open ports on target hosts"
            badge={{ text: "Security", variant: "destructive" }}
          >
            <ToolExecutor
              placeholder="Enter hostname or IP address"
              buttonText="Scan"
              exampleCommands={['localhost', '127.0.0.1', 'scanme.nmap.org']}
              processCommand={runNmap}
              isExecuting={nmapState.isExecuting}
              result={nmapState.lastResult}
              clearResult={() => setNmapState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>

          <ModernToolCard
            icon={<Database size={24} />}
            title="DNS Lookup"
            description="Query DNS records for domains"
            badge={{ text: "Network", variant: "default" }}
          >
            <ToolExecutor
              placeholder="Enter domain name"
              buttonText="Lookup"
              exampleCommands={['example.com', 'google.com A', 'github.com MX']}
              processCommand={runDig}
              isExecuting={digState.isExecuting}
              result={digState.lastResult}
              clearResult={() => setDigState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>

          <ModernToolCard
            icon={<Activity size={24} />}
            title="Traceroute"
            description="Trace network path to destination"
            badge={{ text: "Network", variant: "default" }}
          >
            <ToolExecutor
              placeholder="Enter hostname or IP address"
              buttonText="Trace"
              exampleCommands={['example.com', '8.8.8.8', 'github.com']}
              processCommand={runTraceroute}
              isExecuting={tracerouteState.isExecuting}
              result={tracerouteState.lastResult}
              clearResult={() => setTracerouteState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>

          <ModernToolCard
            icon={<Database size={24} />}
            title="Whois Lookup"
            description="Domain registration information"
            badge={{ text: "Info", variant: "outline" }}
          >
            <ToolExecutor
              placeholder="Enter domain or IP address"
              buttonText="Lookup"
              exampleCommands={['example.com', 'github.com', '8.8.8.8']}
              processCommand={runWhois}
              isExecuting={whoisState.isExecuting}
              result={whoisState.lastResult}
              clearResult={() => setWhoisState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>

          <ModernToolCard
            icon={<Shield size={24} />}
            title="SSL Certificate Checker"
            description="Verify SSL certificate details"
            badge={{ text: "Security", variant: "destructive" }}
          >
            <ToolExecutor
              placeholder="Enter domain name"
              buttonText="Check SSL"
              exampleCommands={['github.com', 'google.com', 'badssl.com']}
              processCommand={runSslCheck}
              isExecuting={sslState.isExecuting}
              result={sslState.lastResult}
              clearResult={() => setSslState({ isExecuting: false, lastResult: null })}
            />
          </ModernToolCard>
        </div>
      </div>
      </div>
    </div>
  );
};
