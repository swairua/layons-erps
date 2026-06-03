/**
 * Formats a number to remove trailing zeros and unnecessary decimals
 * Examples: 10.00 → "10", 10.50 → "10.5", 1500.50 → "1500.5"
 */
export const formatNumberWithoutTrailingZeros = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '';

  // Convert to fixed 2 decimals, then remove trailing zeros
  const formatted = numValue.toFixed(2);
  return formatted.replace(/\.?0+$/, '');
};

/**
 * Formats a number for LCL amount displays.
 * If it's an integer (whole number), it displays without decimals (e.g., 7950).
 * If it has any non-zero decimal part, it keeps exactly 2 decimal places (e.g., 1500.50).
 */
export const formatLCLAmount = (value: number | string | undefined): string => {
  if (value === undefined || value === null || value === '') return '';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '';

  // If it's a whole number, show it without decimal points
  if (numValue % 1 === 0) {
    return numValue.toString();
  }

  // Otherwise, format with exactly 2 decimal places (e.g., 1500.50)
  return numValue.toFixed(2);
};
