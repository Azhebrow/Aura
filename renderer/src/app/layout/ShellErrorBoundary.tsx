import { Component, type ErrorInfo, type ReactNode } from 'react';

type ShellErrorBoundaryProps = {
  children: ReactNode;
  label: string;
};

type ShellErrorBoundaryState = {
  error: Error | null;
};

export class ShellErrorBoundary extends Component<ShellErrorBoundaryProps, ShellErrorBoundaryState> {
  state: ShellErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ShellErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[AURA] ${this.props.label} crashed; rendering fallback.`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center border border-soft bg-background p-3 text-center text-xs font-medium text-muted-foreground">
        {this.props.label} временно недоступен.
      </div>
    );
  }
}
