
import { Timestamp } from "firebase/firestore";

export const formatFirestoreTimestamp = (timestamp: any, docId?: string, defaultDateOption: 'epoch' | 'now' = 'epoch'): string => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    try {
      const dateFromObject = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
      return dateFromObject.toISOString();
    } catch (e) {
      // Fall through
    }
  }

  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  const defaultDate = defaultDateOption === 'epoch' ? new Date(0) : new Date();
  // console.warn(`Invalid timestamp for doc ${docId || 'unknown'}:`, timestamp, `Returning default: ${defaultDate.toISOString()}`);
  return defaultDate.toISOString();
};
