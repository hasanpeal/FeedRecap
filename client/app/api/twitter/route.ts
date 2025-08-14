import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");
  const screenname = searchParams.get("screenname");
  const query = searchParams.get("query");
  const searchType = searchParams.get("searchType");
  const cursor = searchParams.get("cursor");

  if (!endpoint) {
    return NextResponse.json(
      { error: "Endpoint is required" },
      { status: 400 }
    );
  }

  try {
    let url = `https://${process.env.TWITTER_API_HOST}/${endpoint}`;
    let params: any = {};

    // Add parameters based on the endpoint
    if (screenname) params.screenname = screenname;
    if (query) params.query = query;
    if (searchType) params.search_type = searchType;
    if (cursor) params.cursor = cursor;

    const response = await axios.get(url, {
      params,
      headers: {
        "x-rapidapi-key": process.env.TWITTER_API_KEY,
        "x-rapidapi-host": process.env.TWITTER_API_HOST,
      },
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch from Twitter API" },
      { status: error.response?.status || 500 }
    );
  }
}
