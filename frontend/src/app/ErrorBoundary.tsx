import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <main>
        <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
          This page could not load
        </h1>
        <a href="/">Reload the home page</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
