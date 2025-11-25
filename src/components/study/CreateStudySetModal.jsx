import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

export default function CreateStudySetModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📝');
  const [cards, setCards] = useState([{ front: '', back: '' }]);
  const [importText, setImportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (flashcards) => {
      const studySet = await base44.entities.StudySet.create({
        name,
        icon,
        card_count: flashcards.length
      });

      for (const card of flashcards) {
        await base44.entities.Flashcard.create({
          study_set_id: studySet.id,
          front_text: card.front,
          back_text: card.back,
          mastery_level: 0,
          ease_factor: 2.5,
          interval_days: 1
        });
      }

      return studySet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studySets']);
      toast.success('Study set created!');
      resetForm();
      onOpenChange(false);
    }
  });

  const resetForm = () => {
    setName('');
    setIcon('📝');
    setCards([{ front: '', back: '' }]);
    setImportText('');
  };

  const addCard = () => setCards([...cards, { front: '', back: '' }]);

  const removeCard = (index) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };

  const updateCard = (index, field, value) => {
    const updated = [...cards];
    updated[index][field] = value;
    setCards(updated);
  };

  const generateFromText = async () => {
    if (!importText.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract flashcards from this text. Create question-answer pairs that test understanding of the key concepts.

Text:
${importText}

Create 5-15 flashcards depending on content length. Focus on the most important concepts.`,
        response_json_schema: {
          type: "object",
          properties: {
            flashcards: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  front: { type: "string" },
                  back: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (response.flashcards?.length > 0) {
        setCards(response.flashcards.map(c => ({ front: c.front, back: c.back })));
        toast.success(`Generated ${response.flashcards.length} flashcards!`);
      }
    } catch (error) {
      toast.error('Failed to generate flashcards');
    }
    setIsGenerating(false);
  };

  const parseImportText = () => {
    // Parse formats like:
    // Q: question | A: answer
    // question - answer
    // question; answer
    const lines = importText.split('\n').filter(l => l.trim());
    const parsed = [];

    for (const line of lines) {
      let front, back;
      
      if (line.includes('|')) {
        [front, back] = line.split('|').map(s => s.replace(/^[QA]:\s*/i, '').trim());
      } else if (line.includes(' - ')) {
        [front, back] = line.split(' - ').map(s => s.trim());
      } else if (line.includes(';')) {
        [front, back] = line.split(';').map(s => s.trim());
      } else if (line.includes('\t')) {
        [front, back] = line.split('\t').map(s => s.trim());
      }

      if (front && back) {
        parsed.push({ front, back });
      }
    }

    if (parsed.length > 0) {
      setCards(parsed);
      toast.success(`Parsed ${parsed.length} flashcards!`);
    } else {
      toast.error('Could not parse text. Try format: question | answer');
    }
  };

  const validCards = cards.filter(c => c.front.trim() && c.back.trim());

  const icons = ['📝', '📚', '🧠', '💡', '🎯', '📖', '✏️', '🔬', '🌍', '💻', '🎨', '🎵'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Study Set</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Set Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spanish Vocab, Biology Terms"
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex gap-1 mt-1.5 flex-wrap max-w-[150px]">
                {icons.map(i => (
                  <button
                    key={i}
                    onClick={() => setIcon(i)}
                    className={`p-1.5 rounded ${icon === i ? 'bg-white/30' : 'hover:bg-white/10'}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="bg-white/10">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="import">Import Text</TabsTrigger>
              <TabsTrigger value="ai">AI Generate</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3 mt-4">
              {cards.map((card, idx) => (
                <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/50 text-sm">Card {idx + 1}</span>
                    {cards.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeCard(idx)} className="text-red-400 h-6">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={card.front}
                      onChange={(e) => updateCard(idx, 'front', e.target.value)}
                      placeholder="Front (question)"
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <Input
                      value={card.back}
                      onChange={(e) => updateCard(idx, 'back', e.target.value)}
                      placeholder="Back (answer)"
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addCard} className="w-full bg-white/5 border-white/20 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Card
              </Button>
            </TabsContent>

            <TabsContent value="import" className="space-y-3 mt-4">
              <div>
                <Label>Paste your flashcards</Label>
                <p className="text-white/50 text-xs mb-2">
                  Formats: "question | answer" or "question - answer" or "question; answer" (one per line)
                </p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="What is H2O? | Water&#10;Capital of France | Paris&#10;2 + 2 | 4"
                  className="bg-white/10 border-white/20 text-white h-40"
                />
              </div>
              <Button onClick={parseImportText} disabled={!importText.trim()} className="bg-blue-600 hover:bg-blue-700">
                <Upload className="w-4 h-4 mr-2" /> Parse Text
              </Button>
            </TabsContent>

            <TabsContent value="ai" className="space-y-3 mt-4">
              <div>
                <Label>Paste notes or text to convert</Label>
                <p className="text-white/50 text-xs mb-2">
                  AI will extract key concepts and create flashcards automatically
                </p>
                <Textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste your notes, textbook content, or any learning material here..."
                  className="bg-white/10 border-white/20 text-white h-40"
                />
              </div>
              <Button 
                onClick={generateFromText} 
                disabled={!importText.trim() || isGenerating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </TabsContent>
          </Tabs>

          {validCards.length > 0 && (
            <p className="text-white/60 text-sm text-center">
              {validCards.length} valid card{validCards.length !== 1 ? 's' : ''} ready
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate(validCards)}
            disabled={!name.trim() || validCards.length === 0 || createMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createMutation.isPending ? 'Creating...' : `Create Set (${validCards.length} cards)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}