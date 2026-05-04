import { useCallback, useState } from 'react';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import type { MutationState } from '@/shared/types/operations';

type Options = {
  onSuccess?: () => void;
  onError?:   (err: string) => void;
  /** runAuraMutation event type string. Default: 'generic' */
  eventType?: string;
};

/**
 * useFormMutation — THE single hook for all data writes in the app.
 *
 * Law 2: "One hook for writing." Every component that saves to the DB
 * must use this hook. No direct runAuraMutation() calls in components.
 *
 * @example
 * const { submit, submitting, error } = useFormMutation(
 *   (data: { id: string; completed: boolean }) =>
 *     db.saveRitualMorning(date, data.id, data.completed),
 *   { eventType: 'ritual', onSuccess: () => setOpen(false) }
 * );
 */
export function useFormMutation<TArgs>(
  mutate: (args: TArgs) => void,
  options: Options = {}
): MutationState & { submit: (args: TArgs) => void } {
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [success,    setSuccess]    = useState(false);

  const submit = useCallback(
    (args: TArgs) => {
      setSubmitting(true);
      setError(null);
      setSuccess(false);
      try {
        runAuraMutation(options.eventType ?? 'generic', () => mutate(args));
        setSuccess(true);
        options.onSuccess?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Mutation failed';
        setError(msg);
        options.onError?.(msg);
      } finally {
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate, options.eventType, options.onSuccess, options.onError]
  );

  return { submitting, error, success, submit };
}
