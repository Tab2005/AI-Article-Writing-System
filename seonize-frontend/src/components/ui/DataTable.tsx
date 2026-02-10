import React, { useState, useMemo } from 'react';
import './DataTable.css';

interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
}

type SortOrder = 'asc' | 'desc' | null;

interface SortConfig {
    key: string;
    order: SortOrder;
}

export function DataTable<T extends object>({
    columns,
    data,
    loading = false,
    onRowClick,
    emptyMessage = '目前沒有資料',
}: DataTableProps<T>) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', order: null });

    const getValue = (row: T, key: string): any => {
        const keys = key.split('.');
        let value: any = row;
        for (const k of keys) {
            value = (value as Record<string, unknown>)?.[k];
        }
        return value;
    };

    const handleSort = (key: string) => {
        let order: SortOrder = 'asc';
        if (sortConfig.key === key && sortConfig.order === 'asc') {
            order = 'desc';
        } else if (sortConfig.key === key && sortConfig.order === 'desc') {
            order = null;
        }
        setSortConfig({ key, order });
    };

    const sortedData = useMemo(() => {
        if (!sortConfig.key || !sortConfig.order) {
            return data;
        }

        return [...data].sort((a, b) => {
            const aValue = getValue(a, sortConfig.key);
            const bValue = getValue(b, sortConfig.key);

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.order === 'asc' ? aValue - bValue : bValue - aValue;
            }

            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();

            return sortConfig.order === 'asc'
                ? aStr.localeCompare(bStr)
                : bStr.localeCompare(aStr);
        });
    }, [data, sortConfig]);

    return (
        <div className="data-table-container">
            <table className="data-table">
                <thead className="data-table__head">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className={`data-table__th ${column.sortable ? 'data-table__th--sortable' : ''}`}
                                style={{ width: column.width }}
                                onClick={() => column.sortable && handleSort(String(column.key))}
                            >
                                <div className="data-table__header-content">
                                    {column.header}
                                    {column.sortable && (
                                        <span className={`data-table__sort-icon ${sortConfig.key === column.key ? `data-table__sort-icon--${sortConfig.order}` : ''}`}>
                                            {sortConfig.key === column.key && sortConfig.order === 'asc' ? ' ↑' :
                                                sortConfig.key === column.key && sortConfig.order === 'desc' ? ' ↓' : ' ↕'}
                                        </span>
                                    )}
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="data-table__body">
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length} className="data-table__loading">
                                <div className="data-table__spinner" />
                                <span>載入中...</span>
                            </td>
                        </tr>
                    ) : sortedData.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="data-table__empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        sortedData.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((column) => {
                                    const value = getValue(row, String(column.key));
                                    return (
                                        <td key={String(column.key)} className="data-table__td">
                                            {column.render ? column.render(value, row) : String(value ?? '-')}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
