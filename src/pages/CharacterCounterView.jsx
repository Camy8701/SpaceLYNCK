import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Type, Copy, Trash2, Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function CharacterCounterView({ sidebarCollapsed }) {
  const [text, setText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [grammarResults, setGrammarResults] = useState(null);

  // Calculate stats
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;
  const readingTime = Math.ceil(words / 200);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Text copied!');
  };

  const handleClear = () => {
    setText('');
    setGrammarResults(null);
  };

  const handleGrammarCheck = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text first');
      return;
    }

    setIsChecking(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this text for grammar, spelling, and punctuation errors. Return a JSON object with corrections.

Text: "${text}"

Return:
{
  "issues": [
    { "type": "spelling|grammar|punctuation|style", "original": "...", "suggestion": "...", "explanation": "..." }
  ],
  "corrected_text": "The full corrected text"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  original: { type: "string" },
                  suggestion: { type: "string" },
                  explanation: { type: "string" }
                }
              }
            },
            corrected_text: { type: "string" }
          }
        }
      });

      setGrammarResults(response);
    } catch (error) {
      toast.error('Failed to check grammar');
    }
    setIsChecking(false);
  };

  const applyFix = (issue) => {
    setText(text.replace(issue.original, issue.suggestion));
    setGrammarResults(prev => ({
      ...prev,
      issues: prev.issues.filter(i => i !== issue)
    }));
    toast.success('Fix applied!');
  };

  const applyAll = () => {
    if (grammarResults?.corrected_text) {
      setText(grammarResults.corrected_text);
      setGrammarResults(null);
      toast.success('All fixes applied!');
    }
  };

  const issueTypeColors = {
    spelling: 'text-red-400 bg-red-500/20',
    grammar: 'text-yellow-400 bg-yellow-500/20',
    punctuation: 'text-blue-400 bg-blue-500/20',
    style: 'text-purple-400 bg-purple-500/20'
  };

  return (
    <div className={`min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[280px]'}`}>
      <div className="p-6 lg:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
            <Type className="w-6 h-6" /> Text Analysis & AI Correction
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Text Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
              <Textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type your text here..."
                className="w-full h-[50vh] bg-transparent border-none text-white placeholder:text-white/40 resize-none text-lg focus-visible:ring-0"
              />
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleClear}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Clear
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCopy}
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <Button 
                onClick={handleGrammarCheck}
                disabled={isChecking || !text.trim()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isChecking ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Check Grammar with AI
              </Button>
            </div>
          </div>

          {/* Stats & Results */}
          <div className="space-y-4">
            {/* Statistics */}
            <Card className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
              <h3 className="text-white font-semibold mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">Characters</span>
                  <span className="text-white font-medium">{characters}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Characters (no spaces)</span>
                  <span className="text-white font-medium">{charactersNoSpaces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Words</span>
                  <span className="text-white font-medium">{words}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Sentences</span>
                  <span className="text-white font-medium">{sentences}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Paragraphs</span>
                  <span className="text-white font-medium">{paragraphs}</span>
                </div>
                <div className="flex justify-between border-t border-white/20 pt-3">
                  <span className="text-white/70">Reading time</span>
                  <span className="text-white font-medium">{readingTime} min</span>
                </div>
              </div>
            </Card>

            {/* Grammar Results */}
            {grammarResults && (
              <Card className="p-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Grammar Check</h3>
                  {grammarResults.issues?.length > 0 && (
                    <Button size="sm" onClick={applyAll} className="bg-green-600 hover:bg-green-700">
                      Fix All
                    </Button>
                  )}
                </div>

                {grammarResults.issues?.length === 0 ? (
                  <div className="text-center py-4">
                    <Check className="w-8 h-8 mx-auto text-green-400 mb-2" />
                    <p className="text-green-400">No issues found!</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                    {grammarResults.issues?.map((issue, idx) => (
                      <div key={idx} className="p-3 bg-white/10 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${issueTypeColors[issue.type] || 'text-white/70 bg-white/10'}`}>
                              {issue.type}
                            </span>
                            <p className="text-white/80 mt-2 text-sm">
                              <span className="line-through text-red-400">{issue.original}</span>
                              <span className="mx-2">→</span>
                              <span className="text-green-400">{issue.suggestion}</span>
                            </p>
                            {issue.explanation && (
                              <p className="text-white/50 text-xs mt-1">{issue.explanation}</p>
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => applyFix(issue)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Fix
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}