'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { TbCopy, TbCheck } from "react-icons/tb"
import { Container } from '@chakra-ui/react'
interface PiiEntity {
  text: string;
  category: string;
  offset: number;
  length: number;
  confidenceScore: number;
}

interface DocumentResult {
  id: string;
  redactedText: string;
  entities: PiiEntity[];
}

interface BatchResult {
  results: DocumentResult[];
}

type OperationType = "PiiDetection" | "PiiRedaction";

interface ScanOptions {
  operation: OperationType;
  documents: string[];
}

// Add a utility function for text highlighting
const HighlightedText = ({ text, entities }: { text: string, entities: PiiEntity[] }) => {
  if (!entities.length) return <span>{text}</span>;

  // Sort entities by offset to handle overlapping
  const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);
  const segments: JSX.Element[] = [];
  let currentIndex = 0;

  sortedEntities.forEach((entity, idx) => {
    // Add text before the entity
    if (entity.offset > currentIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.slice(currentIndex, entity.offset)}
        </span>
      );
    }

    // Add highlighted entity
    segments.push(
      <span
        key={`entity-${idx}`}
        className="bg-yellow-200 rounded px-1 mx-0.5 whitespace-pre-wrap"
        title={`${entity.category} (${(entity.confidenceScore * 100).toFixed(1)}%)`}
      >
        {text.slice(entity.offset, entity.offset + entity.length)}
      </span>
    );

    currentIndex = entity.offset + entity.length;
  });

  // Add remaining text
  if (currentIndex < text.length) {
    segments.push(
      <span key="text-end">
        {text.slice(currentIndex)}
      </span>
    );
  }

  return <>{segments}</>;
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 absolute top-2 right-2 hover:bg-gray-100"
      onClick={copyToClipboard}
      title="Copy to clipboard"
    >
      {copied ? (
        <TbCheck className="h-4 w-4 text-green-600" />
      ) : (
        <TbCopy className="h-4 w-4" />
      )}
    </Button>
  );
};

export default function PrivacyScanner() {
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [result, setResult] = useState<BatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [operation, setOperation] = useState<OperationType>("PiiDetection")
  const [showOriginals, setShowOriginals] = useState<boolean[]>([])

  // Update showOriginals when result changes
  useEffect(() => {
    if (result) {
      setShowOriginals(new Array(result.results.length).fill(false))
    }
  }, [result])

  const toggleOriginal = (index: number) => {
    setShowOriginals(prev => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const analyzeBatch = async (inputDocuments: string[]) => {
    setLoading(true)
    setStatus('Analyzing documents...')
    try {
      const response = await fetch('/api/scan/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documents: inputDocuments,
          operation: "PiiEntityRecognition"  // Always use PiiEntityRecognition
        }),
      })

      const data = await response.json()
      if (data.error) {
        setStatus(`Error: ${data.error}`)
      } else {
        setStatus(`Successfully processed ${data.results.length} documents`)
        setResult(data)
      }
    } catch (error) {
      console.error('Batch analysis error:', error)
      setStatus('Error processing files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSubmit = async () => {
    setStatus('Reading files...')
    const fileContents = await Promise.all(
      files.map(async (file) => await file.text())
    )
    analyzeBatch(fileContents)
  }

  const handleTextSubmit = () => {
    analyzeBatch([text])
  }

  return (
    <div className="min-h-screen w-full">
      <Container 
        maxW="container.xl" 
        px={["16px", "40px"]} 
        pt="0"
        mt="0"
        position="relative"
        top="0"
        display="block"
        margin="0"
        marginInline="0"
      >
        <div className="w-full">
          <h2 className="text-2xl font-bold pt-5">Scan</h2>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <h3 className="text-md font-medium text-muted-foreground">
                What would you like to do?
              </h3>
              <RadioGroup
                value={operation}
                onValueChange={(value) => setOperation(value as OperationType)}
                className="flex flex-col space-y-1.5"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PiiDetection" id="detection" />
                  <Label htmlFor="detection">
                    Highlight PII
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PiiRedaction" id="redaction" />
                  <Label htmlFor="redaction">
                    Redact PII
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Tabs defaultValue="files" className="w-[40%]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files">Upload Files</TabsTrigger>
                <TabsTrigger value="text">Paste Text</TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    accept=".txt,.pdf,.docx"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500">
                    Upload multiple files (.txt, .pdf, .docx) to scan for PII
                  </p>
                </div>
                <Button
                  onClick={handleFileSubmit}
                  disabled={loading || files.length === 0}
                  className="w-full"
                >
                  {loading ? 'Scanning Files...' : 'Scan Files'}
                </Button>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste text to scan for PII"
                    className="min-h-[200px]"
                  />
                </div>
                <Button
                  onClick={handleTextSubmit}
                  disabled={loading || !text.trim()}
                  className="w-[50%]"
                >
                  {loading ? 'Scanning Text...' : 'Scan Text'}
                </Button>
              </TabsContent>
            </Tabs>

            {status && (
              <div className={`text-sm ${loading ? 'text-blue-600' : status.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {status}
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-6">
                {result.results.map((doc, docIndex) => (
                  <div key={docIndex} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        Document {docIndex + 1}: {files[docIndex]?.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`show-original-${docIndex}`}
                          checked={showOriginals[docIndex]}
                          onCheckedChange={() => toggleOriginal(docIndex)}
                        />
                        <Label htmlFor={`show-original-${docIndex}`} className="text-sm">
                          Show Original Text
                        </Label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">
                          {operation === "PiiRedaction" ? "Redacted Text" : "Detected PII"}:
                        </h4>
                        <div className="relative p-4 bg-gray-50 rounded min-h-[200px] whitespace-pre-wrap">
                          <CopyButton 
                            text={
                              showOriginals[docIndex] 
                                ? doc.originalText 
                                : operation === "PiiRedaction" 
                                  ? doc.redactedText 
                                  : doc.originalText
                            } 
                          />
                          <div className="pr-10">
                            {showOriginals[docIndex] ? (
                              <span>{doc.originalText}</span>
                            ) : operation === "PiiRedaction" ? (
                              doc.redactedText
                            ) : (
                              <HighlightedText text={doc.originalText} entities={doc.entities} />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Detected Entities:</h4>
                        <div className="space-y-2 p-4 bg-gray-50 rounded min-h-[200px] overflow-auto">
                          {doc.entities.map((entity, index) => (
                            <div key={index} className="p-2 bg-white rounded border">
                              <div className="grid grid-cols-[auto,1fr] gap-x-2">
                                <span className="font-medium">Text:</span>
                                <span>{entity.text}</span>
                                <span className="font-medium">Category:</span>
                                <span>{entity.category}</span>
                                <span className="font-medium">Confidence:</span>
                                <span>{(entity.confidenceScore * 100).toFixed(2)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
