import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { EmailProvider, useEmail } from "../UserContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <EmailProvider>{children}</EmailProvider>
);

describe("EmailProvider / useEmail", () => {
  it("starts with an empty email string", () => {
    const { result } = renderHook(() => useEmail(), { wrapper });
    expect(result.current.emailContext).toBe("");
  });

  it("updates emailContext via setEmailContext", () => {
    const { result } = renderHook(() => useEmail(), { wrapper });

    act(() => {
      result.current.setEmailContext("user@example.com");
    });

    expect(result.current.emailContext).toBe("user@example.com");
  });

  it("throws when useEmail is called outside an EmailProvider", () => {
    // Suppress the expected React error boundary console noise.
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useEmail())).toThrow(
      "useEmail must be used within an EmailProvider"
    );
    spy.mockRestore();
  });
});
