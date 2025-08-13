import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Eye, AlertTriangle, CheckCircle, Clock, Network, Globe, Database, Server, Copy, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export interface FormattedToolOutputProps {
  toolName: string;
  command: string;
  output: string;
  status: 'success' | 'error' | 'warning' | 'info' | 'loading';
  timestamp: string;
  onClear?: () => void;
}

type ToolType = 'nmap' | 'ping' | 'dig' | 'traceroute' | 'whois' | 'netstat' | 'ssl' | 'ip-route' | 'tcpdump' | 'nslookup' | 'unknown';

interface ParsedData {
  summary?: string;
  metadata?: Record<string, string>;
  results?: any[];
  rawSections?: { title: string; content: string }[];
}

export const FormattedToolOutput: React.FC<FormattedToolOutputProps> = ({
  toolName,
  command,
  output,
  status,
  timestamp,
  onClear
}) => {
  const [showRaw, setShowRaw] = useState(false);
  
  // Safe clipboard copy function
  const copyToClipboard = (text: string) => {
    try {
      // Create a temporary textarea to handle the copy
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      // Use notification system
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };
  
  // Function to handle download
  const downloadResult = (text: string) => {
    try {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tool-output-${new Date().getTime()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Use notification system
      toast.success('Downloaded successfully');
    } catch (err) {
      console.error('Failed to download: ', err);
      toast.error('Failed to download file');
    }
  };
  
  // Determine the tool type from the toolName
  const toolType = useMemo((): ToolType => {
    const normalizedToolName = toolName.toLowerCase();
    if (normalizedToolName.includes('nmap') || normalizedToolName.includes('port scan')) return 'nmap';
    if (normalizedToolName.includes('ping')) return 'ping';
    if (normalizedToolName.includes('dig')) return 'dig'; 
    if (normalizedToolName.includes('traceroute')) return 'traceroute';
    if (normalizedToolName.includes('whois')) return 'whois';
    if (normalizedToolName.includes('netstat')) return 'netstat';
    if (normalizedToolName.includes('ssl')) return 'ssl';
    if (normalizedToolName.includes('route')) return 'ip-route';
    if (normalizedToolName.includes('packet') || normalizedToolName.includes('tcpdump')) return 'tcpdump';
    if (normalizedToolName.includes('nslookup') || normalizedToolName.includes('dns lookup')) return 'nslookup';
    return 'unknown';
  }, [toolName]);

  // Parse the output based on the tool type
  const parsedData = useMemo((): ParsedData => {
    try {
      switch (toolType) {
        case 'nmap':
          return parseNmapOutput(output);
        case 'ping':
          return parsePingOutput(output);
        case 'dig':
          return parseDigOutput(output);
        case 'traceroute':
          return parseTracerouteOutput(output);
        case 'whois':
          return parseWhoisOutput(output);
        case 'netstat':
          return parseNetstatOutput(output);
        case 'ssl':
          return parseSslOutput(output);
        case 'ip-route':
          return parseIpRouteOutput(output);
        case 'tcpdump':
          return parseTcpdumpOutput(output);
        case 'nslookup':
          return parseNslookupOutput(output);
        default:
          return {
            summary: 'Output not parsed',
            rawSections: [{ title: 'Raw Output', content: output }]
          };
      }
    } catch (error) {
      console.error('Error parsing tool output:', error);
      return {
        summary: 'Error parsing output',
        rawSections: [{ title: 'Raw Output', content: output }]
      };
    }
  }, [toolType, output]);

  const getIconForTool = (type: ToolType) => {
    switch (type) {
      case 'nmap': return <Network size={16} />;
      case 'ping': return <Globe size={16} />;
      case 'dig': return <Database size={16} />;
      case 'traceroute': return <Network size={16} />;
      case 'whois': return <Globe size={16} />;
      case 'netstat': return <Network size={16} />;
      case 'ssl': return <Server size={16} />;
      case 'ip-route': return <Network size={16} />;
      case 'tcpdump': return <Network size={16} />;
      case 'nslookup': return <Database size={16} />;
      default: return <Code size={16} />;
    }
  };

  const getStatusIcon = (status: 'success' | 'error' | 'warning' | 'info' | 'loading') => {
    switch (status) {
      case 'success': return <CheckCircle size={14} className="text-[rgb(var(--color-success))]" />;
      case 'error': return <AlertTriangle size={14} className="text-[rgb(var(--color-error))]" />;
      case 'warning': return <AlertTriangle size={14} className="text-[rgb(var(--color-warning))]" />;
      case 'info': return <Clock size={14} className="text-[rgb(var(--color-info))]" />;
      case 'loading': return <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[rgb(var(--color-primary))]"></div>;
      default: return null;
    }
  };

  return (
    <div className="border border-[rgb(var(--color-border))] rounded-md overflow-hidden mt-4">
      {/* Header with tool name and status */}
      <div className="flex justify-between items-center p-2 bg-[rgba(var(--color-card-muted),0.3)] border-b border-[rgb(var(--color-border))]">
        <div className="flex items-center">
          <div className="mr-2 text-[rgb(var(--color-primary))]">
            {getIconForTool(toolType)}
          </div>
          <span className="font-medium text-sm">{toolName} Result</span>
          <div className="ml-2">
            {getStatusIcon(status)}
          </div>
        </div>
        <div className="flex space-x-1">
          <button 
            title="Copy output"
            className="p-1 hover:bg-[rgba(var(--color-primary),0.15)] hover:text-[rgb(var(--color-primary))] rounded transition-colors group"
            onClick={() => copyToClipboard(output)}
          >
            <Copy size={14} className="text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-primary))] transition-colors" />
          </button>
          <button 
            title="Download output"
            className="p-1 hover:bg-[rgba(var(--color-primary),0.15)] hover:text-[rgb(var(--color-primary))] rounded transition-colors group"
            onClick={() => downloadResult(output)}
          >
            <Download size={14} className="text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-primary))] transition-colors" />
          </button>
          <button
            title={showRaw ? "Show formatted output" : "Show raw output"}
            onClick={() => setShowRaw(!showRaw)}
            className="p-1 hover:bg-[rgba(var(--color-primary),0.15)] hover:text-[rgb(var(--color-primary))] rounded transition-colors flex items-center space-x-1 group"
          >
            {showRaw ? <Eye size={14} className="text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-primary))] transition-colors" /> : <Code size={14} className="text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-primary))] transition-colors" />}
            <span className="text-xs text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-primary))] transition-colors">{showRaw ? "Formatted" : "Raw"}</span>
          </button>
          <button 
            title="Clear output"
            className="p-1 hover:bg-[rgba(var(--color-error),0.15)] hover:text-[rgb(var(--color-error))] rounded transition-colors group"
            onClick={onClear}
          >
            <Trash2 size={14} className="text-[rgb(var(--color-text))] group-hover:text-[rgb(var(--color-error))] transition-colors" />
          </button>
        </div>
      </div>

      {/* Output content */}
      <div className="overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          {showRaw ? (
            <motion.div
              key="raw"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <pre className="p-3 font-mono text-sm whitespace-pre-wrap bg-[rgb(var(--color-card))] text-[rgb(var(--color-text))]">
                {output}
              </pre>
            </motion.div>
          ) : (
            <motion.div
              key="formatted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 bg-[rgb(var(--color-card))]">
                {/* Summary section */}
                {parsedData.summary && (
                  <div className="mb-3 p-2 bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-text))] rounded">
                    {parsedData.summary}
                  </div>
                )}

                {/* Metadata section */}
                {parsedData.metadata && Object.keys(parsedData.metadata).length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1 text-[rgb(var(--color-text-secondary))]">Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(parsedData.metadata).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="font-medium mr-2">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Results section */}
                {parsedData.results && parsedData.results.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium mb-1 text-[rgb(var(--color-text-secondary))]">Results</h4>
                    {toolType === 'nmap' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left bg-[rgba(var(--color-card-muted),0.3)]">
                              <th className="p-1">Port</th>
                              <th className="p-1">Protocol</th>
                              <th className="p-1">State</th>
                              <th className="p-1">Service</th>
                              <th className="p-1">Version</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsedData.results.map((item: any, index) => (
                              <tr key={index} className="border-b border-[rgb(var(--color-border))]">
                                <td className="p-1 font-mono">{item.port.split('/')[0]}</td>
                                <td className="p-1 uppercase">{item.protocol}</td>
                                <td className="p-1">
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                    item.state === 'open' 
                                      ? 'bg-[rgba(var(--color-success),0.1)] text-[rgb(var(--color-success))]' 
                                      : item.state === 'closed'
                                      ? 'bg-[rgba(var(--color-error),0.1)] text-[rgb(var(--color-error))]'
                                      : 'bg-[rgba(var(--color-warning),0.1)] text-[rgb(var(--color-warning))]'
                                  }`}>
                                    {item.state}
                                  </span>
                                </td>
                                <td className="p-1">{item.service}</td>
                                <td className="p-1 text-xs text-[rgb(var(--color-text-secondary))]">{item.version || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Port statistics summary */}
                        {parsedData.metadata && (parsedData.metadata['Open Ports'] || parsedData.metadata['Filtered Ports']) && (
                          <div className="mt-3 flex justify-between text-xs text-[rgb(var(--color-text-secondary))]">
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 rounded-full bg-[rgba(var(--color-success),0.5)] mr-1"></span>
                              <span>Open: {parsedData.metadata['Open Ports']}</span>
                            </div>
                            {parsedData.metadata['Filtered Ports'] && (
                              <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-[rgba(var(--color-warning),0.5)] mr-1"></span>
                                <span>Filtered: {parsedData.metadata['Filtered Ports']}</span>
                              </div>
                            )}
                            {parsedData.metadata['Closed Ports'] && (
                              <div className="flex items-center">
                                <span className="inline-block w-3 h-3 rounded-full bg-[rgba(var(--color-error),0.5)] mr-1"></span>
                                <span>Closed: {parsedData.metadata['Closed Ports']}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Security findings section */}
                        {parsedData.rawSections && parsedData.rawSections.length > 0 && parsedData.rawSections[0].title === 'Security Findings' && (
                          <div className="mt-3 p-2 bg-[rgba(var(--color-warning),0.1)] border border-[rgba(var(--color-warning),0.3)] rounded">
                            <h5 className="text-sm font-medium text-[rgb(var(--color-warning))] flex items-center">
                              <AlertTriangle size={14} className="mr-1" />
                              Security Findings
                            </h5>
                            <ul className="mt-1 list-disc pl-5 text-xs space-y-1">
                              {parsedData.rawSections[0].content.split('\n').map((finding, idx) => (
                                <li key={idx} className="text-[rgb(var(--color-text))]">{finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {toolType === 'ping' && (
                      <div className="space-y-2">
                        {parsedData.results.map((item: any, index) => (
                          <div key={index} className="flex justify-between p-1 border-b border-[rgb(var(--color-border))]">
                            <span>Sequence {item.seq || index + 1}</span>
                            <span className="font-mono">{item.time}</span>
                          </div>
                        ))}
                        {parsedData.metadata && (
                          <div className="mt-2 p-2 bg-[rgba(var(--color-card-muted),0.3)] rounded">
                            <div className="flex justify-between">
                              <span>Packets: {parsedData.metadata.transmitted || '?'}/{parsedData.metadata.received || '?'}</span>
                              <span>Loss: {parsedData.metadata.loss || 'N/A'}</span>
                              <span>Min/Avg/Max: {parsedData.metadata.rtt || 'N/A'}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {(['dig', 'nslookup'].includes(toolType)) && (
                      <div className="space-y-2">
                        {parsedData.results.map((item: any, index) => (
                          <div key={index} className="p-1 border-b border-[rgb(var(--color-border))] flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-mono">{item.type} {item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {toolType === 'traceroute' && (
                      <div className="space-y-1">
                        {parsedData.results.map((item: any, index) => (
                          <div key={index} className="flex items-center p-1 border-b border-[rgb(var(--color-border))]">
                            <div className="w-8 text-center font-bold">{item.hop}</div>
                            <div className="flex-grow">
                              <div className="font-mono">{item.hostname || item.ip || '*'}</div>
                              {item.hostname && item.ip && item.hostname !== item.ip && (
                                <div className="text-xs text-[rgb(var(--color-text-secondary))]">{item.ip}</div>
                              )}
                            </div>
                            <div className="font-mono text-sm">{item.time}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Raw sections */}
                {parsedData.rawSections && parsedData.rawSections.length > 0 && (
                  <div>
                    {parsedData.rawSections.map((section, index) => (
                      <div key={index} className="mb-2">
                        <h4 className="text-sm font-medium mb-1 text-[rgb(var(--color-text-secondary))]">{section.title}</h4>
                        <pre className="text-xs bg-[rgba(var(--color-card-muted),0.3)] p-2 rounded font-mono whitespace-pre-wrap">
                          {section.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

                {/* If no parsing is available */}
                {!parsedData.summary && !parsedData.metadata && (!parsedData.results || parsedData.results.length === 0) && (!parsedData.rawSections || parsedData.rawSections.length === 0) && (
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {output}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with timestamp and command info */}
      <div className="p-2 bg-[rgba(var(--color-card-muted),0.2)] border-t border-[rgb(var(--color-border))] text-xs text-[rgb(var(--color-text-secondary))] flex justify-between items-center">
        <div>
          <span className="font-mono">{command}</span>
        </div>
        <div>
          <Clock size={12} className="inline mr-1" />
          <span>{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// Parser functions
function parseNmapOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {
    port: string;
    protocol: string; 
    state: string; 
    service: string;
    version?: string;
    reason?: string;
  }[] = [];
  
  let summary = '';
  let target = '';
  let scanTime = '';
  let ipAddress = '';
  let macAddress = '';
  let osInfo = '';
  let scanType = '';
  let hostsUp = 0;
  let hostsDown = 0;
  const vulnerabilities: string[] = [];
  
  // Stats for summary
  let openPorts = 0;
  let closedPorts = 0;
  let filteredPorts = 0;
  
  // Extract scan information
  for (const line of lines) {
    // Extract target information
    if (line.includes('Nmap scan report for')) {
      target = line.split('for ')[1];
      
      // Extract IP address if it's in parentheses
      const ipMatch = line.match(/\(([^)]+)\)/);
      if (ipMatch) {
        ipAddress = ipMatch[1];
      } else if (target.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        ipAddress = target;
      }
    } 
    // Extract host status
    else if (line.includes('Host is up')) {
      const latency = line.match(/\((.*?)\s+latency\)/)?.[1] || '';
      summary = `Host ${target} is up (${latency} latency)`;
      hostsUp++;
    }
    else if (line.includes('Host is down')) {
      summary = `Host ${target} is down`;
      hostsDown++;
    }
    // Extract MAC address
    else if (line.includes('MAC Address:')) {
      macAddress = line.split('MAC Address:')[1].trim().split(' ')[0];
    } 
    // Extract OS detection
    else if (line.includes('OS details:') || line.includes('OS guess:')) {
      osInfo = line.split(':')[1].trim();
    }
    // Extract scan type
    else if (line.includes('Nmap scan report') && scanType === '') {
      if (line.includes('-sS')) scanType = 'SYN Stealth Scan';
      else if (line.includes('-sT')) scanType = 'Connect Scan';
      else if (line.includes('-sU')) scanType = 'UDP Scan';
      else if (line.includes('-sV')) scanType = 'Version Detection';
      else if (line.includes('-A')) scanType = 'Aggressive Scan';
      else scanType = 'Port Scan';
    }
    
    // Extract port information - handle both UDP and TCP
    const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+(\w+)\s+(.+?)(?:\s+(.+))?$/);
    if (portMatch) {
      const [, portNum, protocol, state, service, version = ''] = portMatch;
      
      // Update counters
      if (state === 'open') openPorts++;
      else if (state === 'closed') closedPorts++;
      else if (state === 'filtered') filteredPorts++;
      
      // Add to results
      results.push({
        port: `${portNum}/${protocol}`,
        protocol,
        state,
        service,
        version: version || undefined
      });
      
      // Identify potential security issues based on open services
      const serviceLower = service.toLowerCase();
      if (state === 'open') {
        if (serviceLower === 'telnet') {
          vulnerabilities.push('Potentially insecure Telnet service running');
        } else if (serviceLower === 'ftp') {
          vulnerabilities.push('FTP service may allow anonymous access');
        } else if (serviceLower.includes('ms-sql')) {
          vulnerabilities.push('MS-SQL Database exposed');
        } else if (serviceLower === 'mysql') {
          vulnerabilities.push('MySQL Database exposed');
        } else if (serviceLower === 'mongodb') {
          vulnerabilities.push('MongoDB exposed');
        } else if (serviceLower === 'redis') {
          vulnerabilities.push('Redis Database exposed');
        }
      }
    }
    
    // Extract scan time
    else if (line.includes('Nmap done:')) {
      scanTime = line.match(/scanned in ([\d\.]+) seconds/)?.[1] || '';
      
      // Extract host summary if available
      const hostSummary = line.match(/(\d+) IP address(?:es)? \((\d+) host(?:s)? up\)/);
      if (hostSummary) {
        const totalHosts = parseInt(hostSummary[1]);
        hostsUp = parseInt(hostSummary[2]);
        hostsDown = totalHosts - hostsUp;
      }
    }
    
    // Extract vulnerability information from NSE scripts
    else if (line.includes('VULNERABLE:')) {
      let vulnInfo = line.split('VULNERABLE:')[1].trim();
      if (vulnInfo) {
        vulnerabilities.push(vulnInfo);
      }
    }
    else if (line.includes('CVE-')) {
      const cveMatch = line.match(/CVE-\d+-\d+/);
      if (cveMatch) {
        vulnerabilities.push(`Potential vulnerability: ${cveMatch[0]}`);
      }
    }
  }
  
  // If we didn't capture a summary earlier, create one based on available information
  if (!summary && (hostsUp > 0 || hostsDown > 0)) {
    if (hostsUp > 0 && hostsDown > 0) {
      summary = `Scanned ${hostsUp + hostsDown} hosts, ${hostsUp} up and ${hostsDown} down`;
    } else if (hostsUp > 0) {
      summary = `All ${hostsUp} scanned hosts are up`;
    } else {
      summary = `All ${hostsDown} scanned hosts are down`;
    }
  }

  // Add port statistics to summary if available
  if (results.length > 0) {
    if (summary) {
      summary += ` with ${openPorts} open port${openPorts !== 1 ? 's' : ''}`;
      
      if (filteredPorts > 0) {
        summary += `, ${filteredPorts} filtered`;
      }
    } else {
      summary = `Found ${openPorts} open port${openPorts !== 1 ? 's' : ''} out of ${results.length} scanned`;
    }
    
    // Add security note if vulnerabilities found
    if (vulnerabilities.length > 0) {
      summary += ` (${vulnerabilities.length} potential security issues)`;
    }
  } else if (!summary) {
    summary = 'No open ports found';
  }
  
  // Build metadata
  const metadata: Record<string, string> = {};
  
  if (target) metadata['Target'] = target;
  if (ipAddress && ipAddress !== target) metadata['IP Address'] = ipAddress;
  if (macAddress) metadata['MAC Address'] = macAddress;
  if (scanType) metadata['Scan Type'] = scanType;
  if (osInfo) metadata['OS Detection'] = osInfo;
  
  // Add scan statistics to metadata
  metadata['Open Ports'] = openPorts.toString();
  if (filteredPorts > 0) metadata['Filtered Ports'] = filteredPorts.toString();
  if (closedPorts > 0) metadata['Closed Ports'] = closedPorts.toString();
  if (scanTime) metadata['Scan Time'] = `${scanTime}s`;
  
  // Create sections for specialized raw output, but not the full output
  const rawSections = [];
  
  // Add vulnerabilities section if any found
  if (vulnerabilities.length > 0) {
    rawSections.push({
      title: 'Security Findings',
      content: vulnerabilities.join('\n')
    });
  }
  
  return {
    summary,
    metadata,
    results,
    rawSections
  };
}

function parsePingOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {seq?: number; ttl?: number; time: string}[] = [];
  let target = '';
  let ipAddress = '';
  let packetSize = '';
  let summary = '';
  let statistics: Record<string, string> = {};
  
  for (const line of lines) {
    if (line.startsWith('PING')) {
      // Extract target hostname or IP
      const parts = line.split(' ');
      if (parts.length > 1) {
        target = parts[1].replace('(', '').replace(')', '');
      }
      
      // Extract IP address if available
      const ipMatch = line.match(/\(([^)]+)\)/);
      if (ipMatch && ipMatch[1]) {
        ipAddress = ipMatch[1];
      }
      
      // Extract packet size
      const sizeMatch = line.match(/(\d+)\s*\(\d+\) bytes/);
      if (sizeMatch && sizeMatch[1]) {
        packetSize = sizeMatch[1];
      }
    } else if (line.includes('bytes from')) {
      const seqMatch = line.match(/icmp_seq=(\d+)/);
      const timeMatch = line.match(/time=([\d\.]+)/);
      const ttlMatch = line.match(/ttl=(\d+)/);
      
      if (timeMatch) {
        results.push({
          seq: seqMatch ? parseInt(seqMatch[1]) : undefined,
          ttl: ttlMatch ? parseInt(ttlMatch[1]) : undefined,
          time: `${timeMatch[1]} ms`
        });
      }
    } else if (line.includes('packets transmitted')) {
      const packetStats = line.match(/(\d+) packets transmitted, (\d+) received, (\d+)% packet loss/);
      if (packetStats) {
        statistics.transmitted = packetStats[1];
        statistics.received = packetStats[2];
        statistics.loss = packetStats[3] + '%';
      }
    } else if (line.includes('min/avg/max')) {
      const rttMatch = line.match(/= ([\d\.\/]+) ms/);
      if (rttMatch) {
        const rttValues = rttMatch[1].split('/');
        if (rttValues.length >= 3) {
          statistics.min_rtt = rttValues[0] + ' ms';
          statistics.avg_rtt = rttValues[1] + ' ms';
          statistics.max_rtt = rttValues[2] + ' ms';
        } else {
          statistics.rtt = rttMatch[1] + ' ms';
        }
      }
    }
  }
  
  // Add IP address to metadata if different from target
  if (ipAddress && ipAddress !== target) {
    statistics.IP = ipAddress;
  }
  
  if (packetSize) {
    statistics['Packet Size'] = packetSize + ' bytes';
  }
  
  // Determine if host is reachable or not
  const isReachable = results.length > 0;
  const packetLoss = statistics.loss ? parseInt(statistics.loss) : 100;
  
  // Create a more useful summary
  if (isReachable) {
    const successRate = 100 - packetLoss;
    
    if (successRate === 100) {
      summary = `Host ${target} is reachable (100% success)`;
    } else if (successRate > 0) {
      summary = `Host ${target} is partially reachable (${successRate}% success)`;
    } else {
      summary = `Host ${target} is unreachable (0% success)`;
    }
    
    // Add average response time if available
    if (statistics.avg_rtt) {
      summary += ` - Average response: ${statistics.avg_rtt}`;
    }
  } else {
    summary = `Host ${target} is unreachable - no responses received`;
  }
  
  // Rename statistics keys to be more user-friendly
  const cleanedStats: Record<string, string> = {};
  if (statistics.transmitted) cleanedStats['Packets Sent'] = statistics.transmitted;
  if (statistics.received) cleanedStats['Packets Received'] = statistics.received;
  if (statistics.loss) cleanedStats['Packet Loss'] = statistics.loss;
  if (statistics.min_rtt) cleanedStats['Min Response'] = statistics.min_rtt;
  if (statistics.avg_rtt) cleanedStats['Avg Response'] = statistics.avg_rtt;
  if (statistics.max_rtt) cleanedStats['Max Response'] = statistics.max_rtt;
  if (statistics.IP) cleanedStats['IP Address'] = statistics.IP;
  if (statistics['Packet Size']) cleanedStats['Packet Size'] = statistics['Packet Size'];
  
  return {
    summary,
    metadata: cleanedStats,
    results
  };
}

function parseDigOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {name: string; type: string; value: string; ttl?: string; class?: string}[] = [];
  let domain = '';
  let queryTime = '';
  let server = '';
  let status = '';
  let recordCount = 0;
  
  // Extract status information
  const statusMatch = output.match(/;; ->>HEADER<<- .*status: ([^,]+)/i);
  if (statusMatch && statusMatch[1]) {
    status = statusMatch[1].trim();
  }
  
  // Extract question section
  const questionMatch = output.match(/;; QUESTION SECTION:([\s\S]*?)(?:;;|$)/);
  if (questionMatch && questionMatch[1]) {
    const question = questionMatch[1].trim();
    const parts = question.split(/\s+/);
    if (parts.length >= 2) {
      domain = parts[0].replace(/\.$/, '');
    }
  }
  
  // Extract answer section
  const answerMatch = output.match(/;; ANSWER SECTION:([\s\S]*?)(?:;;|$)/);
  if (answerMatch && answerMatch[1]) {
    const answers = answerMatch[1].trim().split('\n');
    for (const answer of answers) {
      const parts = answer.trim().split(/\s+/);
      if (parts.length >= 5) {
        results.push({
          name: parts[0].replace(/\.$/, ''),
          ttl: parts[1],
          class: parts[2],
          type: parts[3],
          value: parts.slice(4).join(' ')
        });
      }
    }
    recordCount += answers.length;
  }
  
  // Extract additional records sections if present
  const additionalMatch = output.match(/;; ADDITIONAL SECTION:([\s\S]*?)(?:;;|$)/);
  if (additionalMatch && additionalMatch[1]) {
    const additionals = additionalMatch[1].trim().split('\n');
    for (const additional of additionals) {
      const parts = additional.trim().split(/\s+/);
      if (parts.length >= 5) {
        results.push({
          name: parts[0].replace(/\.$/, ''),
          ttl: parts[1],
          class: parts[2],
          type: parts[3],
          value: parts.slice(4).join(' ')
        });
      }
    }
    recordCount += additionals.length;
  }
  
  // Extract authority section
  const authorityMatch = output.match(/;; AUTHORITY SECTION:([\s\S]*?)(?:;;|$)/);
  if (authorityMatch && authorityMatch[1]) {
    const authorities = authorityMatch[1].trim().split('\n');
    recordCount += authorities.length;
  }
  
  // Extract query time and server
  for (const line of lines) {
    if (line.includes('Query time:')) {
      queryTime = line.match(/Query time: (\d+)/)?.[1] || '';
    } else if (line.includes('SERVER:')) {
      server = line.match(/SERVER: (.*?)(?:#|$)/)?.[1] || '';
    }
  }
  
  // Create an appropriate summary based on DNS status
  let summary = '';
  
  if (status === 'NOERROR' && results.length > 0) {
    const recordTypes = [...new Set(results.map(r => r.type))].join(', ');
    summary = `Successfully resolved ${domain} with ${results.length} ${results.length === 1 ? 'record' : 'records'} (${recordTypes})`;
  } else if (status === 'NOERROR' && results.length === 0) {
    summary = `Domain ${domain} exists but has no records of the requested type`;
  } else if (status === 'NXDOMAIN') {
    summary = `Domain ${domain} does not exist (NXDOMAIN)`;
  } else if (status) {
    summary = `DNS lookup for ${domain} returned status: ${status}`;
  } else {
    summary = `DNS lookup completed for ${domain} with ${results.length} ${results.length === 1 ? 'record' : 'records'}`;
  }
  
  // Put together metadata with more information
  const metadata: Record<string, string> = {
    'Domain': domain
  };
  
  if (server) metadata['DNS Server'] = server;
  if (queryTime) metadata['Query Time'] = `${queryTime} ms`;
  if (status) metadata['Status'] = status;
  metadata['Total Records'] = recordCount.toString();
  
  // Group records by type for better presentation
  const recordsByType: Record<string, number> = {};
  results.forEach(r => {
    if (!recordsByType[r.type]) recordsByType[r.type] = 0;
    recordsByType[r.type]++;
  });
  
  Object.entries(recordsByType).forEach(([type, count]) => {
    metadata[`${type} Records`] = count.toString();
  });
  
  return {
    summary,
    metadata,
    results
  };
}

function parseTracerouteOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {hop: number; hostname?: string; ip?: string; time: string}[] = [];
  let target = '';
  let maxHops = '';
  let packetSize = '';
  
  // Extract target and other metadata
  if (lines.length > 0) {
    const firstLine = lines[0];
    const targetMatch = firstLine.match(/traceroute to ([\w\.-]+)/);
    if (targetMatch) {
      target = targetMatch[1];
    }
    
    // Extract max hops
    const maxHopsMatch = firstLine.match(/(\d+) hops max/);
    if (maxHopsMatch) {
      maxHops = maxHopsMatch[1];
    }
    
    // Extract packet size
    const packetSizeMatch = firstLine.match(/(\d+) byte packets/);
    if (packetSizeMatch) {
      packetSize = packetSizeMatch[1];
    }
  }
  
  // Extract hops
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const hopMatch = line.match(/^\s*(\d+)\s+(.+)$/);
    if (hopMatch) {
      const hop = parseInt(hopMatch[1]);
      const hopData = hopMatch[2];
      
      // Check if there's a hostname and IP or just IP/timeout
      if (hopData.includes('*')) {
        results.push({
          hop,
          time: '*'
        });
      } else {
        const ipMatch = hopData.match(/\(([\d\.]+)\)/);
        const ip = ipMatch ? ipMatch[1] : '';
        
        let hostname = '';
        if (ipMatch && ipMatch.index && ipMatch.index > 0) {
          hostname = hopData.substring(0, ipMatch.index).trim();
        }
        
        const timeMatch = hopData.match(/([\d\.]+) ms/);
        const time = timeMatch ? timeMatch[1] + ' ms' : 'N/A';
        
        results.push({
          hop,
          hostname: hostname || undefined,
          ip,
          time
        });
      }
    }
  }

  // Find the last successful hop to determine if trace completed
  const lastSuccessfulHop = results.filter(hop => hop.time !== '*').pop();
  const traceCompleted = lastSuccessfulHop && lastSuccessfulHop.ip === target;
  
  // Create a more informative summary
  let summary = '';
  if (target) {
    if (traceCompleted) {
      summary = `Trace to ${target} completed successfully with ${results.length} hops`;
    } else if (results.length > 0 && results.every(hop => hop.time === '*')) {
      summary = `Trace to ${target} failed - no responses received`;
    } else if (results.length > 0) {
      summary = `Trace to ${target} partially completed with ${results.length} hops`;
    } else {
      summary = `Trace to ${target} - no route information available`;
    }
  } else {
    summary = `Traceroute completed with ${results.length} hops`;
  }
  
  // Enhance the metadata
  const metadata: Record<string, string> = {
    'Destination': target
  };
  
  if (maxHops) metadata['Max Hops'] = maxHops;
  if (packetSize) metadata['Packet Size'] = packetSize + ' bytes';
  metadata['Hops'] = results.length.toString();
  
  // Calculate average response time for successful hops
  const successfulTimes = results
    .filter(hop => hop.time !== '*' && hop.time !== 'N/A')
    .map(hop => parseFloat(hop.time.replace(' ms', '')));
  
  if (successfulTimes.length > 0) {
    const avgTime = successfulTimes.reduce((a, b) => a + b, 0) / successfulTimes.length;
    metadata['Avg Response Time'] = avgTime.toFixed(2) + ' ms';
  }
  
  return {
    summary,
    metadata,
    results
  };
}

function parseWhoisOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  // Common WHOIS field mappings to standardized keys
  const keyMappings: Record<string, string> = {
    'Domain Name': 'Domain',
    'Domain': 'Domain',
    'Registry Domain ID': 'Domain ID',
    'Registrar': 'Registrar',
    'Registrar WHOIS Server': 'WHOIS Server',
    'WHOIS Server': 'WHOIS Server',
    'Updated Date': 'Updated',
    'Last Updated Date': 'Updated',
    'Last Modified': 'Updated',
    'Creation Date': 'Created',
    'Created Date': 'Created',
    'Created': 'Created',
    'Registration Date': 'Created',
    'Expiry Date': 'Expires',
    'Expiration Date': 'Expires',
    'Registry Expiry Date': 'Expires',
    'Registrant Organization': 'Organization',
    'Registrant Org': 'Organization',
    'Registrant Country': 'Country',
    'Admin Email': 'Admin Email',
    'Tech Email': 'Tech Email',
    'Email': 'Contact Email',
    'Name Server': 'Name Server',
    'Status': 'Status',
    'Domain Status': 'Status',
    'DNSSEC': 'DNSSEC'
  };
  
  const metadata: Record<string, string> = {};
  let domain = '';
  let nameServers: string[] = [];
  let status: string[] = [];
  
  const lines = output.split('\n');
  
  // First pass: extract basic info and domain name
  for (const line of lines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex > 0) {
      const key = line.substring(0, separatorIndex).trim();
      const value = line.substring(separatorIndex + 1).trim();
      
      // Extract domain name
      if (key === 'Domain Name' || key === 'Domain') {
        domain = value;
      }
      
      // Map and extract standard metadata
      if (keyMappings[key]) {
        const mappedKey = keyMappings[key];
        
        // Handle special cases for multiple values
        if (mappedKey === 'Name Server') {
          nameServers.push(value);
        } else if (mappedKey === 'Status') {
          status.push(value.split(' ')[0]); // Often format is "status (comment)"
        } else {
          metadata[mappedKey] = value;
        }
      }
    }
  }
  
  // Add consolidated multiple values
  if (nameServers.length > 0) {
    metadata['Name Servers'] = nameServers.filter((v, i, a) => a.indexOf(v) === i).join(', ');
  }
  
  if (status.length > 0) {
    metadata['Status'] = status.filter((v, i, a) => a.indexOf(v) === i).join(', ');
  }
  
  // Extract dates in a user-friendly format
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    } catch (e) {}
    return dateStr;
  };
  
  if (metadata['Created']) metadata['Created'] = formatDate(metadata['Created']);
  if (metadata['Updated']) metadata['Updated'] = formatDate(metadata['Updated']);
  if (metadata['Expires']) metadata['Expires'] = formatDate(metadata['Expires']);
  
  // Check if the domain is available or registered
  const isDomainAvailable = output.includes('No match for domain') || 
                            output.includes('NOT FOUND') || 
                            output.includes('No Data Found') ||
                            output.toLowerCase().includes('domain not found');
  
  // Create a more informative summary
  let summary = '';
  if (isDomainAvailable) {
    const searchedDomain = domain || output.match(/(?:No match for |NOT FOUND:|No Data Found for )["']?([a-zA-Z0-9.-]+)["']?/i)?.[1] || 'Domain';
    summary = `Domain ${searchedDomain} is available for registration`;
  } else if (domain) {
    const org = metadata['Organization'] ? ` registered to ${metadata['Organization']}` : '';
    const registrar = metadata['Registrar'] ? ` through ${metadata['Registrar']}` : '';
    const expiry = metadata['Expires'] ? `, expires on ${metadata['Expires']}` : '';
    summary = `Domain ${domain}${org}${registrar}${expiry}`;
    
    // Add status information
    if (status.length > 0) {
      if (status.includes('clientTransferProhibited')) {
        summary += ' (Transfer Protected)';
      } else if (status.includes('clientDeleteProhibited')) {
        summary += ' (Delete Protected)';
      }
    }
  } else {
    summary = 'WHOIS lookup completed';
  }
  
  return {
    summary,
    metadata
  };
}

function parseNetstatOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {proto: string; local: string; foreign: string; state: string; pid?: string}[] = [];
  
  let headerLine = -1;
  
  // Find header line and parse it
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Proto') && lines[i].includes('Local Address')) {
      headerLine = i;
      break;
    }
  }
  
  // Parse data rows
  if (headerLine >= 0) {
    for (let i = headerLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        results.push({
          proto: parts[0],
          local: parts[1],
          foreign: parts[2],
          state: parts[3],
          pid: parts.length > 4 ? parts[parts.length - 1] : undefined
        });
      }
    }
  }
  
  // Count by state
  const states: Record<string, number> = {};
  results.forEach(item => {
    if (!states[item.state]) {
      states[item.state] = 0;
    }
    states[item.state]++;
  });
  
  const stateText = Object.entries(states)
    .map(([state, count]) => `${count} ${state}`)
    .join(', ');
  
  return {
    summary: `Found ${results.length} network connections (${stateText})`,
    results
  };
}

function parseSslOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const metadata: Record<string, string> = {};
  let issuer = '';
  let validFrom = '';
  let validTo = '';
  let subject = '';
  let server = '';
  let daysLeft = '';
  let version = '';
  let serialNumber = '';
  let signatureAlgorithm = '';
  let publicKeyAlgorithm = '';
  let cipher = '';
  let tlsVersion = '';
  let isValid = false;
  
  // Extract information from detailed SSL output
  const lines = output.split('\n');
  for (const line of lines) {
    
    // Extract server information
    if (line.includes('Server certificate') || line.includes('subject:')) {
      server = line.split(':')[1]?.trim() || '';
    } 
    // Extract subject information
    else if (line.includes('subject=') || line.match(/subject:\s+/i)) {
      subject = line.split(/subject[=:]\s*/i)[1]?.trim() || '';
    } 
    // Extract issuer information
    else if (line.includes('issuer=') || line.match(/issuer:\s+/i)) {
      issuer = line.split(/issuer[=:]\s*/i)[1]?.trim() || '';
    } 
    // Extract start date
    else if (line.includes('start date:') || line.match(/Valid From:/i)) {
      validFrom = line.split(/start date:|Valid From:/i)[1]?.trim() || '';
    } 
    // Extract expiry date
    else if (line.includes('expire date:') || line.match(/Valid To:|Valid until:/i)) {
      validTo = line.split(/expire date:|Valid To:|Valid until:/i)[1]?.trim() || '';
    } 
    // Extract days left
    else if (line.match(/Days Left:\s*\d+/i)) {
      daysLeft = line.match(/Days Left:\s*(\d+)/i)?.[1] || '';
    }
    // Extract version
    else if (line.match(/Version:\s+/i)) {
      version = line.split(/Version:\s+/i)[1]?.trim() || '';
    }
    // Extract serial number
    else if (line.match(/Serial Number:/i)) {
      serialNumber = line.split(/Serial Number:/i)[1]?.trim() || '';
    }
    // Extract signature algorithm
    else if (line.match(/Signature Algorithm:/i)) {
      signatureAlgorithm = line.split(/Signature Algorithm:/i)[1]?.trim() || '';
    }
    // Extract public key algorithm
    else if (line.match(/Public Key Algorithm:/i)) {
      publicKeyAlgorithm = line.split(/Public Key Algorithm:/i)[1]?.trim() || '';
    }
    // Extract TLS version
    else if (line.match(/TLS Version:/i)) {
      tlsVersion = line.split(/TLS Version:/i)[1]?.trim() || '';
    }
    // Extract TLS cipher suite
    else if (line.match(/Cipher Suite:/i)) {
      cipher = line.split(/Cipher Suite:/i)[1]?.trim() || '';
    }
    // Check if valid
    else if (line.includes('Verify return code: 0 (ok)') || line.includes('OK') || line.match(/verification: OK/i)) {
      isValid = true;
    }
  }
  
  // Extract domain from subject if server is not available
  if (!server && subject) {
    const cnMatch = subject.match(/CN\s*=\s*([^,]+)/);
    if (cnMatch) {
      server = cnMatch[1].trim();
    }
  }
  
  // Add metadata with clear labels for important information
  if (server) metadata['Domain'] = server;
  if (subject) metadata['Subject'] = subject;
  if (issuer) metadata['Issuer'] = issuer;
  if (validFrom) metadata['Valid From'] = validFrom;
  if (validTo) metadata['Valid To'] = validTo;
  if (daysLeft) metadata['Days Left'] = daysLeft;
  if (version) metadata['Version'] = version;
  if (serialNumber) metadata['Serial Number'] = serialNumber;
  if (signatureAlgorithm) metadata['Signature Algorithm'] = signatureAlgorithm;
  if (publicKeyAlgorithm) metadata['Public Key Algorithm'] = publicKeyAlgorithm;
  if (tlsVersion) metadata['TLS Version'] = tlsVersion;
  if (cipher) metadata['Cipher Suite'] = cipher;
  
  // Determine if certificate is expired
  const isExpired = validTo ? new Date(validTo) < new Date() : false;
  const validityStatus = isValid ? 'Valid' : (isExpired ? 'Expired' : 'Unknown');
  
  // Create a clear, concise summary
  let summary = '';
  if (server) {
    summary = `SSL Certificate for ${server}: ${validityStatus}`;
    if (daysLeft && !isExpired) {
      summary += ` (${daysLeft} days remaining)`;
    }
  } else {
    summary = `SSL Certificate: ${validityStatus}`;
  }
  
  return {
    summary,
    metadata
  };
}

function parseIpRouteOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n').filter(line => line.trim());
  const results = lines.map(line => ({
    route: line.trim()
  }));
  
  const defaultRoutes = lines.filter(line => line.startsWith('default'));
  let summary = '';
  
  if (defaultRoutes.length > 0) {
    const via = defaultRoutes[0].match(/via\s+(\S+)/)?.[1] || '';
    const dev = defaultRoutes[0].match(/dev\s+(\S+)/)?.[1] || '';
    summary = `Default route via ${via} on ${dev}`;
  } else {
    summary = `Found ${results.length} routing table entries`;
  }
  
  return {
    summary,
    results
  };
}

function parseTcpdumpOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n').filter(line => line.trim());
  const packets: {timestamp: string; src?: string; dst?: string; proto?: string; flags?: string; size?: string}[] = [];
  
  const firstLine = lines[0];
  let networkInterface = '';
  if (firstLine.includes('listening on')) {
    networkInterface = firstLine.match(/listening on (\w+)/)?.[1] || '';
  }
  
  lines.slice(1).forEach(line => {
    if (!line.includes(':')) return;
    
    const timestampMatch = line.match(/^([\d\.:]+)/);
    if (!timestampMatch) return;
    
    const timestamp = timestampMatch[1];
    
    // Extract IP addresses
    const ipMatch = line.match(/IP\s+(\S+)\s+>\s+(\S+):/);
    const src = ipMatch?.[1];
    const dst = ipMatch?.[2];
    
    // Extract flags if present
    const flagsMatch = line.match(/Flags\s+\[(.*?)\]/);
    const flags = flagsMatch?.[1];
    
    // Extract protocol and length
    const tcpMatch = line.includes('tcp');
    const udpMatch = line.includes('udp');
    const icmpMatch = line.includes('ICMP');
    let proto = '';
    
    if (tcpMatch) proto = 'TCP';
    else if (udpMatch) proto = 'UDP';
    else if (icmpMatch) proto = 'ICMP';
    
    const lengthMatch = line.match(/length\s+(\d+)/);
    const size = lengthMatch?.[1];
    
    packets.push({
      timestamp,
      src,
      dst,
      proto,
      flags,
      size
    });
  });
  
  let summary = '';
  if (networkInterface && packets.length > 0) {
    summary = `Captured ${packets.length} packets on interface ${networkInterface}`;
  } else {
    summary = `Captured ${packets.length} network packets`;
  }
  
  return {
    summary,
    metadata: {
      'Interface': networkInterface,
      'Packet Count': packets.length.toString(),
    },
    results: packets
  };
}

function parseNslookupOutput(output: string): ParsedData {
  if (!output) return { summary: 'No output' };
  
  const lines = output.split('\n');
  const results: {name: string; type: string; value: string}[] = [];
  let server = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('Server:')) {
      server = line.split(':')[1]?.trim() || '';
    } else if (line.match(/^Name:\s+/)) {
      const name = line.split(':')[1]?.trim() || '';
      
      // Check if next line is Address
      if (i + 1 < lines.length && lines[i + 1].startsWith('Address:')) {
        const addr = lines[i + 1].split(':')[1]?.trim() || '';
        
        results.push({
          name: name,
          type: 'A',
          value: addr
        });
        
        i++; // Skip the next line since we processed it
      }
    } else if (line.includes('Addresses:')) {
      const name = line.split('for')[1]?.trim() || '';
      
      // Multiple addresses might follow
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && !lines[j].includes(':')) {
        results.push({
          name: name,
          type: 'A',
          value: lines[j].trim()
        });
        j++;
      }
      i = j - 1; // Skip the processed lines
    }
  }
  
  let target = results.length > 0 ? results[0].name : '';
  let summary = '';
  
  if (target) {
    summary = `Resolved ${target} to ${results.length} ${results.length === 1 ? 'address' : 'addresses'}`;
  } else {
    summary = 'DNS lookup completed';
  }
  
  return {
    summary,
    metadata: {
      'Server': server,
      'Target': target
    },
    results
  };
}
