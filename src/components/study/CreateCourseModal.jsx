import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function CreateCourseModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    
    // Extract text from files
    for (const file of selectedFiles) {
      try {
        if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
          const text = await file.text();
          setContent(prev => prev ? prev + '\n\n' + text : text);
        } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf') || 
                   file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                   file.name.endsWith('.docx')) {
          // Upload and extract using AI
          toast.info('Extracting text from ' + file.name + '...');
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: {
              type: "object",
              properties: {
                text_content: { type: "string", description: "All text content from the document" }
              }
            }
          });
          if (extraction.status === 'success' && extraction.output?.text_content) {
            setContent(prev => prev ? prev + '\n\n' + extraction.output.text_content : extraction.output.text_content);
            toast.success('Text extracted from ' + file.name);
          }
        }
      } catch (err) {
        console.error('File extraction error:', err);
        toast.error('Could not extract text from ' + file.name);
      }
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      
      // Use AI to generate course structure
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a comprehensive study course outline for the following topic/content. Generate 5-8 lessons with titles and detailed content.

Topic/Content: ${name}
${content ? `Additional content: ${content}` : ''}

Return a JSON object with this structure:
{
  "lessons": [
    { "number": 1, "title": "Lesson title", "content": "Detailed lesson content (3-4 paragraphs with key concepts explained)" }
  ],
  "description": "Brief course description",
  "study_guide": "Comprehensive study guide covering all topics, organized by lesson with key points, definitions, and important concepts (make it detailed)",
  "cheat_sheet": "Quick reference cheat sheet with formulas, key terms, mnemonics, and essential facts in bullet points"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  number: { type: "number" },
                  title: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            description: { type: "string" },
            study_guide: { type: "string" },
            cheat_sheet: { type: "string" }
          }
        }
      });

      // Create course with study materials
      const course = await base44.entities.StudyCourse.create({
        name,
        description: aiResponse.description,
        total_lessons: aiResponse.lessons.length,
        completed_lessons: 0,
        progress_percentage: 0,
        icon: '📚',
        study_guide: aiResponse.study_guide,
        cheat_sheet: aiResponse.cheat_sheet
      });

      // Create lessons with diverse content
      for (const lesson of aiResponse.lessons) {
        await base44.entities.CourseLesson.create({
          course_id: course.id,
          lesson_number: lesson.number,
          title: lesson.title,
          content: lesson.content,
          completed: false
        });

        // Generate diverse quiz questions for each lesson
        const quizResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `Create diverse quiz questions for this lesson. Include:
- 2 multiple choice questions
- 2 fill-in-the-blank questions (use ___ for blanks)
- 1 true/false question

Lesson: ${lesson.title}
Content: ${lesson.content}

Return JSON:
{
  "questions": [
    { "type": "multiple_choice", "question": "...", "a": "...", "b": "...", "c": "...", "d": "...", "correct": "A", "explanation": "..." },
    { "type": "fill_blank", "question": "The ___ is responsible for...", "blank_answer": "answer", "explanation": "..." },
    { "type": "true_false", "question": "Statement here", "correct": "true", "explanation": "..." }
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    question: { type: "string" },
                    a: { type: "string" },
                    b: { type: "string" },
                    c: { type: "string" },
                    d: { type: "string" },
                    correct: { type: "string" },
                    blank_answer: { type: "string" },
                    explanation: { type: "string" }
                  }
                }
              }
            }
          }
        });

        // Get lesson ID
        const lessons = await base44.entities.CourseLesson.filter({ course_id: course.id, lesson_number: lesson.number });
        const lessonId = lessons[0]?.id;

        if (lessonId && quizResponse.questions) {
          for (const q of quizResponse.questions) {
            await base44.entities.QuizQuestion.create({
              lesson_id: lessonId,
              question_type: q.type || 'multiple_choice',
              question_text: q.question,
              option_a: q.a || '',
              option_b: q.b || '',
              option_c: q.c || '',
              option_d: q.d || '',
              correct_answer: q.correct,
              blank_answer: q.blank_answer || '',
              explanation: q.explanation
            });
          }
        }

        // Generate flashcards for each lesson
        const flashcardResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `Create 5 flashcards for studying this lesson. Each flashcard should have a question/term on front and answer/definition on back.

Lesson: ${lesson.title}
Content: ${lesson.content}

Return JSON:
{
  "flashcards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}`,
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

        if (lessonId && flashcardResponse.flashcards) {
          for (const fc of flashcardResponse.flashcards) {
            await base44.entities.Flashcard.create({
              lesson_id: lessonId,
              front_text: fc.front,
              back_text: fc.back,
              mastery_level: 0,
              ease_factor: 2.5,
              interval_days: 1,
              review_count: 0
            });
          }
        }
      }

      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['studyCourses']);
      toast.success('Course created with AI-generated lessons!');
      onOpenChange(false);
      resetForm();
      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error('Failed to create course');
    }
  });

  const resetForm = () => {
    setName('');
    setContent('');
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900/95 border-white/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Create Study Course with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Course Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Introduction to Biology"
              className="bg-white/10 border-white/20 text-white"
            />
          </div>

          <div>
            <Label>Upload Study Materials (optional)</Label>
            <div className="mt-2 border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/40 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".txt,.pdf,.docx"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto text-white/40 mb-2" />
                <p className="text-white/60 text-sm">Click to upload files</p>
                <p className="text-white/40 text-xs mt-1">TXT, PDF, DOCX</p>
              </label>
            </div>
            {files.length > 0 && (
              <p className="text-white/60 text-sm mt-2">{files.length} file(s) selected</p>
            )}
          </div>

          <div>
            <Label>Or paste content / describe topic</Label>
            <Textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your study notes or describe what you want to learn..."
              className="bg-white/10 border-white/20 text-white h-32"
            />
          </div>

          <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-300 text-sm">
              ✨ AI will generate:
            </p>
            <ul className="text-purple-200/70 text-xs mt-1 space-y-0.5">
              <li>• Course outline with lessons</li>
              <li>• Quiz questions for each lesson</li>
              <li>• Study materials and summaries</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button 
            onClick={() => createCourseMutation.mutate()}
            disabled={!name || isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Course
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}