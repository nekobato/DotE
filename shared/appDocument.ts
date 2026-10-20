/** Compare complete application documents while allowing hash-router navigation. */
export const isAppDocument = (value: string, expected: string): boolean => {
  try {
    const actualUrl = new URL(value);
    const expectedUrl = new URL(expected);
    actualUrl.hash = "";
    expectedUrl.hash = "";
    return actualUrl.href === expectedUrl.href;
  } catch {
    return false;
  }
};
