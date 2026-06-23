import { Component, type ReactNode, type ErrorInfo } from "react";
import { ThermometerSnowflake, RotateCcw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Root-level error boundary — wraps the entire app tree including ClerkProvider.
 *
 * Without this, any unhandled React render exception (Clerk SDK throws on a bad
 * proxy response, a Capacitor plugin bridge error propagates into JSX, etc.)
 * produces a permanently white screen with zero user feedback or recovery path.
 *
 * With this boundary, the user always sees an actionable reload prompt instead.
 */
export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[UnitDown] Root render error caught by boundary:", error.message, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <ThermometerSnowflake className="w-7 h-7 text-white" />
          </div>

          <div className="text-center space-y-2 max-w-xs">
            <div className="flex items-center justify-center gap-2 text-amber-600 mb-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">Something went wrong</p>
            </div>
            <p className="text-sm text-slate-600 leading-snug">
              UnitDown AI couldn't start. This may be a network or configuration issue.
            </p>
            <p className="text-xs text-slate-400">
              Make sure you have an internet connection, then reload the app.
            </p>
          </div>

          <button
            onClick={this.handleReload}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-md"
          >
            <RotateCcw className="w-4 h-4" />
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
