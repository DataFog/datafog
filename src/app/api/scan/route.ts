import { TextAnalysisClient, AzureKeyCredential } from "@azure/ai-language-text";
import { NextResponse } from "next/server";

const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT;
const apiKey = process.env.AZURE_LANGUAGE_KEY;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  try {
    const client = new TextAnalysisClient(
      endpoint!,
      new AzureKeyCredential(apiKey!)
    );

    const [result] = await client.analyze("PiiEntityRecognition", [text], "en");

    if (result.error) {
      throw new Error(result.error.message);
    }

    return NextResponse.json({
      redactedText: result.redactedText,
      entities: result.entities,
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze text" },
      { status: 500 }
    );
  }
}
