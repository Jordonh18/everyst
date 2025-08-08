import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedServerRack: React.FC<{ className?: string }> = ({ className = "h-16 w-16" }) => {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Server Rack Frame */}
      <rect 
        x="25" 
        y="10" 
        width="50" 
        height="80" 
        rx="4" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"
      />
      
      {/* Server Units */}
      {[0, 1, 2, 3].map((index) => (
        <g key={index}>
          <rect 
            x="28" 
            y={15 + index * 18} 
            width="44" 
            height="14" 
            rx="2" 
            fill="currentColor" 
            opacity="0.2"
          />
          {/* Power LEDs */}
          <motion.circle 
            cx="32" 
            cy={22 + index * 18} 
            r="1.5" 
            fill="currentColor"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ 
              duration: 2 + index * 0.5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.circle 
            cx="36" 
            cy={22 + index * 18} 
            r="1.5" 
            fill="currentColor"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ 
              duration: 1.5 + index * 0.3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          {/* Server Lines */}
          <rect 
            x="42" 
            y={19 + index * 18} 
            width="25" 
            height="1" 
            fill="currentColor" 
            opacity="0.4"
          />
          <rect 
            x="42" 
            y={21 + index * 18} 
            width="20" 
            height="1" 
            fill="currentColor" 
            opacity="0.4"
          />
          <rect 
            x="42" 
            y={23 + index * 18} 
            width="28" 
            height="1" 
            fill="currentColor" 
            opacity="0.4"
          />
        </g>
      ))}
    </motion.svg>
  );
};

export const AnimatedShield: React.FC<{ className?: string }> = ({ className = "h-16 w-16" }) => {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      {/* Shield Outline */}
      <motion.path
        d="M50 15 C35 15, 25 25, 25 40 C25 65, 50 85, 50 85 C50 85, 75 65, 75 40 C75 25, 65 15, 50 15 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
      
      {/* Shield Fill */}
      <motion.path
        d="M50 20 C38 20, 30 28, 30 40 C30 62, 50 78, 50 78 C50 78, 70 62, 70 40 C70 28, 62 20, 50 20 Z"
        fill="currentColor"
        opacity="0.1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
      />
      
      {/* Checkmark */}
      <motion.path
        d="M42 45 L47 50 L58 35"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 1, ease: "easeOut" }}
      />
      
      {/* Pulse Effect */}
      <motion.circle
        cx="50"
        cy="47"
        r="25"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
        opacity="0"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0, 0.3, 0]
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
    </motion.svg>
  );
};

export const AnimatedMonitor: React.FC<{ className?: string }> = ({ className = "h-16 w-16" }) => {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Monitor Frame */}
      <rect 
        x="20" 
        y="25" 
        width="60" 
        height="40" 
        rx="4" 
        stroke="currentColor" 
        strokeWidth="2" 
        fill="none"
      />
      
      {/* Screen */}
      <rect 
        x="23" 
        y="28" 
        width="54" 
        height="34" 
        rx="2" 
        fill="currentColor" 
        opacity="0.1"
      />
      
      {/* Monitor Stand */}
      <rect 
        x="47" 
        y="65" 
        width="6" 
        height="10" 
        fill="currentColor" 
        opacity="0.6"
      />
      <rect 
        x="40" 
        y="73" 
        width="20" 
        height="3" 
        rx="1.5" 
        fill="currentColor" 
        opacity="0.6"
      />
      
      {/* Chart Lines */}
      <motion.polyline
        points="28,50 35,45 42,52 49,40 56,48 63,35 70,42"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
      />
      
      {/* Data Points */}
      {[
        { x: 28, y: 50 },
        { x: 35, y: 45 },
        { x: 42, y: 52 },
        { x: 49, y: 40 },
        { x: 56, y: 48 },
        { x: 63, y: 35 },
        { x: 70, y: 42 }
      ].map((point, index) => (
        <motion.circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="2"
          fill="currentColor"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: 0.8 + index * 0.1, 
            ease: "easeOut" 
          }}
        />
      ))}
      
      {/* Status Indicators */}
      <motion.rect
        x="28"
        y="32"
        width="4"
        height="2"
        fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.rect
        x="34"
        y="32"
        width="4"
        height="2"
        fill="currentColor"
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.rect
        x="40"
        y="32"
        width="4"
        height="2"
        fill="currentColor"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

export const AnimatedNetwork: React.FC<{ className?: string }> = ({ className = "h-16 w-16" }) => {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Central Node */}
      <motion.circle
        cx="50"
        cy="50"
        r="8"
        fill="currentColor"
        opacity="0.2"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Outer Nodes */}
      {[
        { x: 30, y: 30, delay: 0 },
        { x: 70, y: 30, delay: 0.3 },
        { x: 80, y: 50, delay: 0.6 },
        { x: 70, y: 70, delay: 0.9 },
        { x: 30, y: 70, delay: 1.2 },
        { x: 20, y: 50, delay: 1.5 }
      ].map((node, index) => (
        <g key={index}>
          <motion.line
            x1="50"
            y1="50"
            x2={node.x}
            y2={node.y}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.3"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: node.delay, ease: "easeOut" }}
          />
          <motion.circle
            cx={node.x}
            cy={node.y}
            r="4"
            fill="currentColor"
            opacity="0.6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: node.delay + 0.5, ease: "easeOut" }}
          />
          {/* Data pulse */}
          <motion.circle
            cx="50"
            cy="50"
            r="2"
            fill="currentColor"
            animate={{
              cx: [50, node.x],
              cy: [50, node.y],
              opacity: [1, 0]
            }}
            transition={{
              duration: 2,
              delay: node.delay + 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: "linear"
            }}
          />
        </g>
      ))}
    </motion.svg>
  );
};
