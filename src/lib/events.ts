/** Custom window events used to decouple command-palette actions from panels. */
export const UI_EVENTS = {
  refreshGithub: "tabbie:ui-refresh-github",
} as const;

export function emitUiEvent(name: string): void {
  window.dispatchEvent(new CustomEvent(name));
}
