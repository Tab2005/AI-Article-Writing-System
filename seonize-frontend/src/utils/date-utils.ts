/**
 * Unified Date and Time utilities for Seonize
 */

/**
 * Formats a Date object or ISO string into a localized date string.
 * @param date - Date object or ISO string
 * @param includeTime - Whether to include hours and minutes
 * @returns Formatted string (e.g., "2024/3/19" or "2024/3/19 17:02")
 */
export const formatDate = (date: Date | string | undefined | null, includeTime: boolean = false): string => {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    };

    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
    }

    return d.toLocaleDateString('zh-TW', options);
};

/**
 * Formats a date into a relative time (e.g., "3 hours ago")
 * Note: Keeping it simple for now as requested.
 */
export const formatRelativeTime = (date: Date | string | undefined | null): string => {
    return formatDate(date, true);
};
