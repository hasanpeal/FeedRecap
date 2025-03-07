import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY, // Use a secure environment variable
});

export async function POST(req: Request) {
  try {
    const { userInput, posts } = await req.json();

    const prompt = `Imagine you are a chatbot on X/twitter that answers question based on the following tweets, please provide a concise answer to this question: "${userInput}". Refraine from saying terms like "Based on the tweets provide", instead directly give answer. If you can't answer based on the tweets, please say so. Here are the tweets: ${JSON.stringify(
      posts
    )}`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({
      aiResponse: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI response." },
      { status: 500 }
    );
  }
}
