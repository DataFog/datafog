import { TextAnalysisClient, AzureKeyCredential, AnalyzeBatchAction } from "@azure/ai-language-text";
import { NextResponse } from "next/server";

const endpoint = process.env.AZURE_LANGUAGE_ENDPOINT;
const apiKey = process.env.AZURE_LANGUAGE_KEY;

interface ScanOptions {
  operation: "PiiEntityRecognition" | "EntityRecognition";
  documents: string[];
}

interface ProcessedResult {
  id: string;
  originalText: string;  // Original text for highlighting
  redactedText?: string; // Only for redaction operation
  entities: Array<{
    text: string;
    category: string;
    offset: number;
    length: number;
    confidenceScore: number;
  }>;
}

export async function POST(request: Request) {
  try {
    const { documents, operation } = (await request.json()) as ScanOptions;

    if (!Array.isArray(documents)) {
      return NextResponse.json({ error: "Documents must be an array" }, { status: 400 });
    }

    const client = new TextAnalysisClient(
      endpoint!,
      new AzureKeyCredential(apiKey!)
    );

    const actions: AnalyzeBatchAction[] = [
      {
        kind: operation,
        modelVersion: "latest",
      }
    ];

    const poller = await client.beginAnalyzeBatch(actions, documents, "en");
    
    poller.onProgress(() => {
      console.log(`Processing: ${poller.getOperationState().actionInProgressCount} actions remaining`);
    });

    const results = await poller.pollUntilDone();
    const processedResults = [];

    for await (const actionResult of results) {
      if (actionResult.error) {
        throw new Error(`Action error: ${actionResult.error.message}`);
      }

      if (actionResult.kind === operation) {
        processedResults.push(...actionResult.results.map(doc => {
          if (!doc.error) {
            return {
              id: doc.id,
              originalText: documents[Number(doc.id)], // Keep original text for highlighting
              entities: doc.entities
            } as ProcessedResult;
          }
          return null;
        }).filter(Boolean));
      }
    }

    return NextResponse.json({ 
      results: processedResults,
      totalProcessed: processedResults.length 
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze documents" },
      { status: 500 }
    );
  }
} 