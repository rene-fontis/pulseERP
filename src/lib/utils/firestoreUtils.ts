
import { Timestamp } from "firebase/firestore";

export const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'now'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      const dateFromObject = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
      // Check if the date is valid. Firestore Timestamps with seconds 0 and nanos 0 are often used as uninitialized markers by some libraries.
      // However, a valid epoch date (1970-01-01) is also seconds: 0, nanoseconds: 0.
      // For practical purposes in this app, if it's epoch and we expect a real date, default to 'now'.
      // But if defaultDateOption is 'epoch', we allow it.
      if (dateFromObject.getTime() === 0 && defaultDateOption === 'now' && timestamp.seconds === 0 && timestamp.nanoseconds === 0) {
        // Intentionally fall through to default if it's an uninitialized-like epoch and default is 'now'
      } else {
        return dateFromObject.toISOString();
      }
    } catch (e) {
      // Fall through if Timestamp constructor fails (should not happen with valid seconds/nanos)
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // Defaulting logic
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  // console.warn(`Invalid or missing timestamp for doc ${docId || 'unknown'}:`, timestamp, `Returning default: ${defaultDate.toISOString()}`);
  return defaultDate.toISOString();
};

