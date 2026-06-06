export function useLocalStorage() {
  const getItem = <T,>(key: string): T | null => {
    try {
      if (typeof window === 'undefined') return null;
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch (error) {
      console.error(`Failed to read localStorage key "${key}":`, error);
      return null;
    }
  };

  const setItem = <T,>(key: string, value: T): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (error instanceof DOMException && error.code === 22) {
        console.warn(`localStorage quota exceeded for key "${key}"`);
      } else {
        console.error(`Failed to write localStorage key "${key}":`, error);
      }
    }
  };

  const removeItem = (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove localStorage key "${key}":`, error);
    }
  };

  return { getItem, setItem, removeItem };
}
