export const formatDateHeader = (date: Date | null) => {
    if (!date) return 'Loading...';
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};