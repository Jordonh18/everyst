import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';
import { 
  RefreshCw, 
  Plus, 
  Filter, 
  Search,
  AlertTriangle,
  ZoomIn
} from 'lucide-react';
import { Card, IconButton, Badge, Button } from '../../components/ui';
import { useWebSocket } from '../../context/WebSocketContext';
import { socketService } from '../../utils/socket';
import type { NetworkDevice, NetworkConnection, NetworkTopology } from '../../types/network';
// Import components - adjust paths if necessary
import DeviceNode from './components/DeviceNode';
import ConnectionEdge from './components/ConnectionEdge';
import DeviceDetails from './components/DeviceDetails';
import AddDeviceModal from './components/AddDeviceModal';
import NetworkControls from './components/NetworkControls';
import EmptyScanState from './components/EmptyScanState';

import 'reactflow/dist/style.css';

// Inner component that uses React Flow hooks
const NetworkMapPageInner: React.FC = () => {
  // Memoize node and edge types to prevent recreation on render
  const nodeTypes = useMemo(() => ({
    deviceNode: DeviceNode
  }), []);

  const edgeTypes = useMemo(() => ({
    connectionEdge: ConnectionEdge
  }), []);

  // Memoize dagre graph instance to prevent recreation on every render
  const dagreGraph = useMemo(() => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });
    return graph;
  }, []);

  // Create a layout function to organize nodes (memoized to prevent recreation on each render)

  // States for nodes, edges, and UI
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState<boolean>(false);
  const [isScanInProgress, setIsScanInProgress] = useState<boolean>(false);
  const [lastScan, setLastScan] = useState<{timestamp: string, deviceCount: number} | null>(null);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [networkData, setNetworkData] = useState<NetworkTopology | null>(null);
  const [hasExistingScan, setHasExistingScan] = useState<boolean>(false);
  const [filtersActive, setFiltersActive] = useState<boolean>(false);
  const [deviceTypeFilters, setDeviceTypeFilters] = useState<Record<string, boolean>>({
    server: true,
    workstation: true,
    router: true,
    switch: true,
    firewall: true,
    other: true
  });
  
  const reactFlowInstance = useReactFlow();
  const layoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);
  
  // WebSocket connection state
  const { isConnected } = useWebSocket();

  // Define handlers first

  const handleRescanDevice = useCallback((deviceId: string) => {
    const socket = socketService.getSocket();
    if (!socket || !isConnected) {
      console.error('Socket not connected, cannot rescan device');
      setError('Socket connection required for device rescanning');
      return;
    }
    const device = networkData?.devices.find(d => d.id === deviceId);
    if (!device || !device.ip) {
      setError('Cannot rescan device without IP address');
      return;
    }
    const scanParams = { ip_range: device.ip, target_device_id: deviceId };
    socket.emit('start_network_scan', scanParams, (response: { status: string, message: string, scan_id?: string }) => {
      if (response.status === 'success') {
        console.log(`Device rescan started for ${deviceId} with scan ID: ${response.scan_id}`);
        setError(`Rescanning device ${device.label || device.hostname || device.ip}`);
        setTimeout(() => setError(null), 3000);
      } else {
        console.error('Failed to rescan device:', response.message);
        setError(`Failed to rescan device: ${response.message}`);
      }
    });
  }, [isConnected, networkData, setError]);

  const handleToggleDeviceStatus: (device: NetworkDevice) => Promise<void> = useCallback(async (device: NetworkDevice) => {
    // Use relative URL for API to leverage Vite's proxy
    const apiUrl = `/api/network/devices/${device.id}/set_status/`;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token available');
      setError('Authentication required');
      return;
    }
    const newStatus = device.status === 'online' ? 'offline' : 'online';
    try {
      setIsLoading(true);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error(`Failed to update device status: ${response.statusText}`);
      const updatedDevice = await response.json();
      if (networkData) {
        const updatedDevices = networkData.devices.map(d => d.id === updatedDevice.id ? updatedDevice : d);
        setNetworkData({ ...networkData, devices: updatedDevices });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating device status:', error);
      setError(`Failed to update device status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [networkData, setNetworkData, setError, setIsLoading]);

  const handleRemoveDevice: (deviceId: string) => Promise<void> = useCallback(async (deviceId: string) => {
    // Use relative URL for API to leverage Vite's proxy
    const apiUrl = `/api/network/devices/${deviceId}/`;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token available');
      setError('Authentication required');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`Failed to delete device: ${response.statusText}`);
      if (networkData) {
        const updatedData = {
          ...networkData,
          devices: networkData.devices.filter(d => d.id !== deviceId),
          connections: networkData.connections.filter(c => c.source !== deviceId && c.target !== deviceId)
        };
        setNetworkData(updatedData);
      }
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error removing device:', error);
      setError(`Failed to remove device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [networkData, selectedDeviceId, setNetworkData, setSelectedDeviceId, setError, setIsLoading]);

  // Memoize getLayoutedElements to prevent recreation on every render
  const getLayoutedElements = useMemo(() => {
    return (nodes: Node[], edges: Edge[], direction = 'TB') => {
      // Handle empty arrays case
      if (nodes.length === 0) {
        console.log('No nodes to layout, returning empty arrays');
        return { nodes: [], edges };
      }
  
      // Create a fresh layout if no nodes have positions
      const needsLayout = nodes.some((node) => !node.position || (node.position.x === 0 && node.position.y === 0));
      if (!needsLayout && nodes.length > 0) return { nodes, edges };
  
      try {
        // Clear previous layout
        dagreGraph.setGraph({ rankdir: direction, nodesep: 150, ranksep: 200 });
        
        // Clear nodes and edges
        const nodeIds = dagreGraph.nodes();
        nodeIds.forEach(id => dagreGraph.removeNode(id));
        
        // Add nodes to dagre
        nodes.forEach(node => {
          dagreGraph.setNode(node.id, { width: 180, height: 80 });
        });
        
        // Add edges to dagre
        edges.forEach(edge => {
          dagreGraph.setEdge(edge.source, edge.target);
        });
        
        // Calculate layout
        dagre.layout(dagreGraph);
        
        // Apply layout to nodes
        const layoutedNodes = nodes.map(node => {
          const nodeWithPosition = node;
          const dagreNode = dagreGraph.node(node.id);
          
          // Set position from dagre
          if (dagreNode) {
            nodeWithPosition.position = {
              x: dagreNode.x - (dagreNode.width / 2),
              y: dagreNode.y - (dagreNode.height / 2)
            };
          }
          
          return nodeWithPosition;
        });
        
        return { nodes: layoutedNodes, edges };
      } catch (error) {
        console.error('Error in getLayoutedElements:', error);
        // Return original nodes and edges if layout fails
        return { nodes, edges };
      }
    };
  }, [dagreGraph]);

  // transformNetworkToFlow definition
  const transformNetworkToFlow: (topology: NetworkTopology) => void = useCallback((topology: NetworkTopology) => {
    console.log('transformNetworkToFlow called with topology:', topology);
    const devices = topology?.devices || [];
    const connections = topology?.connections || [];
    console.log(`Found ${devices.length} devices and ${connections.length} connections`);

    try {
      const newNodes: Node[] = devices.map(device => ({
        id: device.id.toString(),
        type: 'deviceNode',
        data: { 
          ...device,
          onEdit: () => setSelectedDeviceId(device.id.toString()),
          onRescan: () => handleRescanDevice(device.id.toString()),
          onToggleStatus: () => handleToggleDeviceStatus(device),
          onRemove: () => handleRemoveDevice(device.id.toString())
        },
        position: { x: 0, y: 0 }
      }));

      const newEdges: Edge[] = connections.map(conn => ({
        id: `e-${conn.source}-${conn.target}`,
        source: conn.source.toString(),
        target: conn.target.toString(),
        type: 'connectionEdge',
        animated: conn.status === 'active',
        style: {
          stroke: conn.status === 'active' ? '#4CAF50' : '#aaa',
          strokeWidth: conn.bandwidth ? Math.max(1, conn.bandwidth / 100) : 2
        },
        data: { ...conn }
      }));
      
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setLastScan({ timestamp: new Date().toISOString(), deviceCount: devices.length });
      setHasExistingScan(devices.length > 0);
    } catch (err) {
      console.error('Error transforming network data:', err);
      setError('Failed to transform network data for visualization.');
    }
  }, [getLayoutedElements, setNodes, setEdges, setSelectedDeviceId, handleRescanDevice, handleToggleDeviceStatus, handleRemoveDevice, setLastScan, setHasExistingScan, setError]);
  
  // useEffect to call transformNetworkToFlow when networkData changes
  useEffect(() => {
    if (networkData) {
      transformNetworkToFlow(networkData);
    }
  }, [networkData, transformNetworkToFlow]);

  // Handle editing a device
  const handleEditDevice: (device: NetworkDevice) => Promise<void> = useCallback(async (device: NetworkDevice) => {
    // Use relative URL for API to leverage Vite's proxy
    const apiUrl = `/api/network/devices/${device.id}/`;
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token available');
      setError('Authentication required');
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(device)
      });
      if (!response.ok) throw new Error(`Failed to update device: ${response.statusText}`);
      const updatedDevice = await response.json();
      if (networkData) {
        const updatedDevices = networkData.devices.map(d => d.id === updatedDevice.id ? updatedDevice : d);
        setNetworkData({ ...networkData, devices: updatedDevices });
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Error updating device:', error);
      setError(`Failed to update device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  }, [networkData, setNetworkData, setError, setIsLoading]);
  
  // REMOVE OLD DEFINITION of transformNetworkToFlow if it was left from previous edits
  // The previous attempt moved it but might have left the old one commented out or active.
  // Ensure only the new useCallback version of transformNetworkToFlow exists.

  // Force layout recalculation to ensure dimensions are set
  useLayoutEffect(() => {
    if (flowContainerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        if (reactFlowInstance) {
          window.requestAnimationFrame(() => {
            reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false });
          });
        }
      });
      
      resizeObserver.observe(flowContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [reactFlowInstance]);
  
  // Filter nodes based on search query and device type filters
  const filteredNodes = nodes.filter(node => {
    if (!node.data) return false;
    
    const deviceData = node.data;
    const matchesSearch = searchQuery === '' || 
      (deviceData.label && deviceData.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deviceData.hostname && deviceData.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (deviceData.ip && deviceData.ip.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTypeFilter = deviceData.type ? deviceTypeFilters[deviceData.type] : true;
    
    return matchesSearch && matchesTypeFilter;
  });

  // Force fit view after initial render
  useEffect(() => {
    if (reactFlowInstance && !isLoading && filteredNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 250); // Delay slightly to ensure rendering completes
    }
  }, [reactFlowInstance, isLoading, filteredNodes.length]);

  // Initial data fetch - run only once on mount
  useEffect(() => {
    const fetchNetworkData = async () => {
      console.log('Starting initial data fetch');
      setIsLoading(true);
      setError(null);
      
      try {
        // Get API URL based on current host
        // Use relative URL for API to leverage Vite's proxy
        const apiUrl = `/api/network/topology/`;
        
        // Get the authorization token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.error('No access token available');
          setError('Authentication required');
          setIsLoading(false);
          return;
        }
        
        // Fetch network topology from API
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch network data: ${response.statusText}`);
        }
        
        const topology = await response.json();
        console.log('Network topology from API:', topology);
        
        if (topology.devices && topology.devices.length > 0) {
          setNetworkData(topology); // transformNetworkToFlow will be called by the useEffect
          setHasExistingScan(!!topology.lastScan);
          
          // Check for and handle active scans
          if (topology.activeScanInProgress && topology.lastScan) {
            // Check if the scan is stale
            if (topology.lastScan.isStale) {
              console.log('Stale scan detected on component mount');
              // Don't show progress for stale scans
              setIsScanInProgress(false);
              
              // Show a warning in the console about the stale scan
              console.warn('A previous network scan was interrupted. You may need to run a new scan.');
              // Update UI with error message
              setError('A previous network scan was interrupted. Please initiate a new scan.');
            } else {
              console.log('Active scan detected on component mount');
              setIsScanInProgress(true);
              setScanProgress(50); // Set to a reasonable mid-point as we don't know exact progress
            }
          }
          
          if (topology.lastScan) {
            setLastScan({
              timestamp: topology.lastScan.timestamp,
              deviceCount: topology.lastScan.discoveredDevices
            });
          }
        } else {
          const emptyState: NetworkTopology = { devices: [], connections: [], lastScan: undefined };
          setNetworkData(emptyState); // transformNetworkToFlow will be called by the useEffect
          setHasExistingScan(false);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to fetch network data:', err);
        setError('Failed to load network data. Please try again.');
        setIsLoading(false);
      }
    };
    
    // Run the data fetch only once when the component mounts
    fetchNetworkData();
    
  }, []); // Empty dependency array to run only on mount

  // Set up WebSocket listener for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Access the socket directly through socketService
    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket instance not available');
      return;
    }
    
    // Immediately check for active scans when socket is connected
    socket.emit('get_network_topology', {}, (response: NetworkTopology | {error: string}) => {
      if (response && !('error' in response)) {
        console.log('Checking for active scans on socket connection:', response);
        if (response.activeScanInProgress) {
          setIsScanInProgress(true);
          setScanProgress(50); // Set to a reasonable mid-point as we don't know exact progress
        }
      }
    });
    
    // Handler for network update events (individual updates)
    const handleNetworkUpdate = (data: {
      type: 'new_device' | 'device_status_change' | 'new_connection';
      payload?: unknown;
    }) => {
      if (!data) return;
      
      // Process network update data
      console.log('Network update received:', data);
      
      // Update UI if needed
      if (data.type === 'new_device' && data.payload) {
        // Add new device to visualization
        const device = data.payload as NetworkDevice;
        if (networkData) {
          const updatedData = {
            ...networkData,
            devices: [...networkData.devices.filter(d => d.id !== device.id), device]
          };
          setNetworkData(updatedData); // transformNetworkToFlow will be called by the useEffect
        }
      } else if (data.type === 'device_status_change' && data.payload) {
        // Update device status
        const updatedDevice = data.payload as NetworkDevice;
        if (networkData) {
          const updatedDevices = networkData.devices.map(device => 
            device.id === updatedDevice.id ? { ...device, ...updatedDevice } : device
          );
          const updatedData = {
            ...networkData,
            devices: updatedDevices
          };
          setNetworkData(updatedData); // transformNetworkToFlow will be called by the useEffect
        }
      } else if (data.type === 'new_connection' && data.payload) {
        // Add new connection to visualization
        const connection = data.payload as NetworkConnection;
        if (networkData) {
          const updatedData = {
            ...networkData,
            connections: [...networkData.connections.filter(c => c.id !== connection.id), connection]
          };
          setNetworkData(updatedData); // transformNetworkToFlow will be called by the useEffect
        }
      }
    };
    
    // Handler for complete topology updates
    const handleTopologyUpdate = (topology: NetworkTopology) => {
      console.log('Complete network topology update received:', topology);
      setNetworkData(topology); // transformNetworkToFlow will be called by the useEffect
      setHasExistingScan(!!topology.lastScan);
      
      // Update scan status if an active scan is reported in the topology
      if (topology.activeScanInProgress && topology.lastScan) {
        // Check if the scan is stale
        if (topology.lastScan.isStale) {
          console.log('Stale scan detected in topology update');
          // Don't show progress for stale scans
          setIsScanInProgress(false);
          
          // Show a warning in the console about the stale scan
          console.warn('A previous network scan was interrupted. You may need to run a new scan.');
          // We don't have direct access to notifications, so we'll just update the UI
          setError('A previous network scan was interrupted. Please initiate a new scan.');
        } else {
          console.log('Active scan detected in topology update');
          setIsScanInProgress(true);
          // Only reset progress if we don't already have one, to avoid jumping backward
          if (scanProgress === 0) {
            setScanProgress(50); // Set to a reasonable mid-point as we don't know exact progress
          }
        }
      } else if (!topology.activeScanInProgress) {
        // No active scan reported, make sure our state reflects that
        setIsScanInProgress(false);
      }
      
      if (topology.lastScan) {
        setLastScan({
          timestamp: topology.lastScan.timestamp,
          deviceCount: topology.lastScan.discoveredDevices
        });
      }
    };
    
    // Listen for scan progress updates
    const handleScanProgress = (data: {progress: number, scan_id: string, error?: string}) => {
      console.log('Scan progress update:', data);
      
      if (data.error) {
        // Handle scan error
        setIsScanInProgress(false);
        setError(`Network scan error: ${data.error}`);
        return;
      }
      
      setScanProgress(data.progress);
      
      // When scan completes, fetch the updated topology
      if (data.progress >= 100) {
        setIsScanInProgress(false);
        // Request the updated network topology
        socket.emit('get_network_topology', {}, (response: NetworkTopology | {error: string}) => {
          if (response && !('error' in response)) {
            console.log('Fetched updated topology after scan completion:', response);
            setNetworkData(response); // transformNetworkToFlow will be called by the useEffect
            setHasExistingScan(!!response.lastScan);
            
            if (response.lastScan) {
              setLastScan({
                timestamp: response.lastScan.timestamp,
                deviceCount: response.lastScan.discoveredDevices
              });
            }
          } else if ('error' in response) {
            console.error('Error fetching network topology after scan completion:', response.error);
          }
        });
      }
    };
    
    // Register event listeners
    socket.on('network_update', handleNetworkUpdate);
    socket.on('network_topology_update', handleTopologyUpdate);
    socket.on('scan_progress', handleScanProgress);
    
    // Clean up event listeners
    return () => {
      socket.off('network_update', handleNetworkUpdate);
      socket.off('network_topology_update', handleTopologyUpdate);
      socket.off('scan_progress', handleScanProgress);
    };
  }, [isConnected, networkData, scanProgress, setNetworkData, setHasExistingScan, setLastScan, setError, setIsScanInProgress, setScanProgress]); // Added scanProgress to dependencies

  // Handler for initiating a network scan
  const handleScan = useCallback(() => {
    // Immediately set scanning flags to prevent re-renders of EmptyScanState
    setIsScanInProgress(true);
    setScanProgress(0);
    
    // Access the socket directly through socketService
    const socket = socketService.getSocket();
    
    if (!socket || !isConnected) {
      console.error('Socket not connected, cannot start network scan');
      setError('Socket connection required for network scanning');
      setIsScanInProgress(false);
      return;
    }
    
    // Optional IP range parameter (could be added to UI later)
    const scanParams = {
      ip_range: null // Default to local subnet
    };
    
    // Send start scan command to socket server using the new refactored endpoint
    socket.emit('start_network_scan', scanParams, (response: { status: string, message: string, scan_id?: string, job_id?: string }) => {
      if (response.status === 'success') {
        console.log(`Network scan started with ID: ${response.scan_id}, job ID: ${response.job_id}`);
        // Progress will be tracked via the scan_progress socket events
      } else {
        console.error('Failed to start network scan:', response.message);
        setError(`Failed to start network scan: ${response.message}`);
        setIsScanInProgress(false);
      }
    });
    
  }, [isConnected]); // Include isConnected dependency

  // Handle node selection
  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    // Prevent any bubbling that might cause page reloads
    if (event.stopPropagation) {
      event.stopPropagation();
    }
    setSelectedDeviceId(node.id === selectedDeviceId ? null : node.id);
  };

  // Handle adding a new device
  const handleAddDevice = (device: NetworkDevice) => {
    // Set loading state (could add dedicated state for this in the future)
    setIsLoading(true);
    
    // Use relative URL for API to leverage Vite's proxy
    const apiUrl = `/api/network/devices/`;
    
    // Get the authorization token
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('No access token available');
      setError('Authentication required');
      setIsLoading(false);
      return;
    }
    
    // Create device data object for API
    const deviceData = {
      ...device,
      status: 'online',
      last_seen: new Date().toISOString()
      // Note: id will be generated by the server
    };
    
    // Call API to create device
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deviceData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to create device: ${response.statusText}`);
      }
      return response.json();
    })
    .then(createdDevice => {
      // Device was created successfully
      console.log('Device created:', createdDevice);
      
      // If we have the socket available, request updated topology
      const socket = socketService.getSocket();
      if (socket && isConnected) {
        socket.emit('get_network_topology', {}, (response: NetworkTopology | {error: string}) => {
          if (response && !('error' in response)) {
            // Update the network data with the full topology - transformNetworkToFlow will be called by useEffect
            setNetworkData(response);
          }
        });
      } else if (networkData) {
        // Fallback - update local state - transformNetworkToFlow will be called by useEffect
        const updatedData: NetworkTopology = {
          ...networkData,
          devices: [...networkData.devices, createdDevice]
        };
        setNetworkData(updatedData);
      }
      
      // Close modal and finish loading
      setShowAddDeviceModal(false);
      setIsLoading(false);
    })
    .catch(error => {
      console.error('Error adding device:', error);
      setError(`Failed to add device: ${error.message}`);
      setIsLoading(false);
    });
  };

  // (filteredNodes is now defined above)

  // Function to fit view to all nodes
  const fitView = useCallback(() => {
    if (reactFlowInstance && filteredNodes && filteredNodes.length > 0) {
      try {
        reactFlowInstance.fitView({ padding: 0.2, includeHiddenNodes: false });
      } catch (error) {
        console.error('Error fitting view:', error);
      }
    }
  }, [reactFlowInstance, filteredNodes]);
  
  // Fit view when nodes change
  useEffect(() => {
    if (filteredNodes && filteredNodes.length > 0 && !isLoading) {
      // Use timeout to allow for node rendering
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
      
      layoutTimeoutRef.current = setTimeout(() => {
        try {
          fitView();
        } catch (error) {
          console.error('Error in delayed fit view:', error);
        }
      }, 100);
    }
    
    return () => {
      if (layoutTimeoutRef.current) {
        clearTimeout(layoutTimeoutRef.current);
      }
    };
  }, [filteredNodes, isLoading, fitView]);

  // Empty state - no existing scan
  console.log('Render state:', {
    hasExistingScan, 
    isLoading, 
    isScanInProgress,
    nodeCount: filteredNodes?.length || 0
  });
  
  // Show empty state only when we're confident there's no data and we're not loading
  const shouldShowEmptyState = !isLoading && 
                               !isScanInProgress && 
                               hasExistingScan === false && 
                               (!networkData || networkData.devices.length === 0);
  
  if (shouldShowEmptyState) {
    console.log('Rendering EmptyScanState');
    return <EmptyScanState onScan={handleScan} />;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="w-full flex flex-col h-full space-y-4" style={{ height: '100%', minHeight: '100vh' }}>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-[rgb(var(--color-text))]">Network</h1>
          <p className="text-[rgb(var(--color-text-secondary))]">Real-time network visualization</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[rgb(var(--color-text-secondary))]" />
            <input
              type="text"
              placeholder="Search devices..."
              className="pl-9 pr-4 py-2 text-sm rounded-md bg-[rgb(var(--color-search-bg))] border border-[rgb(var(--color-border))] focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-primary))] w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <IconButton 
            icon={<Filter />} 
            variant={filtersActive ? "primary" : "outline"}
            tooltipText="Filter devices" 
            onClick={() => {
              const newState = !filtersActive;
              setFiltersActive(newState);
              if (!newState) {
                // Reset all filters to true when deactivating filters
                setDeviceTypeFilters({
                  server: true,
                  workstation: true,
                  router: true,
                  switch: true,
                  firewall: true,
                  other: true
                });
              }
            }}
          />
          <IconButton 
            icon={<RefreshCw />} 
            variant="outline" 
            tooltipText="Refresh map" 
            isLoading={isLoading}
            onClick={() => {
              if (!isLoading) {
                setIsLoading(true);
                setTimeout(() => {
                  if (networkData) {
                    // Force a re-render by creating a new reference
                    setNetworkData({...networkData});
                  }
                  setIsLoading(false);
                }, 500);
              }
            }}
          />
          {hasExistingScan && (
            <IconButton 
              icon={<ZoomIn />} 
              variant="outline" 
              tooltipText="Fit to view" 
              onClick={fitView}
            />
          )}
          <IconButton 
            icon={<Plus />} 
            variant="default" 
            tooltipText="Add device" 
            onClick={() => setShowAddDeviceModal(true)}
          />
        </div>
      </div>

      {/* Network status card */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge 
              variant={error ? 'destructive' : isConnected ? 'default' : 'secondary'}
            >
              {error ? 'Error' : isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            
            {lastScan && (
              <div className="text-sm text-[rgb(var(--color-text-secondary))]">
                Last scan: {new Date(lastScan.timestamp).toLocaleString()}
                <span className="mx-2">•</span>
                {lastScan.deviceCount} devices discovered
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleScan}
              disabled={isScanInProgress}
              variant="default"
              size="sm"
            >
              {isScanInProgress ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {isScanInProgress ? `Scanning... ${Math.round(scanProgress)}%` : (hasExistingScan ? 'Rescan Network' : 'Scan Network')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Main network visualization */}
      <div className="flex-1 relative flex" style={{ height: 'calc(100vh - 200px)', minHeight: '600px', width: '100%', overflow: 'hidden' }}>
        <Card className="flex-1 h-full w-full overflow-hidden p-0 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--color-primary))]"></div>
                <div className="mt-4 text-[rgb(var(--color-text-secondary))]">Loading network data...</div>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <AlertTriangle className="text-[rgb(var(--color-error))]" size={48} />
                <div className="mt-4 text-[rgb(var(--color-text))]">{error}</div>
                <Button 
                  variant="default"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div 
              ref={flowContainerRef}
              style={{ 
                width: '100%', 
                height: '100%', 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                minHeight: '500px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <ReactFlow
                nodes={filteredNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onConnect={(params) => console.log('Connection created', params)}
                onPaneClick={() => setSelectedDeviceId(null)}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                deleteKeyCode={null} // Disable delete key to prevent accidental deletion
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.2}
                maxZoom={4}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                style={{ width: '100%', height: '100%' }}
                className="bg-[rgb(var(--color-background))]"
                preventScrolling={true}
                elevateNodesOnSelect={true}
                proOptions={{ hideAttribution: true }}
              >
              <Background 
                color="rgb(var(--color-text-secondary))" 
                gap={24} 
                size={1.5}
                className="bg-opacity-30" 
              />
              <Controls 
                style={{
                  background: 'rgb(var(--color-card-bg))',
                  borderRadius: '8px',
                  border: '1px solid rgb(var(--color-border))',
                  padding: '4px'
                }}
              />
              <MiniMap 
                style={{
                  background: 'rgb(var(--color-card-bg))',
                  border: '1px solid rgb(var(--color-border))',
                  borderRadius: '8px'
                }}
                maskColor="rgba(var(--color-background), 0.6)"
              />
              
              <Panel 
                position="top-right" 
                className="bg-transparent" 
                style={{ zIndex: 5, marginTop: '10px', marginRight: '10px' }}
              >
                <NetworkControls />
              </Panel>
              
              {selectedDeviceId && (
                <Panel 
                  position="bottom-left" 
                  className="bg-transparent"
                  style={{ zIndex: 5, marginBottom: '10px', marginLeft: '10px' }}
                >
                  <DeviceDetails 
                    device={networkData?.devices.find(d => d.id === selectedDeviceId)} 
                    onClose={() => setSelectedDeviceId(null)}
                    onEdit={handleEditDevice}
                    onRescan={handleRescanDevice}
                    onToggleStatus={handleToggleDeviceStatus}
                    onRemove={handleRemoveDevice}
                  />
                </Panel>
              )}
              </ReactFlow>
            </div>
          )}
        </Card>
      </div>
      
      {/* Add Device Modal */}
      <AddDeviceModal 
        isOpen={showAddDeviceModal}
        onAdd={handleAddDevice} 
        onCancel={() => setShowAddDeviceModal(false)} 
      />
      </div>
    </div>
  );
};

// Export the component wrapped with ReactFlowProvider
export const NetworkMapPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NetworkMapPageInner />
    </ReactFlowProvider>
  );
};

export default NetworkMapPage;
