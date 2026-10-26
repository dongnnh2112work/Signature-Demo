/** Repeat sends are allowed. No localStorage / cookie lock after a send. */
export const SIGN_REPEAT_SENDS = true;

export function signFormAfterSuccess() {
  return {
    message: "",
    alreadySigned: false,
    persistLock: false,
    status: "form" as const,
  };
}
