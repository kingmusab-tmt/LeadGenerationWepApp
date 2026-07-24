// lib/formatUtils.ts
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDuration = (seconds: number | null) => {
  if (!seconds) return "N/A";
  // Round the total first, then derive minutes/seconds from that rounded
  // value — rounding each part independently (Math.floor for minutes,
  // Math.round for the remainder) can produce "Xm 60s" whenever the
  // remainder's fractional part is >= 59.5, since the minutes were already
  // floored before the remainder rolled over.
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}m ${secs}s`;
};
