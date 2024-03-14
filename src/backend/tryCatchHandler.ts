const handleError = (e: unknown) => {
  let message = 'Unknown Error';
  if (e instanceof Error) {
    message = e.message;
  }
  console.error(message);
  return false;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tryCatch = <T, A extends any[]>(fn: (...args: A) => T) => {
  return (...args: A): T | false => {
    try {
      const returnValue = fn(...args);
      return returnValue;
    } catch (e) {
      handleError(e);
      return false;
    }
  };
};

export default tryCatch;
