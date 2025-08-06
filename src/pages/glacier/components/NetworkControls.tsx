import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid, 
  Download, 
  Save,
  Settings,
  //Sliders,
  Layers,
  LayoutGrid,
  Circle,
  Hexagon,
  Square
} from 'lucide-react';
import { Card, Button } from '../../../components/ui';
import { useReactFlow } from 'reactflow';

interface NetworkControlsProps {
  className?: string;
}

export const NetworkControls: React.FC<NetworkControlsProps> = ({ className = '' }) => {
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string>('force');
  
  const reactFlowInstance = useReactFlow();
  
  // Zoom controls
  const zoomIn = () => {
    reactFlowInstance.zoomIn({ duration: 300 });
  };
  
  const zoomOut = () => {
    reactFlowInstance.zoomOut({ duration: 300 });
  };
  
  const fitView = () => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
  };
  
  // Export network as image
  const exportImage = () => {
    // ReactFlow has a toImage function but we need to handle it differently in a production app
    // For now, just a placeholder
    alert('Export image feature will be implemented in the next version.');
  };
  
  // Save network layout
  const saveLayout = () => {
    // In a real app, this would persist the layout to the backend
    alert('Save layout feature will be implemented in the next version.');
  };
  
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <Card className="p-2 overflow-visible">
        <div className="flex flex-col gap-2">
          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1"
          >
            <ZoomIn />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1"
          >
            <ZoomOut />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fitView}
            aria-label="Fit view"
            title="Fit view"
            className="p-1"
          >
            <Maximize2 />
          </Button>
          
          {/* Divider */}
          <div className="border-t border-[rgb(var(--color-border))] my-1"></div>
          
          {/* Layout options */}
          <div className="relative">
            <Button
              variant={showLayoutOptions ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowLayoutOptions(!showLayoutOptions)}
              aria-label="Layout options"
              title="Layout options"
              className="p-1"
            >
              <Layers />
            </Button>
            
            <AnimatePresence>
              {showLayoutOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-full top-0 mr-2 bg-[rgb(var(--color-card))] border border-[rgb(var(--color-border))] rounded-lg shadow-lg p-2 w-48 z-10"
                  style={{ transformOrigin: 'top right' }}
                >
                  <div className="text-xs font-medium text-[rgb(var(--color-text-secondary))] mb-2 px-2">
                    Layout Type
                  </div>
                  
                  <div className="space-y-1">
                    <button
                      className={`flex items-center w-full p-2 rounded-md transition-colors text-left ${
                        selectedLayout === 'force' 
                          ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' 
                          : 'hover:bg-[rgba(var(--color-card-muted),0.5)] text-[rgb(var(--color-text))]'
                      }`}
                      onClick={() => setSelectedLayout('force')}
                    >
                      <Circle size={16} className="mr-2" />
                      <span className="text-sm">Force Directed</span>
                    </button>
                    
                    <button
                      className={`flex items-center w-full p-2 rounded-md transition-colors text-left ${
                        selectedLayout === 'grid' 
                          ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' 
                          : 'hover:bg-[rgba(var(--color-card-muted),0.5)] text-[rgb(var(--color-text))]'
                      }`}
                      onClick={() => setSelectedLayout('grid')}
                    >
                      <LayoutGrid size={16} className="mr-2" />
                      <span className="text-sm">Grid</span>
                    </button>
                    
                    <button
                      className={`flex items-center w-full p-2 rounded-md transition-colors text-left ${
                        selectedLayout === 'radial' 
                          ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' 
                          : 'hover:bg-[rgba(var(--color-card-muted),0.5)] text-[rgb(var(--color-text))]'
                      }`}
                      onClick={() => setSelectedLayout('radial')}
                    >
                      <Hexagon size={16} className="mr-2" />
                      <span className="text-sm">Radial</span>
                    </button>
                    
                    <button
                      className={`flex items-center w-full p-2 rounded-md transition-colors text-left ${
                        selectedLayout === 'hierarchical' 
                          ? 'bg-[rgba(var(--color-primary),0.1)] text-[rgb(var(--color-primary))]' 
                          : 'hover:bg-[rgba(var(--color-card-muted),0.5)] text-[rgb(var(--color-text))]'
                      }`}
                      onClick={() => setSelectedLayout('hierarchical')}
                    >
                      <Square size={16} className="mr-2" />
                      <span className="text-sm">Hierarchical</span>
                    </button>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-[rgb(var(--color-border))]">
                    <Button
                      variant="default"
                      fullWidth
                      size="sm"
                      onClick={() => {
                        // Apply the layout - in a real app this would trigger a layout algorithm
                        setShowLayoutOptions(false);
                        // Mock layout change
                        setTimeout(() => {
                          fitView();
                        }, 100);
                      }}
                    >
                      Apply Layout
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}} // This would toggle the grid visibility in a real implementation
            aria-label="Toggle grid"
            title="Toggle grid"
            className="p-1"
          >
            <Grid />
          </Button>
          
          {/* Divider */}
          <div className="border-t border-[rgb(var(--color-border))] my-1"></div>
          
          {/* Export/Save options */}
          <Button
            variant="ghost"
            size="sm"
            onClick={exportImage}
            aria-label="Export as image"
            title="Export as image"
            className="p-1"
          >
            <Download />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={saveLayout}
            aria-label="Save layout"
            title="Save layout"
            className="p-1"
          >
            <Save />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}}
            aria-label="Settings"
            title="Settings"
            className="p-1"
          >
            <Settings />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NetworkControls;
