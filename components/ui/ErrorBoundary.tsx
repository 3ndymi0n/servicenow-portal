"use client";
import { Component, type ReactNode } from "react";

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
  label?:    string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label ?? "unknown"}]`, error, info);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-10 text-sm text-dark-dim gap-3 border border-danger/30 rounded-card bg-danger/5">
          <span className="text-2xl">⚠️</span>
          <p className="font-semibold text-danger">Something went wrong{this.props.label ? ` in ${this.props.label}` : ""}.</p>
          <p className="text-xs text-dark-dim max-w-md text-center">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-3 py-1.5 rounded border border-dark-border text-xs hover:border-dark-blue transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
