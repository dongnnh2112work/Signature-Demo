export type KeyMomentPrompt = "activate" | "deactivate";
export type ConfirmFocus = "cancel" | "confirm";

/** Both edges need an explicit confirm. Accidental clicks must not toggle. */
export function keyMomentPrompt(active: boolean): KeyMomentPrompt {
  return active ? "deactivate" : "activate";
}

export function confirmDialogInitialFocus(prompt: KeyMomentPrompt): ConfirmFocus | undefined {
  return prompt === "deactivate" ? "cancel" : undefined;
}

export function canSubmitKeyMoment(busy: boolean) {
  return !busy;
}

export function nextKeyMomentState(prompt: KeyMomentPrompt) {
  return prompt === "activate";
}
