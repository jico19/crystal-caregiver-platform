import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <main>
        <h1>This page could not load</h1>
        <a href="/">Reload the home page</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
