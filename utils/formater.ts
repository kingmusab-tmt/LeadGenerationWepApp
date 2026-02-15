/**
 * Utility functions for formatting various data types
 */

/**
 * Formats a date string or Date object into a readable format
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  if (!date) return "N/A";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date provided to formatDate:", date);
    return "Invalid Date";
  }

  return new Intl.DateTimeFormat("en-US", options).format(dateObj);
}

/**
 * Formats a number as currency
 * @param amount - The amount to format
 * @param currency - ISO currency code (default: 'USD')
 * @param locale - BCP 47 language tag (default: 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  if (amount === null || amount === undefined) return "$0.00";

  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    console.error("Invalid amount provided to formatCurrency:", amount);
    return "$0.00";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount);
}

/**
 * Formats a number with commas and optional decimals
 * @param num - The number to format
 * @param decimalPlaces - Number of decimal places to show
 * @returns Formatted number string
 */
export function formatNumber(
  num: number | string,
  decimalPlaces: number = 2,
): string {
  if (num === null || num === undefined) return "0";

  const number = typeof num === "string" ? parseFloat(num) : num;

  if (isNaN(number)) {
    console.error("Invalid number provided to formatNumber:", num);
    return "0";
  }

  return number.toLocaleString("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
}

/**
 * Shortens long strings and adds ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (!str) return "";
  return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
}

/**
 * Formats bytes to human-readable size
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 * @returns Formatted size string (e.g., "1.23 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Capitalizes the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * @param phoneNumber - The phone number string
 * @returns Formatted phone number
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Check if the number looks like a US phone number
  const match = cleaned?.match(/^(\d{3})(\d{3})(\d{4})$/);

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }

  // Return original if formatting doesn't apply
  return phoneNumber;
}

/**
 * Formats a duration in milliseconds to HH:MM:SS format
 * @param ms - Duration in milliseconds
 * @returns Formatted time string
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = -ms;
  const time = {
    hours: Math.floor(ms / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor(((ms % 3600000) % 60000) / 1000),
  };

  return (
    Object.entries(time)
      .filter(([_, val]) => val !== 0)
      .map(([key, val]) => `${val}`.padStart(2, "0"))
      .join(":")
      .replace(/^0+/, "") || "0"
  );
}

/**
 * Converts a string to a URL-friendly slug
 * @param str - The string to convert
 * @returns URL-friendly slug
 */
export function toSlug(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens from start/end
}
