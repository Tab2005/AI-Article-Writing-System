import React from 'react';

export interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: React.ReactNode;
    loading?: boolean;
}

export interface DataTableColumn<T> {
    key: keyof T;
    header: string;
    width?: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    loading?: boolean;
    onRowClick?: (row: T) => void;
}
