import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import * as pdfjs from "npm:pdfjs-dist@4.0.379";
import mammoth from "npm:mammoth@1.6.0";
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

// Worker configuration for PDF.js
// In Deno, we might need a polyfill or standard import for worker, 
// but often for basic text extraction 'pdfjs-dist/legacy/build/pdf.js' or similar works without worker if configured.
// However, for simplicity in this environment, we'll try basic text extraction or fallback.
// A robust PDF text extraction in Deno can be tricky without specific libraries. 
// We'll assume the previous implementation worked or we use a simple logic.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { project_id, file_url, filename, file_type, file_size } = await req.json();
        
        if (!file_url || !project_id) {
             return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Download File
        const fileRes = await fetch(file_url);
        const arrayBuffer = await fileRes.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        let extractedText = "";

        // 2. Extract Text
        try {
            if (file_type.includes('pdf')) {
                // Basic PDF extraction setup for Deno
                // Note: This is a simplified version. 
                const loadingTask = pdfjs.getDocument(uint8Array);
                const pdf = await loadingTask.promise;
                let textContent = "";
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    const strings = content.items.map((item) => item.str);
                    textContent += strings.join(" ") + "\n";
                }
                extractedText = textContent;

            } else if (file_type.includes('word') || filename.endsWith('.docx') || filename.endsWith('.doc')) {
                const buffer = Buffer.from(arrayBuffer);
                const result = await mammoth.extractRawText({ buffer: buffer });
                extractedText = result.value;

            } else if (file_type.includes('text') || filename.endsWith('.txt') || filename.endsWith('.md')) {
                extractedText = new TextDecoder().decode(uint8Array);
            } else {
                extractedText = "Text extraction not supported for this file type.";
            }
        } catch (e) {
            console.error("Extraction error:", e);
            extractedText = "Failed to extract text.";
        }

        // 3. AI Analysis (Extraction of Key Info)
        let summary = "";
        let key_info = { deadlines: [], action_items: [], stakeholders: [] };

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (apiKey && extractedText && extractedText.length > 50 && !extractedText.startsWith("Failed")) {
            try {
                const anthropic = new Anthropic({ apiKey });
                const prompt = `
Analyze the following document text.
1. Provide a concise summary (max 3 sentences).
2. Extract key information: 
   - Deadlines (dates/times)
   - Action Items (tasks)
   - Stakeholders (people/orgs involved)

Return valid JSON only:
{
  "summary": "string",
  "key_info": {
    "deadlines": ["string"],
    "action_items": ["string"],
    "stakeholders": ["string"]
  }
}

Document Text:
${extractedText.substring(0, 15000)} 
`; // Limit text to avoid token limits

                const msg = await anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 1000,
                    messages: [{ role: "user", content: prompt }]
                });

                const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const analysis = JSON.parse(jsonMatch[0]);
                    summary = analysis.summary || "";
                    key_info = analysis.key_info || key_info;
                }
            } catch (aiError) {
                console.error("AI Analysis error:", aiError);
            }
        }

        // 4. Save to DB
        const doc = await base44.entities.ProjectDocument.create({
            project_id,
            filename,
            file_url,
            file_type,
            file_size,
            extracted_text: extractedText,
            summary,
            key_info,
            uploaded_at: new Date().toISOString()
        });

        return Response.json(doc);

    } catch (error) {
        console.error("Process Document Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});