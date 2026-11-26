/**
 * Date Utility for THYO SOFTECH HRMS
 * Ensures calendar dates (such as Holidays, Leaves, WFH, etc.) are handled consistently
 * without timezone drift or Prisma DateTime incompatibilities.
 */

/**
 * Normalizes any incoming calendar date into a canonical UTC midnight Date object,
 * avoiding India Standard Time (+05:30) or other timezone shifts.
 * 
 * Handles:
 * - YYYY-MM-DD strings (e.g. "2026-02-12", "2026-10-07")
 * - DD-MM-YYYY strings (e.g. "12-02-2026", "07-10-2026")
 * - DD/MM/YYYY strings (e.g. "12/02/2026", "07/10/2026")
 * - ISO strings with time/offset (e.g. "2026-02-11T18:30:00.000Z" -> Feb 12 in IST)
 * - JavaScript Date objects
 * - 5-digit year accidental typos (e.g. "20026" or "+020026" -> 2026)
 * 
 * @param {string|Date} input 
 * @returns {{ date: Date, year: number, month: number, dayOfMonth: number, dayOfWeek: string, formatted: string, formattedDDMMYYYY: string }}
 */
function normalizeCalendarDate(input) {
  if (!input) {
    const error = new Error('Date is required');
    error.statusCode = 400;
    throw error;
  }

  let str = input instanceof Date ? input.toISOString() : String(input).trim();

  let year, month, day;

  // 1. Check DD-MM-YYYY or DD/MM/YYYY format
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    // 2. Check if string has time part (ISO string like T18:30:00.000Z or T00:00:00)
    if (str.includes('T')) {
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        // In IST (UTC+5:30), 18:30 UTC of previous day is 00:00 IST of intended calendar date
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(parsed.getTime() + istOffsetMs);
        year = istDate.getUTCFullYear();
        month = istDate.getUTCMonth() + 1;
        day = istDate.getUTCDate();
      }
    }

    if (!year) {
      // Clean string for YYYY-MM-DD match
      let cleanStr = str;
      if (cleanStr.startsWith('+0')) {
        cleanStr = cleanStr.replace(/^\+0+/, '');
      }
      const ymdMatch = cleanStr.match(/^(\d{4,5})[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymdMatch) {
        year = parseInt(ymdMatch[1], 10);
        month = parseInt(ymdMatch[2], 10);
        day = parseInt(ymdMatch[3], 10);
      } else {
        const parsed = new Date(cleanStr);
        if (isNaN(parsed.getTime())) {
          const error = new Error('Invalid date format provided');
          error.statusCode = 400;
          throw error;
        }
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(parsed.getTime() + istOffsetMs);
        year = istDate.getUTCFullYear();
        month = istDate.getUTCMonth() + 1;
        day = istDate.getUTCDate();
      }
    }
  }

  // Sanitize 5-digit year typo e.g. 20026 -> 2026
  if (year >= 20000 && year < 21000) {
    year = 2000 + (year % 100);
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    const error = new Error('Date is out of valid calendar range (1900-2100)');
    error.statusCode = 400;
    throw error;
  }

  // Canonical UTC midnight Date object for Prisma
  const canonicalDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Verify calendar validity (e.g. rejecting 31 Feb)
  if (
    canonicalDate.getUTCFullYear() !== year ||
    canonicalDate.getUTCMonth() + 1 !== month ||
    canonicalDate.getUTCDate() !== day
  ) {
    const error = new Error(`Invalid calendar date: day ${day} does not exist in month ${month}/${year}`);
    error.statusCode = 400;
    throw error;
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[canonicalDate.getUTCDay()];
  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const formattedDDMMYYYY = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

  return {
    date: canonicalDate,
    year,
    month,
    dayOfMonth: day,
    dayOfWeek,
    formatted,
    formattedDDMMYYYY
  };
}

/**
 * Compares two calendar dates (date1 vs date2).
 * Returns:
 *  -1 if date1 < date2
 *   0 if date1 === date2
 *   1 if date1 > date2
 */
function compareCalendarDates(date1, date2) {
  const n1 = normalizeCalendarDate(date1);
  const n2 = normalizeCalendarDate(date2);
  const t1 = n1.date.getTime();
  const t2 = n2.date.getTime();
  if (t1 < t2) return -1;
  if (t1 > t2) return 1;
  return 0;
}

/**
 * Calculates calendar day count between start and end date (inclusive).
 * Throws 400 if startDate > endDate.
 * 
 * Example:
 * 07-10-2026 to 07-10-2026 => 1 day
 * 07-10-2026 to 09-10-2026 => 3 days
 */
function calculateCalendarDays(startDate, endDate) {
  const n1 = normalizeCalendarDate(startDate);
  const n2 = normalizeCalendarDate(endDate);

  if (n1.date.getTime() > n2.date.getTime()) {
    const error = new Error('Start date cannot be after end date.');
    error.statusCode = 400;
    throw error;
  }

  const diffMs = n2.date.getTime() - n1.date.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Formats a calendar date for consistent output without timezone drift.
 * Supported formats: 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'
 */
function formatCalendarDate(input, format = 'YYYY-MM-DD') {
  if (!input) return '';
  const n = normalizeCalendarDate(input);
  if (format === 'DD-MM-YYYY') {
    return n.formattedDDMMYYYY;
  }
  if (format === 'DD/MM/YYYY') {
    return `${String(n.dayOfMonth).padStart(2, '0')}/${String(n.month).padStart(2, '0')}/${n.year}`;
  }
  return n.formatted;
}

module.exports = {
  normalizeCalendarDate,
  compareCalendarDates,
  calculateCalendarDays,
  formatCalendarDate
};
