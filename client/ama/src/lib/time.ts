export type TimeUnit = "days" | "hours" | "minutes" | "seconds";

export type TimePart = { unit: TimeUnit; value: number };

export type FormattedTimeLeft = { expired: boolean; parts: TimePart[] };

export const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

export const formatTimeLeft = (ms: number): FormattedTimeLeft => {
  if (ms <= 0) return { expired: true, parts: [] };

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return {
      expired: false,
      parts: [
        { unit: "days", value: days },
        { unit: "hours", value: hours },
        { unit: "minutes", value: minutes },
      ],
    };
  }

  if (hours > 0) {
    return {
      expired: false,
      parts: [
        { unit: "hours", value: hours },
        { unit: "minutes", value: minutes },
        { unit: "seconds", value: seconds },
      ],
    };
  }

  return {
    expired: false,
    parts: [
      { unit: "minutes", value: minutes },
      { unit: "seconds", value: seconds },
    ],
  };
};
