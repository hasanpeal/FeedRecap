/**
 * @jest-environment node
 */
import axios from "axios";
import { GET } from "../route";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GET /api/twitter", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = {
      ...OLD_ENV,
      TWITTER_API_HOST: "twitter-api.example.com",
      TWITTER_API_KEY: "test-key",
    };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns 400 when endpoint is missing", async () => {
    const req = new Request("http://localhost/api/twitter?screenname=foo");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Endpoint is required" });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it("proxies to the Twitter API with the given params and returns its data", async () => {
    mockedAxios.get.mockResolvedValue({ data: { result: "ok" } });

    const req = new Request(
      "http://localhost/api/twitter?endpoint=user&screenname=jack&query=hello&searchType=Top&cursor=abc"
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ result: "ok" });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://twitter-api.example.com/user",
      {
        params: {
          screenname: "jack",
          query: "hello",
          search_type: "Top",
          cursor: "abc",
        },
        headers: {
          "x-rapidapi-key": "test-key",
          "x-rapidapi-host": "twitter-api.example.com",
        },
      }
    );
  });

  it("omits optional params that are not provided", async () => {
    mockedAxios.get.mockResolvedValue({ data: {} });

    const req = new Request("http://localhost/api/twitter?endpoint=user");
    await GET(req);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      "https://twitter-api.example.com/user",
      expect.objectContaining({ params: {} })
    );
  });

  it("returns the upstream error status when the request fails", async () => {
    mockedAxios.get.mockRejectedValue({ response: { status: 404 } });

    const req = new Request("http://localhost/api/twitter?endpoint=user");
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Failed to fetch from Twitter API" });
  });

  it("defaults to a 500 status when the error has no response status", async () => {
    mockedAxios.get.mockRejectedValue(new Error("network down"));

    const req = new Request("http://localhost/api/twitter?endpoint=user");
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});
