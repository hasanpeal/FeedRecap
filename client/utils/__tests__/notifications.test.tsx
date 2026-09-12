import { renderHook, act } from "@testing-library/react";
import { useNotification } from "../notifications";

describe("useNotification", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts with no notification", () => {
    const { result } = renderHook(() => useNotification());
    expect(result.current.notification).toBeNull();
  });

  it("shows a notification with the given message and type", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("Saved!", "success");
    });

    expect(result.current.notification).toEqual({
      message: "Saved!",
      type: "success",
    });
  });

  it("auto-dismisses the notification after 3 seconds", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("Uh oh", "error");
    });
    expect(result.current.notification).not.toBeNull();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.notification).toBeNull();
  });

  it("resets the dismiss timer when a new notification replaces an old one", () => {
    const { result } = renderHook(() => useNotification());

    act(() => {
      result.current.showNotification("First", "success");
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.showNotification("Second", "error");
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Only 2s have passed since "Second" was shown, so it should still be visible.
    expect(result.current.notification).toEqual({
      message: "Second",
      type: "error",
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.notification).toBeNull();
  });
});
