import "@testing-library/jest-dom";

// jsdom doesn't implement matchMedia; react-hot-toast's <Toaster /> (used on
// several pages) reads it on every render to check prefers-reduced-motion.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom doesn't implement ResizeObserver; recharts' <ResponsiveContainer />
// (used on admin/dashboard analytics pages) requires it to measure its
// container on mount.
if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error minimal test stub, not a full ResizeObserver
  window.ResizeObserver = ResizeObserverStub;
}
