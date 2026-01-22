import React from 'react';
import './DataTable.css';

interface Column<T> {
    key: keyof T | string;
    header: string;
    width?: string;
    render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
}

export function DataTable<T extends object>({
    columns,
    data,
    loading = false,
    onRowClick,
    emptyMessage = '目前沒有資料',
}: DataTableProps<T>) {
    const getValue = (row: T, key: string): unknown => {
        const keys = key.split('.');
        let value: unknown = row;
        for (const k of keys) {
            value = (value as Record<string, unknown>)?.[k];
        }
        return value;
    };

    return (
        <div className="data-table-container">
            <table className="data-table">
                <thead className="data-table__head">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                className="data-table__th"
                                style={{ width: column.width }}
                            >
                                {column.header}
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
                    ) : data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="data-table__empty">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row, rowIndex) => (
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
