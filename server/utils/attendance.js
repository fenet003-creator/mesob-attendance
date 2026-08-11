const LATE_THRESHOLD = { hour: 8, minute: 15 };
const ABSENT_THRESHOLD = { hour: 8, minute: 30 };

function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Determine attendance status based on check-in time and configurable thresholds.
 * @param {string} checkInTime  - HH:MM or HH:MM:SS string
 * @param {string} [lateThreshold='08:15']   - time boundary for "present" vs "late"
 * @param {string} [absentThreshold='08:30'] - time boundary for "late" vs "absent"
 */
function determineStatus(checkInTime, lateThreshold, absentThreshold) {
  const minutes = parseTimeToMinutes(checkInTime);

  const lateStr = lateThreshold || `${String(LATE_THRESHOLD.hour).padStart(2, '0')}:${String(LATE_THRESHOLD.minute).padStart(2, '0')}`;
  const absentStr = absentThreshold || `${String(ABSENT_THRESHOLD.hour).padStart(2, '0')}:${String(ABSENT_THRESHOLD.minute).padStart(2, '0')}`;

  const lateMinutes = parseTimeToMinutes(lateStr);
  const absentMinutes = parseTimeToMinutes(absentStr);

  if (minutes < lateMinutes) return 'present';
  if (minutes <= absentMinutes) return 'late';
  return 'absent';
}

module.exports = {
  LATE_THRESHOLD,
  ABSENT_THRESHOLD,
  parseTimeToMinutes,
  getCurrentTimeString,
  getTodayDateString,
  determineStatus,
};
