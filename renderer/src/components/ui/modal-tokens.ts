/**
 * Presets for UniversalModalContent (see universal-modal.tsx).
 * Width is expressed as min(viewport, cap); height is limited by MODAL_MAX_HEIGHT_CN on the shell.
 *
 * - sm / md / lg / xl: generic stepped widths for simple forms.
 * - editor: very wide (settings “tables”, wide edit surfaces).
 * - picker: very wide catalog surface (icon grid). Intended to use almost full viewport width; use a
 *   separate `Dialog` with `size="picker"` so edit forms stay on smaller presets.
 * - narrow: small side panels (e.g. focused tiny choice).
 * - fullscreen: full viewport (see MODAL_FULLSCREEN_CN).
 */
export type ModalSizePreset =
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'editor'
  | 'picker'
  | 'narrow'
  | 'fullscreen';

export const MODAL_MAX_HEIGHT_CN = 'max-h-[96svh] sm:max-h-[92svh]';

export const MODAL_SIZE_PRESET_CN: Record<Exclude<ModalSizePreset, 'fullscreen'>, string> = {
  sm: 'w-[min(100vw-1rem,28rem)] max-w-[28rem]',
  md: 'w-[min(100vw-1rem,34rem)] max-w-[34rem]',
  lg: 'w-[min(100vw-1rem,44rem)] max-w-[44rem]',
  xl: 'w-[min(100vw-1rem,56rem)] max-w-[56rem]',
  editor: 'w-[min(100vw-1rem,86rem)] max-w-[86rem]',
  picker: 'w-[min(100vw-2rem,min(96vw,90rem))] max-w-[min(100vw-2rem,min(96vw,90rem))]',
  narrow: 'w-[min(100vw-1rem,26rem)] max-w-[26rem]',
};

export const MODAL_FULLSCREEN_CN =
  'top-0 right-0 bottom-0 left-0 h-svh w-screen max-h-none max-w-none translate-x-0 translate-y-0 rounded-none border-0 ring-0 sm:max-w-none data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100';

export const MODAL_SHELL_BASE_CN =
  'flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-border/60 bg-background p-0 shadow-xl sm:rounded-xl';
