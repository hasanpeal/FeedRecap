// Shared by the admin analytics routes: turns a `period` query param
// ("1d" | "3d" | "7d" | "30d" | "6m" | "1y") into the cutoff Date to filter
// records from. Defaults to 7 days back for any unrecognized value.
export function getStartDateForPeriod(period: unknown): Date {
  const startDate = new Date();
  switch (period) {
    case "1d":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "3d":
      startDate.setDate(startDate.getDate() - 3);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "6m":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "1y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }
  return startDate;
}
