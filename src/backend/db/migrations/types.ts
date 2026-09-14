export type Migration = {
  /** Unique, stable id used in logs. Once a migration ships, don't rename or reuse its id. */
  id: string;
  /** One-line description of what this migration does, for logs. */
  description: string;
  /**
   * Optional user-facing message. If set and this migration actually runs, it's shown as a toast
   * the next time the renderer is ready — a heads-up that something changed under the hood, and a
   * nudge to double-check it landed correctly. Omit for migrations with nothing worth surfacing.
   */
  userNotice?: string;
  /**
   * Runs the migration. Called unconditionally on every startup, so this must be idempotent —
   * check whether the migration is still needed and no-op if not. Return `true` if it changed
   * anything, `false` if it was a no-op. Throwing aborts startup, so only throw for something
   * genuinely unrecoverable.
   */
  run: () => boolean;
};
