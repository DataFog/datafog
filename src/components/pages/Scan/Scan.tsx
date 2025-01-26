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
import { RiOpenaiLine } from "react-icons/ri"


import { Container } from '@chakra-ui/react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

interface PiiEntity {
  text: string;
  category: string;
  offset: number;
  length: number;
  confidenceScore: number;
}

interface UserEntity {
  text: string;
  category: string;
  mode: "Manual";
  offset: number;
  length: number;
}

interface DocumentResult {
  id: string;
  originalText: string;
  redactedText: string;
  entities: PiiEntity[];
  deniedEntities?: Set<number>;
}

interface BatchResult {
  results: DocumentResult[];
}

type OperationType = "PiiDetection" | "PiiRedaction";

interface ScanOptions {
  operation: OperationType;
  documents: string[];
}

const OPENAI_CHAT_URL = "https://chat.openai.com/";

const TextSelectionWrapper = ({ children, onTextSelect }: { 
  children: React.ReactNode,
  onTextSelect: (selectedText: string, offset: number) => void 
}) => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ text: string, offset: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString().trim();
      if (selectedText) {
        e.preventDefault();
        
        // Get the actual text node and calculate absolute offset
        const container = e.currentTarget as HTMLElement;
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(container);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        
        const absoluteOffset = preSelectionRange.toString().length;
        
        setSelectedInfo({ text: selectedText, offset: absoluteOffset });
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
      }
    }
  };

  const handleMarkAsPii = () => {
    if (selectedInfo) {
      onTextSelect(selectedInfo.text, selectedInfo.offset);
      setMenuOpen(false);
      setContextMenuPosition(null);
      setSelectedInfo(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <>
      <div onContextMenu={handleContextMenu}>
        {children}
      </div>
      {contextMenuPosition && (
        <ContextMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <ContextMenuTrigger>
            <div style={{ 
              position: 'fixed', 
              left: contextMenuPosition.x, 
              top: contextMenuPosition.y,
              width: '1px',
              height: '1px' 
            }} />
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={handleMarkAsPii}>
              Mark as PII
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
    </>
  );
};

const HighlightedText = ({ 
  text, 
  entities, 
  docIndex,
  deniedEntities,
  onDenyEntity 
}: { 
  text: string, 
  entities: PiiEntity[],
  docIndex: number,
  deniedEntities?: Set<number>,
  onDenyEntity: (docIndex: number, entityIndex: number) => void
}) => {
  if (!entities.length) return <span>{text}</span>;

  const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);
  const segments: JSX.Element[] = [];
  let currentIndex = 0;

  sortedEntities.forEach((entity, idx) => {
    if (entity.offset > currentIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.slice(currentIndex, entity.offset)}
        </span>
      );
    }

    if (deniedEntities?.has(idx)) {
      segments.push(
        <span key={`entity-${idx}`}>
          {text.slice(entity.offset, entity.offset + entity.length)}
        </span>
      );
    } else {
      segments.push(
        <ContextMenu>
          <ContextMenuTrigger>
            <span
              key={`entity-${idx}`}
              className="bg-yellow-200 rounded px-1 mx-0.5 whitespace-pre-wrap cursor-context-menu"
              title={`${entity.category} (${(entity.confidenceScore * 100).toFixed(1)}%)`}
            >
              {text.slice(entity.offset, entity.offset + entity.length)}
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              className="text-red-600"
              onClick={() => onDenyEntity(docIndex, idx)}
            >
              Remove PII Detection
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    currentIndex = entity.offset + entity.length;
  });

  if (currentIndex < text.length) {
    segments.push(
      <span key="text-end">
        {text.slice(currentIndex)}
      </span>
    );
  }

  return <>{segments}</>;
};

const RedactedText = ({ 
  text, 
  entities, 
  docIndex,
  deniedEntities,
  onDenyEntity 
}: { 
  text: string, 
  entities: PiiEntity[],
  docIndex: number,
  deniedEntities?: Set<number>,
  onDenyEntity: (docIndex: number, entityIndex: number) => void
}) => {
  if (!entities.length) return <span>{text}</span>;

  const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);
  const segments: JSX.Element[] = [];
  let currentIndex = 0;

  sortedEntities.forEach((entity, idx) => {
    if (entity.offset > currentIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.slice(currentIndex, entity.offset)}
        </span>
      );
    }

    const entityText = text.slice(entity.offset, entity.offset + entity.length);
    
    if (deniedEntities?.has(idx)) {
      segments.push(
        <span key={`entity-${idx}`}>
          {entityText}
        </span>
      );
    } else {
      segments.push(
        <ContextMenu>
          <ContextMenuTrigger>
            <span
              key={`entity-${idx}`}
              className="bg-gray-900 text-gray-900 rounded px-1 mx-0.5 whitespace-pre-wrap cursor-context-menu select-none"
              title={`${entity.category} (${(entity.confidenceScore * 100).toFixed(1)}%)`}
            >
              {'*'.repeat(entityText.length)}
            </span>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem
              className="text-red-600"
              onClick={() => onDenyEntity(docIndex, idx)}
            >
              Remove Redaction
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    currentIndex = entity.offset + entity.length;
  });

  if (currentIndex < text.length) {
    segments.push(
      <span key="text-end">
        {text.slice(currentIndex)}
      </span>
    );
  }

  return <>{segments}</>;
};

// Add this utility function to generate text with user modifications
const generateModifiedText = (
  originalText: string,
  entities: PiiEntity[],
  deniedEntities?: Set<number>,
  isRedaction = false
): string => {
  if (!entities.length) return originalText;
  
  const sortedEntities = [...entities].sort((a, b) => a.offset - b.offset);
  const segments: string[] = [];
  let currentIndex = 0;

  sortedEntities.forEach((entity, idx) => {
    // Add text before the entity
    if (entity.offset > currentIndex) {
      segments.push(originalText.slice(currentIndex, entity.offset));
    }

    // Add entity text (either original or redacted)
    const entityText = originalText.slice(entity.offset, entity.offset + entity.length);
    if (deniedEntities?.has(idx)) {
      segments.push(entityText);
    } else if (isRedaction) {
      segments.push('*'.repeat(entityText.length));
    } else {
      segments.push(entityText);
    }

    currentIndex = entity.offset + entity.length;
  });

  // Add remaining text
  if (currentIndex < originalText.length) {
    segments.push(originalText.slice(currentIndex));
  }

  return segments.join('');
};

// Update the CopyButton component
const CopyButton = ({ 
  originalText,
  entities,
  deniedEntities,
  showOriginal,
  isRedaction
}: { 
  originalText: string,
  entities: PiiEntity[],
  deniedEntities?: Set<number>,
  showOriginal: boolean,
  isRedaction: boolean
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedAI, setCopiedAI] = useState(false);

  const getTextToCopy = () => {
    return showOriginal 
      ? originalText 
      : generateModifiedText(originalText, entities, deniedEntities, isRedaction);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(getTextToCopy());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAndOpenAI = async () => {
    await navigator.clipboard.writeText(getTextToCopy());
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2000);
    window.open(OPENAI_CHAT_URL, '_blank');
  };

  return (
    <div className="absolute top-2 right-2 flex flex-col items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-gray-100"
        onClick={copyToClipboard}
        title="Copy to clipboard"
      >
        {copied ? (
          <TbCheck className="h-4 w-4 text-green-600" />
        ) : (
          <TbCopy className="h-4 w-4" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:bg-gray-100"
        onClick={copyAndOpenAI}
        title="Copy and open in ChatGPT"
      >
        {copiedAI ? (
          <TbCheck className="h-4 w-4 text-green-600" />
        ) : (
          <RiOpenaiLine className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

const ResultsNav = ({ 
  operation, 
  setOperation
}: { 
  operation: OperationType,
  setOperation: (op: OperationType) => void,
}) => {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border rounded-lg shadow-sm">
      <Button
        variant="ghost"
        className={cn(
          "flex-1",
          operation === "PiiDetection" && "bg-gray-100"
        )}
        onClick={() => setOperation("PiiDetection")}
      >
        Highlight
      </Button>
      <Button
        variant="ghost"
        className={cn(
          "flex-1",
          operation === "PiiRedaction" && "bg-gray-100"
        )}
        onClick={() => setOperation("PiiRedaction")}
      >
        Redact
      </Button>
    </div>
  )
}

// Add this mapping function near the top with other interfaces
const mapOperationToApiTask = (operation: OperationType): string => {
  return "PiiEntityRecognition"; // Always use PiiEntityRecognition for the API
}

export default function PrivacyScanner() {
  const { data: session } = useSession()
  const [files, setFiles] = useState<File[]>([])
  const [text, setText] = useState('')
  const [result, setResult] = useState<BatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [operation, setOperation] = useState<OperationType>("PiiDetection")
  const [userEntities, setUserEntities] = useState<Map<number, UserEntity[]>>(new Map());
  const [showOriginal, setShowOriginal] = useState(false)
  const [deniedEntities, setDeniedEntities] = useState<Map<number, Set<number>>>(new Map());
  const [showDetectedEntities, setShowDetectedEntities] = useState(true);
  const [showUserEntities, setShowUserEntities] = useState(false);

  useEffect(() => {
    if (result) {
      setShowOriginal(false)
    }
  }, [result])

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
          operation: mapOperationToApiTask(operation)  // Map the operation type
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

  const handleManualEntity = (docIndex: number, text: string, offset: number) => {
    // Check for overlapping entities
    const end = offset + text.length;
    const hasOverlap = (result?.results[docIndex]?.entities || []).some(entity => 
      (offset >= entity.offset && offset < entity.offset + entity.length) ||
      (end > entity.offset && end <= entity.offset + entity.length)
    );

    if (hasOverlap) {
      alert('Cannot add overlapping entities');
      return;
    }

    const newEntity: UserEntity = {
      text,
      category: "Manual PII",
      mode: "Manual",
      offset,
      length: text.length
    };

    setUserEntities(prev => {
      const next = new Map(prev);
      const existing = next.get(docIndex) || [];
      if (!existing.some(e => e.offset === offset)) {
        next.set(docIndex, [...existing, newEntity]);
      }
      return next;
    });

    if (result) {
      const newResult = { ...result };
      const doc = newResult.results[docIndex];
      doc.entities = [...doc.entities, { ...newEntity, confidenceScore: 1.0 }];
      setResult(newResult);
    }

    if (!showUserEntities) {
      setShowUserEntities(true);
    }
  };

  const handleFileSubmit = async () => {
    setStatus('Reading files...')
    const fileContents = await Promise.all(
      files.map(async (file) => await file.text())
    )
    await analyzeBatch(fileContents)
  }

  const handleTextSubmit = async () => {
    await analyzeBatch([text])
  }

  const handleDenyEntity = (docIndex: number, entityIndex: number) => {
    setDeniedEntities(prev => {
      const next = new Map(prev);
      const docDenied = next.get(docIndex) || new Set();
      docDenied.add(entityIndex);
      next.set(docIndex, docDenied);
      return next;
    });
  };

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
          <div className="flex justify-between items-center pt-5">
            <h2 className="text-2xl font-bold">Scan</h2>
          </div>

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
                          checked={showOriginal}
                          onCheckedChange={setShowOriginal}
                        />
                        <Label htmlFor={`show-original-${docIndex}`} className="text-sm">
                          Show Original Text
                        </Label>
                      </div>
                    </div>
                    
                    <ResultsNav
                      operation={operation}
                      setOperation={setOperation}
                    />
                    
                    <div className={`grid gap-4 ${
                      showDetectedEntities || showUserEntities 
                        ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                        : 'grid-cols-1'}`
                    }>
                      <div>
                        <h4 className="font-medium mb-2">
                          {operation === "PiiRedaction" ? "Redacted Text" : "Detected PII"}:
                          <span className="ml-2 text-sm text-gray-500">(Double right-click to add manual {operation === "PiiRedaction" ? "redactions" : "highlights"})</span>
                        </h4>
                        <div className="relative p-4 bg-gray-50 rounded min-h-[200px] whitespace-pre-wrap">
                          <CopyButton 
                            originalText={doc.originalText}
                            entities={doc.entities}
                            deniedEntities={deniedEntities.get(docIndex)}
                            showOriginal={showOriginal}
                            isRedaction={operation === "PiiRedaction"}
                          />
                          <TextSelectionWrapper onTextSelect={(text, offset) => handleManualEntity(docIndex, text, offset)}>
                            <div className="pr-10">
                              {showOriginal ? (
                                <span>{doc.originalText}</span>
                              ) : operation === "PiiRedaction" ? (
                                <RedactedText 
                                  text={doc.originalText}
                                  entities={doc.entities}
                                  docIndex={docIndex}
                                  deniedEntities={deniedEntities.get(docIndex)}
                                  onDenyEntity={handleDenyEntity}
                                />
                              ) : (
                                <HighlightedText 
                                  text={doc.originalText} 
                                  entities={doc.entities}
                                  docIndex={docIndex}
                                  deniedEntities={deniedEntities.get(docIndex)}
                                  onDenyEntity={handleDenyEntity}
                                />
                              )}
                            </div>
                          </TextSelectionWrapper>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Detected Entities:</h4>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setShowDetectedEntities(!showDetectedEntities)}
                          >
                            {showDetectedEntities ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                        {showDetectedEntities && (
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
                        )}
                      </div>
                      
                      {userEntities.get(docIndex) && userEntities.get(docIndex)?.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">User Defined Entities:</h4>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUserEntities(!showUserEntities)}
                              >
                                {showUserEntities ? 'Collapse' : 'Expand'}
                              </Button>
                            </div>
                          </div>
                          {showUserEntities && (
                            <div className="space-y-2 p-4 bg-gray-50 rounded min-h-[200px] overflow-auto">
                              {userEntities.get(docIndex)?.map((entity, index) => (
                                <div key={index} className="p-2 bg-white rounded border">
                                  <div className="grid grid-cols-[auto,1fr] gap-x-2">
                                    <span className="font-medium">Text:</span>
                                    <span>{entity.text}</span>
                                    <span className="font-medium">Category:</span>
                                    <span>{entity.category}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
