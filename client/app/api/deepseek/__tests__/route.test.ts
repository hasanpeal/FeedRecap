/**
 * @jest-environment node
 */
jest.mock("openai", () => {
  const mockCreate = jest.fn();
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  return {
    __esModule: true,
    default: MockOpenAI,
    __mockCreate: mockCreate,
  };
});

import { POST } from "../route";

const { __mockCreate: mockCreate } = jest.requireMock("openai") as {
  __mockCreate: jest.Mock;
};

describe("POST /api/deepseek", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns the AI response on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Here is your answer." } }],
    });

    const req = new Request("http://localhost/api/deepseek", {
      method: "POST",
      body: JSON.stringify({
        userInput: "What happened today?",
        posts: [{ text: "Something happened" }],
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ aiResponse: "Here is your answer." });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "deepseek-chat",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: expect.stringContaining("What happened today?"),
          }),
        ]),
      })
    );
  });

  it("returns a 500 error when the OpenAI call fails", async () => {
    mockCreate.mockRejectedValue(new Error("upstream failure"));

    const req = new Request("http://localhost/api/deepseek", {
      method: "POST",
      body: JSON.stringify({ userInput: "hi", posts: [] }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "Failed to fetch AI response." });
  });

  it("returns a 500 error when the request body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/deepseek", {
      method: "POST",
      body: "not json",
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
