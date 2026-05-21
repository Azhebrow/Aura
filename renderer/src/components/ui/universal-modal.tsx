import * as React from 'react';
import { DialogContent } from '@/components/ui/dialog';
import {
  MODAL_FULLSCREEN_CN,
  MODAL_MAX_HEIGHT_CN,
  MODAL_SHELL_BASE_CN,
  MODAL_SIZE_PRESET_CN,
  type ModalSizePreset,
} from '@/components/ui/modal-tokens';
import { cn } from '@/lib/utils';

type ModalPresentation = 'centered' | 'fullscreen';
type ModalScrollMode = 'content' | 'none';

type UniversalModalContentProps = React.ComponentProps<typeof DialogContent> & {
  size?: ModalSizePreset;
  presentation?: ModalPresentation;
  scroll?: ModalScrollMode;
};

export function UniversalModalContent({
  className,
  size = 'md',
  presentation = 'centered',
  scroll = 'content',
  ...props
}: UniversalModalContentProps) {
  const isFullscreen = presentation === 'fullscreen' || size === 'fullscreen';
  const sizeClass = size === 'fullscreen' ? '' : MODAL_SIZE_PRESET_CN[size];
  const mergedClassName = cn(
    MODAL_SHELL_BASE_CN,
    isFullscreen ? MODAL_FULLSCREEN_CN : `${MODAL_MAX_HEIGHT_CN} ${sizeClass}`,
    scroll === 'content' && 'overflow-hidden',
    className
  );
  return <DialogContent className={mergedClassName} {...props} />;
}

type UniversalModalLayoutProps = {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function UniversalModalLayout({
  header,
  children,
  footer,
  className,
  headerClassName,
  bodyClassName,
}: UniversalModalLayoutProps) {
  return (
    <div className={cn('flex min-h-0 w-full flex-1 flex-col overflow-hidden', className)}>
      {header ? <div className={cn('border-border/80 shrink-0 border-b px-3 py-2 sm:px-3.5 sm:py-2.5', headerClassName)}>{header}</div> : null}
      <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 sm:px-3.5 sm:py-2.5', bodyClassName)}>
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </div>
  );
}
