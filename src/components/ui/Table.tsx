import React from 'react';

export interface TableColumn {
  key: string;
  label: string;
  className?: string;
  width?: string;
}

export interface TableProps {
  columns: TableColumn[];
  children: React.ReactNode;
  className?: string;
}

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}

// Main Table Container
export const Table: React.FC<TableProps> = ({ columns, children, className = '' }) => {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[rgb(var(--color-border))] ${className}`}>
      <table className="w-full">
        <thead className="bg-[rgb(var(--color-card-header))] border-b border-[rgb(var(--color-border))]">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-[rgb(var(--color-text-secondary))] uppercase tracking-wider ${column.className || ''}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
};

// Table Header (for custom header implementations)
export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-[rgb(var(--color-card-header))] border-b border-[rgb(var(--color-border))] ${className}`}>
      {children}
    </thead>
  );
};

// Table Body
export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`bg-[rgb(var(--color-card))] divide-y divide-[rgb(var(--color-border))] ${className}`}>
      {children}
    </tbody>
  );
};

// Table Row
export const TableRow: React.FC<TableRowProps> = ({ children, className = '', onClick }) => {
  const baseClasses = onClick ? 'cursor-pointer hover:bg-[rgba(var(--color-bg),0.5)] transition-colors' : 'hover:bg-[rgba(var(--color-bg),0.5)]';
  
  return (
    <tr className={`${baseClasses} ${className}`} onClick={onClick}>
      {children}
    </tr>
  );
};

// Table Cell
export const TableCell: React.FC<TableCellProps> = ({ children, className = '', colSpan }) => {
  return (
    <td className={`px-4 py-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
};

// Standalone table component for simple use cases
export function SimpleTable<T>({
  columns,
  data,
  renderRow,
  loading = false,
  error = null,
  emptyState,
  loadingRows = 5,
  className = ''
}: {
  columns: TableColumn[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: string | null;
  emptyState?: React.ReactNode;
  loadingRows?: number;
  className?: string;
}) {
  return (
    <Table columns={columns} className={className}>
      <TableBody>
        {loading ? (
          // Loading state
          Array.from({ length: loadingRows }).map((_, index) => (
            <TableRow key={`loading-${index}`} className="animate-pulse">
              {columns.map((column) => (
                <TableCell key={column.key}>
                  <div className="h-4 bg-[rgb(var(--color-border))] rounded" style={{ width: '60%' }}></div>
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : error ? (
          // Error state
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-[rgb(var(--color-text-secondary))] py-6">
              <div className="flex flex-col items-center">
                <p className="text-[rgb(var(--color-error))] mb-2">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="text-[rgb(var(--color-primary))] hover:text-[rgb(var(--color-primary-hover))] text-sm"
                >
                  Try Again
                </button>
              </div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          // Empty state
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-[rgb(var(--color-text-secondary))] py-6">
              {emptyState || <p>No data available</p>}
            </TableCell>
          </TableRow>
        ) : (
          // Data rows
          data.map((item, index) => renderRow(item, index))
        )}
      </TableBody>
    </Table>
  );
}

export default Table;
