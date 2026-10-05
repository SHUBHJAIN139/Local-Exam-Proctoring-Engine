/**
 * Deterministic Trust Score Engine (Industrial Proctoring Edition)
 * Calibrated with exact mathematical vision thresholds and active browser guards.
 */

export const PENALTY_RULES = {
  // Critical
  UNAUTHORIZED_MATERIAL_DETECTED: {
    points: 25,
    severity: 'critical',
    label: 'Unauthorized Material / Device Detected',
    shortCode: 'Material Flag: -25',
    description: 'Cell phone, unauthorized book, or second laptop detected in camera frame.'
  },
  MULTIPLE_PERSONS_DETECTED: {
    points: 20,
    severity: 'critical',
    label: 'Multiple Persons Detected',
    shortCode: 'Multi-Person: -20',
    description: 'Secondary person detected in close proximity (>20% candidate face width).'
  },
  FULLSCREEN_EXIT: {
    points: 15,
    severity: 'critical',
    label: 'Fullscreen Lockdown Exited',
    shortCode: 'Lockdown Exit: -15',
    description: 'Candidate exited dedicated institutional examination full screen mode.'
  },
  UNAUTHORIZED_PAPER_OR_DOCUMENT: {
    points: 15,
    severity: 'warning',
    label: 'Unauthorized Handheld Paper / Notes Detected',
    shortCode: 'Paper Flag: -15',
    description: 'High-contrast printed paper or notes held up in candidate workspace.'
  },

  // Warnings
  TAB_SWITCH: {
    points: 10,
    severity: 'warning',
    label: 'Tab Switch Detected',
    shortCode: 'Tab Switch: -10',
    description: 'Assessment tab lost visibility. Candidate navigated away from exam terminal.'
  },
  CLIPBOARD_PASTE: {
    points: 10,
    severity: 'warning',
    label: 'Clipboard Paste Prohibited',
    shortCode: 'Paste Intercept: -10',
    description: 'Unauthorized clipboard paste attempted in examination response field.'
  },
  WINDOW_BLUR: {
    points: 5,
    severity: 'warning',
    label: 'Window Focus Lost',
    shortCode: 'Window Blur: -5',
    description: 'Browser application window lost focus to a desktop utility or background window.'
  },
  HEAD_POSE_PITCH_VIOLATION: {
    points: 5,
    severity: 'warning',
    label: 'Head Pose Pitch Violation (Lap Cheating)',
    shortCode: 'Pitch Alert: -5',
    description: 'Head tilted downward toward lap or upward away from viewport (Pitch > 0.75 or < 0.25).'
  },
  PROLONGED_EYES_CLOSED: {
    points: 5,
    severity: 'warning',
    label: 'Prolonged Eyes Closed (>2.0s)',
    shortCode: 'Eyes Closed: -5',
    description: 'Both eyes closed with Eye Aspect Ratio (EAR < 0.18) sustained for greater than 2 seconds.'
  },
  GAZE_DEVIATION_HORIZONTAL: {
    points: 3,
    severity: 'warning',
    label: 'Horizontal Gaze Deviation (Yaw)',
    shortCode: 'Yaw Alert: -3',
    description: 'Head yaw rotated left or right away from viewport (Yaw < 0.35 or > 0.65).'
  },

  // Minor
  CLIPBOARD_COPY: {
    points: 2,
    severity: 'info',
    label: 'Clipboard Copy Prohibited',
    shortCode: 'Copy Event: -2',
    description: 'Candidate attempted to copy assessment question text.'
  },
  CONTEXT_MENU: {
    points: 2,
    severity: 'info',
    label: 'Context Menu Invoked',
    shortCode: 'Menu Event: -2',
    description: 'Right-click context menu opened during active assessment.'
  }
};

export const INITIAL_SCORE = 100;
export const AUDIT_THRESHOLD = 40;

export function getPenaltyDetails(eventType) {
  return PENALTY_RULES[eventType] || {
    points: 0,
    severity: 'info',
    label: eventType,
    shortCode: eventType,
    description: 'System event logged to cryptographic ledger.'
  };
}

export function calculateTrustScore(chain) {
  let score = INITIAL_SCORE;
  if (!Array.isArray(chain)) return score;

  for (const block of chain) {
    if (PENALTY_RULES[block.event]) {
      score -= PENALTY_RULES[block.event].points;
    }
  }

  return Math.max(0, score);
}

export function getScoreStatus(score) {
  if (score >= 80) {
    return {
      status: 'high',
      color: 'emerald',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      badge: 'Verified Integrity'
    };
  }
  if (score >= 50) {
    return {
      status: 'moderate',
      color: 'amber',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      badge: 'Review Flags'
    };
  }
  return {
    status: 'low',
    color: 'red',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badge: 'Flagged for Human Proctor Review'
  };
}
