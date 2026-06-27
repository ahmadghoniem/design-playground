/**
 * Generation timeout timer.
 *
 * The route owns the running child process and log stream (module-scope
 * singletons that must persist across requests); this module just owns the
 * timing/force-stop logic, invoked via an injected callback so it stays a
 * pure-ish, testable Node module.
 */

export const GENERATION_TIMEOUT_MS = 10 * 60 * 1000;

let generationTimer: NodeJS.Timeout | null = null;

export function clearGenerationTimer(): void {
  if (generationTimer) {
    clearTimeout(generationTimer);
    generationTimer = null;
  }
}

/**
 * Start the generation timeout. `onTimeout` is invoked once the timeout
 * elapses; it is responsible for force-stopping the running process and
 * recording the timed-out state.
 */
export function startGenerationTimer(onTimeout: () => void): void {
  clearGenerationTimer();
  generationTimer = setTimeout(() => {
    onTimeout();
  }, GENERATION_TIMEOUT_MS);
}
