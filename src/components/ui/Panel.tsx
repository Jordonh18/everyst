import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  expanded?: boolean;
  defaultExpanded?: boolean;
  onToggleExpand?: (isExpanded: boolean) => void;
  actions?: React.ReactNode;
  description?: string;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className = '',
  expanded: controlledExpanded,
  defaultExpanded = true,
  onToggleExpand,
  actions,
  description,
}) => {
  // Support both controlled and uncontrolled usage
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  const handleToggleExpand = () => {
    const newExpandedState = !isExpanded;
    
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpandedState);
    }
    
    if (onToggleExpand) {
      onToggleExpand(newExpandedState);
    }
  };

  return (
    <div className={`panel text-foreground ${className}`}>
      {/* Panel header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <button
                onClick={handleToggleExpand}
                className="ml-2 p-1 hover:bg-primary/15 text-foreground hover:text-primary rounded-full transition-colors duration-200"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
              >
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Panel content */}
      <div
        className={`transition-all duration-300 ${
          !isExpanded ? 'h-0 overflow-hidden opacity-0' : 'opacity-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
};