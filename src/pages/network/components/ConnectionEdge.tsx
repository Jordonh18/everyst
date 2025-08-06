import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { Wifi, Cable, Cast, Link as LinkIcon } from 'lucide-react';
import type { NetworkConnection } from '../../../types/network';

// Edge type icon mapping
const EdgeTypeIcon: React.FC<{ type?: string; size: number; className?: string }> = ({ type, size, className = '' }) => {
  switch (type) {
    case 'wireless':
      return <Wifi size={size} className={className} />;
    case 'wired':
      return <Cable size={size} className={className} />;
    case 'vpn':
      return <Cast size={size} className={className} />;
    default:
      return <LinkIcon size={size} className={className} />;
  }
};

export const ConnectionEdge: React.FC<EdgeProps<NetworkConnection>> = memo(({
  id,
  // Include source and target for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //source,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  markerEnd,
  data,
}) => {
  // Get path for edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Status colors based on connection status
  const getEdgeColors = () => {
    switch (data?.status) {
      case 'active':
        return {
          stroke: 'rgba(var(--color-success), 0.8)',
          text: 'text-[rgb(var(--color-success))]',
          bg: 'bg-[rgba(var(--color-success),0.1)]'
        };
      case 'warning':
        return {
          stroke: 'rgba(var(--color-warning), 0.8)',
          text: 'text-[rgb(var(--color-warning))]',
          bg: 'bg-[rgba(var(--color-warning),0.1)]'
        };
      case 'inactive':
      case 'error':
        return {
          stroke: 'rgba(var(--color-error), 0.6)',
          text: 'text-[rgb(var(--color-error))]',
          bg: 'bg-[rgba(var(--color-error),0.1)]'
        };
      default:
        return {
          stroke: 'rgba(var(--color-text-secondary), 0.5)',
          text: 'text-[rgb(var(--color-text-secondary))]',
          bg: 'bg-[rgba(var(--color-text-secondary),0.1)]'
        };
    }
  };

  const { stroke, text, bg } = getEdgeColors();

  // Determine edge style based on status
  const strokeWidth = selected ? 3 : 2;
  const strokeDasharray = data?.status === 'inactive' ? '5, 5' : '';
  // The 'animated' property is set in the parent component via the 'animated' prop
  // We're not using it directly in this component

  return (
    <>
      {/* Main edge path */}
      <path
        id={id}
        className={`react-flow__edge-path transition-all duration-300`}
        d={edgePath}
        strokeWidth={strokeWidth}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
      />

      {/* Show connection details if bandwidth or latency is available */}
      {(data?.bandwidth || data?.latency || data?.type) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              minWidth: '80px'
            }}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${bg} ${text} border border-[${stroke}]`}
          >
            <div className="flex items-center justify-center gap-1">
              {data?.type && <EdgeTypeIcon type={data.type} size={12} className={text} />}
              <span>
                {data?.bandwidth ? `${data.bandwidth} Mbps` : ''}
                {data?.bandwidth && data?.latency ? ' | ' : ''}
                {data?.latency ? `${data.latency} ms` : ''}
                {!data?.bandwidth && !data?.latency && data?.type ? data.type : ''}
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export default ConnectionEdge;
