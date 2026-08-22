export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer:
    | ReturnType<
        typeof setTimeout
      >
    | undefined;

  const timeout =
    new Promise<never>(
      (_, reject) => {
        timer =
          setTimeout(
            () => {
              reject(
                new Error(
                  message
                )
              );
            },
            timeoutMs
          );
      }
    );

  try {
    return await Promise.race([
      promise,
      timeout,
    ]);
  } finally {
    if (timer) {
      clearTimeout(
        timer
      );
    }
  }
}