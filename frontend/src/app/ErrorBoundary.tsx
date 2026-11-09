import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <main id="main" tabIndex={-1} className="page-section mx-auto max-w-site">
        <h1 className="mb-6 font-serif text-display">This page could not load</h1>
        <a href="/">Reload the home page</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
