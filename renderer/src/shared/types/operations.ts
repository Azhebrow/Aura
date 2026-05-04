/**
 * operations.ts — Universal types for async data lifecycle and mutations.
 * Every component that loads or saves data uses these types.
 */

// ─── Data lifecycle ───────────────────────────────────────────────────────────
/** The possible states of any async data source. */
export type DataStatus = 'loading' | 'refreshing' | 'ready' | 'empty' | 'error';

/** Return value of useAsyncData<T> — covers all lifecycle states in one object. */
export type DataState<T> = {
  data:    T;
  status:  DataStatus;
  error?:  string;
  reload:  (options?: { silent?: boolean }) => void;
};

// ─── Mutation lifecycle ───────────────────────────────────────────────────────
/** Return value of useFormMutation — covers submitting/error/success. */
export type MutationState = {
  submitting: boolean;
  error:      string | null;
  success:    boolean;
};

// ─── Result type ─────────────────────────────────────────────────────────────
/** Typed result for operations that can succeed or fail. */
export type AsyncResult<T> =
  | { ok: true;  value: T }
  | { ok: false; error: string };
