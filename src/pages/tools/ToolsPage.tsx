import { useState, useRef, useEffect } from 'react';
import { 
  Panel, 
  ToolCard,
  FormattedToolOutput,
  Button
} from '../../components/ui';
import { 
  Terminal, 
  Wifi, 
  Search, 
  Database, 
  Play,
  RefreshCw, 
  Activity,
  Code,
  RotateCcw,
  Shield,
  Maximize2,
  GitBranch,
  Router,
  Waves,
  Network
} from 'lucide-react';
//import type { ToolResponse } from '../../utils/networkTools';

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

// Component for advanced terminal interface
const AdvancedTerminal: React.FC = () => {
  // Track fullscreen state for UI feedback if needed
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalIframeRef = useRef<HTMLIFrameElement>(null);
  
  // Toggle fullscreen for the terminal
  const toggleFullscreen = () => {
    if (terminalContainerRef.current) {
      if (!document.fullscreenElement) {
        terminalContainerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Function to refresh the terminal iframe
  const refreshTerminal = () => {
    if (terminalIframeRef.current) {
      // Generate a unique URL to force refresh
      const timestamp = new Date().getTime();
      terminalIframeRef.current.src = `about:blank?refresh=${timestamp}`;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center">
          <Terminal size={16} className="text-green-500 mr-2" />
          <span className="text-green-500 text-sm font-mono">Secure System Access</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleFullscreen}
            className="text-gray-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <Maximize2 size={16} />
          </button>
          <button 
            className="text-gray-400 hover:text-white transition-colors"
            onClick={refreshTerminal}
            title="Refresh terminal"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      <div 
        ref={terminalContainerRef} 
        className="flex-1 bg-black relative"
        style={{ height: '500px' }}
      >
        {/* This would typically be a real terminal integration via WebSockets/SSH */}
        {/* For demo purposes, using a placeholder iframe for visual */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/70 p-4 rounded text-green-500 font-mono">
            For actual implementation, connect to system shell via WebSockets/SSH
          </div>
        </div>
        
        {/* Terminal display area */}
        <iframe
          ref={terminalIframeRef}
          title="Terminal"
          className="w-full h-full"
          style={{ 
            backgroundColor: "black", 
            border: "none",
            opacity: 0.7
          }}
          src="about:blank"
        ></iframe>
      </div>
    </div>
  );
};

// Component for executing network tools
const ToolExecutor = ({ 
  placeholder, 
  buttonText, 
  exampleCommands = [], 
  processCommand, 
  isExecuting, 
  result, 
  clearResult, 
  toolName 
}: {
  placeholder: string;
  buttonText: string;
  exampleCommands?: string[];
  processCommand: (command: string) => void;
  isExecuting: boolean;
  result: CommandResult | null;
  clearResult: () => void;
  toolName?: string;
}) => {
  const [command, setCommand] = useState<string>('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isExecuting) return;
    processCommand(command);
  };
  
  const handleExampleClick = (example: string) => {
    setCommand(example);
  };
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-[rgb(var(--color-search-bg))] border border-[rgb(var(--color-border))] rounded-md py-1.5 px-3 text-[rgb(var(--color-text))] placeholder-[rgb(var(--color-text-secondary))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))]"
        />
        <button
          type="submit"
          disabled={isExecuting || !command.trim()}
          className="px-4 py-1.5 bg-[rgb(var(--color-primary))] text-white rounded-md hover:bg-[rgb(var(--color-primary-light))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {isExecuting ? (
            <RefreshCw size={16} className="animate-spin mr-2" />
          ) : (
            <Play size={16} className="mr-2" />
          )}
          <span>{buttonText}</span>
        </button>
      </form>
      
      {exampleCommands && exampleCommands.length > 0 && (
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-[rgb(var(--color-text-secondary))]">Examples:</span>
          <div className="flex flex-wrap gap-2">
            {exampleCommands.map((example, index) => (
              <button 
                key={index} 
                onClick={() => handleExampleClick(example)}
                className="text-xs px-2 py-1 bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))] rounded-md hover:bg-[rgba(var(--color-primary),0.2)] transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {result && (
        <FormattedToolOutput
          toolName={toolName || buttonText}
          command={command}
          output={result.output}
          status={result.status}
          timestamp={result.timestamp}
          onClear={clearResult}
        />
      )}
    </div>
  );
};

// Main Tools Component
export const ToolsPage: React.FC = () => {
  // Tool states
  const [nmapState, setNmapState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [digState, setDigState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [nslookupState, setNslookupState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [tracerouteState, setTracerouteState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [whoisState, setWhoisState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [netstatState, setNetstatState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [pingState, setPingState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [sslState, setSslState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [ipRouteState, setIpRouteState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });
  
  const [tcpdumpState, setTcpdumpState] = useState<ToolState>({
    isExecuting: false,
    lastResult: null
  });

  // Function to run nmap
  const runNmap = (command: string) => {
    setNmapState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract target from command
    const target = command.split(' ')[0];
    
    // Use API service to execute nmap
    import('../../utils/networkTools').then(({ nmapScan }) => {
      nmapScan(target)
        .then((result) => {
          setNmapState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setNmapState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error.message || 'Failed to execute port scan'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run dig
  const runDig = (command: string) => {
    setDigState({
      isExecuting: true,
      lastResult: null
    });
    
    // Parse command parameters
    const parts = command.split(' ');
    const target = parts[0];
    const recordType = parts.length > 1 ? parts[1] : 'A';
    
    // Use API service to execute dig
    import('../../utils/toolsApi').then(({ runDigApi }) => {
      runDigApi(target, recordType)
        .then((result) => {
          setDigState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setDigState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute DNS lookup'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run nslookup
  const runNslookup = (command: string) => {
    setNslookupState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract target from command
    const target = command.split(' ')[0];
    
    // Use API service to execute nslookup
    import('../../utils/toolsApi').then(({ runNslookupApi }) => {
      runNslookupApi(target)
        .then((result) => {
          setNslookupState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setNslookupState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute nslookup'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run traceroute
  const runTraceroute = (command: string) => {
    setTracerouteState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract target from command
    const target = command.split(' ')[0];
    
    // Use API service to execute traceroute
    import('../../utils/toolsApi').then(({ runTracerouteApi }) => {
      runTracerouteApi(target)
        .then((result) => {
          setTracerouteState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setTracerouteState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute traceroute'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run whois
  const runWhois = (command: string) => {
    setWhoisState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract target from command
    const target = command.split(' ')[0];
    
    // Use API service to execute whois lookup
    import('../../utils/toolsApi').then(({ runWhoisApi }) => {
      runWhoisApi(target)
        .then((result) => {
          setWhoisState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setWhoisState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute whois lookup'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run netstat
  const runNetstat = (command: string) => {
    setNetstatState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract options from command
    const options = command.replace(/^netstat\s+/, '').trim();
    
    // Use API service to execute netstat
    import('../../utils/toolsApi').then(({ runNetstatApi }) => {
      runNetstatApi(options)
        .then((result) => {
          setNetstatState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setNetstatState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute netstat command'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run ping using the API
  const runPing = (command: string) => {
    setPingState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract target from command
    const target = command.split(' ')[0];
    
    // Use API service to execute ping
    import('../../utils/networkTools').then(({ pingHost }) => {
      pingHost(target)
        .then((result) => {
          setPingState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setPingState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error.message || 'Failed to execute ping command'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run SSL checker
  const runSslCheck = (command: string) => {
    setSslState({
      isExecuting: true,
      lastResult: null
    });
    
    // Extract domain from command (removing any protocol prefix if present)
    const domain = command.split(' ')[0].replace(/^https?:\/\//, '');
    
    // Use API service to execute SSL check
    import('../../utils/toolsApi').then(({ runSslCheckApi }) => {
      runSslCheckApi(domain)
        .then((result) => {
          setSslState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setSslState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute SSL check'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run IP Route
  const runIpRoute = (command: string) => {
    // Command parameter is required for interface consistency but not used for this tool
    void command; // TypeScript no-unused-vars trick
    
    setIpRouteState({
      isExecuting: true,
      lastResult: null
    });
    
    // Use API service to execute IP Route
    import('../../utils/toolsApi').then(({ runIpRouteApi }) => {
      runIpRouteApi()
        .then((result) => {
          setIpRouteState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setIpRouteState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to retrieve routing table'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  // Function to run TCPDump
  const runTcpdump = (command: string) => {
    setTcpdumpState({
      isExecuting: true,
      lastResult: null
    });
    
    // Parse command parameters
    // Format can be: [interface] [filter] [count]
    // e.g., "eth0 port 80 50" or "-i eth0 port 80"
    const parts = command.split(' ');
    let interfaceName = 'any';
    let filter = '';
    const count = 25; // Using a fixed count for simplicity
    
    // Parse interface from command
    if (parts.length > 0) {
      // Check if the command uses -i flag format
      const iIndex = parts.indexOf('-i');
      if (iIndex !== -1 && parts.length > iIndex + 1) {
        interfaceName = parts[iIndex + 1];
        // Remove interface and -i flag for filter parsing
        parts.splice(iIndex, 2);
      } else if (parts[0] && !parts[0].startsWith('-')) {
        // First param is interface if not a flag
        interfaceName = parts[0];
        parts.shift();
      }
    }
    
    // Rest of the command is treated as filter
    filter = parts.join(' ');
    
    // Use API service to execute tcpdump
    import('../../utils/toolsApi').then(({ runTcpdumpApi }) => {
      runTcpdumpApi(interfaceName, filter, count)
        .then((result) => {
          setTcpdumpState({
            isExecuting: false,
            lastResult: result
          });
        })
        .catch((error) => {
          setTcpdumpState({
            isExecuting: false,
            lastResult: {
              output: `Error: ${error instanceof Error ? error.message : 'Failed to execute packet capture'}`,
              status: 'error',
              timestamp: new Date().toISOString()
            }
          });
        });
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Tools</h1>
          <p className="text-[rgb(var(--color-text-secondary))]">Security tools and system utilities</p>
        </div>
      </div>
      
      {/* System Terminal Panel */}
      <Panel 
        title="System Terminal" 
        description="Secure shell access to system"
        actions={
          <>
            <Button 
              variant="ghost" 
              aria-label="Full-screen mode"
              title="Full-screen mode"
              className="p-1"
            >
              <Code size={16} />
            </Button>
            <Button 
              variant="ghost" 
              aria-label="Reset terminal"
              title="Reset terminal"
              className="p-1"
            >
              <RotateCcw size={16} />
            </Button>
          </>
        }
      >
        <AdvancedTerminal />
      </Panel>
      
      {/* Network Diagnostic Tools Panel */}
      <Panel 
        title="Network Diagnostics" 
        description="Essential network troubleshooting tools"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Using the new ToolCard component */}
          <ToolCard
            icon={<Wifi size={24} />}
            title="Ping Tool"
            description="Test basic network connectivity to a host"
            badge={{ text: "Basic", color: "info" }}
            defaultExpanded={true}
          >
            <ToolExecutor 
              toolName="Ping Tool"
              placeholder="Enter hostname or IP address (e.g., google.com)"
              buttonText="Ping"
              exampleCommands={['google.com', '8.8.8.8', 'github.com']}
              processCommand={runPing}
              isExecuting={pingState.isExecuting}
              result={pingState.lastResult}
              clearResult={() => setPingState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Search size={24} />}
            title="Port Scanner (nmap)"
            description="Scan for open ports and services on target hosts"
            badge={{ text: "Security", color: "warning" }}
          >
            <ToolExecutor 
              toolName="Port Scanner (nmap)"
              placeholder="Enter hostname or IP address to scan"
              buttonText="Scan"
              exampleCommands={['localhost', '127.0.0.1', 'scanme.nmap.org']}
              processCommand={runNmap}
              isExecuting={nmapState.isExecuting}
              result={nmapState.lastResult}
              clearResult={() => setNmapState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Database size={24} />}
            title="DNS Lookup (dig)"
            description="Query DNS records for a domain"
            badge={{ text: "Network", color: "success" }}
          >
            <ToolExecutor 
              toolName="DNS Lookup (dig)"
              placeholder="Enter domain name (e.g., example.com)"
              buttonText="Lookup"
              exampleCommands={['example.com', 'google.com A', 'example.com MX']}
              processCommand={runDig}
              isExecuting={digState.isExecuting}
              result={digState.lastResult}
              clearResult={() => setDigState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Activity size={24} />}
            title="Traceroute"
            description="Trace network path to target host"
            badge={{ text: "Network", color: "success" }}
          >
            <ToolExecutor 
              toolName="Traceroute"
              placeholder="Enter hostname or IP for traceroute"
              buttonText="Trace"
              exampleCommands={['example.com', '8.8.8.8']}
              processCommand={runTraceroute}
              isExecuting={tracerouteState.isExecuting}
              result={tracerouteState.lastResult}
              clearResult={() => setTracerouteState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Database size={24} />}
            title="Whois Lookup"
            description="Query domain registration and IP allocation information"
          >
            <ToolExecutor 
              toolName="Whois Lookup"
              placeholder="Enter domain or IP address"
              buttonText="Lookup"
              exampleCommands={['example.com', '192.168.1.1']}
              processCommand={runWhois}
              isExecuting={whoisState.isExecuting}
              result={whoisState.lastResult}
              clearResult={() => setWhoisState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Shield size={24} />}
            title="SSL Certificate Checker"
            description="Validate SSL certificates and configurations"
            badge={{ text: "Security", color: "warning" }}
          >
            <ToolExecutor 
              toolName="SSL Certificate Checker"
              placeholder="Enter domain to check SSL certificate"
              buttonText="Check"
              exampleCommands={['example.com', 'google.com']}
              processCommand={runSslCheck}
              isExecuting={sslState.isExecuting}
              result={sslState.lastResult}
              clearResult={() => setSslState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
        </div>
      </Panel>
      
      {/* System Network Tools */}
      <Panel
        title="System Network Tools"
        description="Local network analysis tools"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolCard
            icon={<Network size={24} />}
            title="Network Connections"
            description="View active network connections"
            badge={{ text: "Network", color: "success" }}
          >
            <ToolExecutor 
              toolName="Network Connections"
              placeholder="Optional parameters for netstat"
              buttonText="View Connections"
              exampleCommands={['-tuln', '-ap', '-r']}
              processCommand={runNetstat}
              isExecuting={netstatState.isExecuting}
              result={netstatState.lastResult}
              clearResult={() => setNetstatState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Router size={24} />}
            title="Routing Table"
            description="View IP routing information"
            badge={{ text: "Network", color: "success" }}
          >
            <ToolExecutor 
              toolName="Routing Table"
              placeholder="Optional parameters"
              buttonText="View Routes"
              exampleCommands={['']}
              processCommand={runIpRoute}
              isExecuting={ipRouteState.isExecuting}
              result={ipRouteState.lastResult}
              clearResult={() => setIpRouteState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<Waves size={24} />}
            title="Packet Capture"
            description="Inspect network traffic at packet level"
            badge={{ text: "Advanced", color: "primary" }}
          >
            <ToolExecutor 
              toolName="Packet Capture"
              placeholder="Enter options or leave empty"
              buttonText="Capture"
              exampleCommands={['-i eth0', '-i eth0 port 80', '-i eth0 host 192.168.1.1']}
              processCommand={runTcpdump}
              isExecuting={tcpdumpState.isExecuting}
              result={tcpdumpState.lastResult}
              clearResult={() => setTcpdumpState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
          
          <ToolCard
            icon={<GitBranch size={24} />}
            title="DNS Reverse Lookup"
            description="Resolve IP addresses to hostnames"
            badge={{ text: "Network", color: "success" }}
          >
            <ToolExecutor 
              toolName="DNS Reverse Lookup"
              placeholder="Enter IP address to lookup"
              buttonText="Lookup"
              exampleCommands={['8.8.8.8', '1.1.1.1']}
              processCommand={runNslookup}
              isExecuting={nslookupState.isExecuting}
              result={nslookupState.lastResult}
              clearResult={() => setNslookupState({ isExecuting: false, lastResult: null })}
            />
          </ToolCard>
        </div>
      </Panel>
    </div>
  );
};