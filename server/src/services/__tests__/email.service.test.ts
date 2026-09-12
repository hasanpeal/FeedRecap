const sendMock = jest.fn();
const setApiKeyMock = jest.fn();

jest.mock("@sendgrid/mail", () => ({
  __esModule: true,
  default: {
    setApiKey: (...args: unknown[]) => setApiKeyMock(...args),
    send: (...args: unknown[]) => sendMock(...args),
  },
}));

import sgMail, {
  ADMIN_ALERT_RECIPIENTS,
  sendAdminAlert,
} from "../email.service";

// `clearMocks` (jest.config.js) resets mock.calls before every test, which
// would wipe out the setApiKey call that happens once at module-import
// time. Capture it immediately after import, before any test runs.
const setApiKeyCallArgsAtImport = [...setApiKeyMock.mock.calls];

describe("email.service", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("sets the SendGrid API key from the environment on import", () => {
    expect(setApiKeyCallArgsAtImport).toEqual([[process.env.SENDGRID_API_KEY]]);
  });

  it("exports the sendgrid client as the default export", () => {
    expect(sgMail).toBeDefined();
  });

  it("exports the three hardcoded admin alert recipients", () => {
    expect(ADMIN_ALERT_RECIPIENTS).toEqual([
      "pealh0320@gmail.com",
      "jeremy.shoykhet+1@gmail.com",
      "support@overtonnews.com",
    ]);
  });

  describe("sendAdminAlert", () => {
    it("sends one email per recipient with the given subject/text", async () => {
      sendMock.mockResolvedValue(undefined);

      await sendAdminAlert(
        ["a@example.com", "b@example.com"],
        "Subject",
        "Body text"
      );

      expect(sendMock).toHaveBeenCalledTimes(2);
      expect(sendMock).toHaveBeenNthCalledWith(1, {
        to: "a@example.com",
        from: process.env.FROM_EMAIL,
        subject: "Subject",
        text: "Body text",
      });
      expect(sendMock).toHaveBeenNthCalledWith(2, {
        to: "b@example.com",
        from: process.env.FROM_EMAIL,
        subject: "Subject",
        text: "Body text",
      });
    });

    it("continues sending to remaining recipients when one send fails", async () => {
      sendMock
        .mockRejectedValueOnce(new Error("SendGrid down"))
        .mockResolvedValueOnce(undefined);

      await expect(
        sendAdminAlert(
          ["fail@example.com", "ok@example.com"],
          "Subject",
          "Body"
        )
      ).resolves.toBeUndefined();

      expect(sendMock).toHaveBeenCalledTimes(2);
    });

    it("does nothing when given an empty recipient list", async () => {
      await sendAdminAlert([], "Subject", "Body");
      expect(sendMock).not.toHaveBeenCalled();
    });
  });
});
