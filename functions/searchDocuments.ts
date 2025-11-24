import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { project_id, query } = await req.json();
        if (!query) return Response.json({ error: 'Query required' }, { status: 400 });

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) return Response.json({ error: "API Key not configured" }, { status: 500 });

        // Fetch documents
        // In a real scalable app, we'd use vector search. 
        // Here we fetch recent docs text (limit to 20 for performance)
        const documents = await base44.entities.ProjectDocument.filter({ project_id }, '-uploaded_at', 20);

        if (documents.length === 0) {
            return Response.json({ results: [], message: "No documents found." });
        }

        const anthropic = new Anthropic({ apiKey });

        // Prepare context - truncate text to fit context window
        // We give the LLM the query and the docs, asking it to find relevant sections.
        const docsContext = documents.map((d, i) => `
[DOC_${i}]
ID: ${d.id}
Filename: ${d.filename}
Summary: ${d.summary || "N/A"}
Content Snippet: ${d.extracted_text?.substring(0, 3000) || ""}
`).join('\n\n');

        const prompt = `
You are a semantic search engine. The user is searching for: "${query}"

Look through the provided documents. 
Identify which documents are relevant and extract the specific relevant text/answer.
If the answer is found, provide the document ID, filename, and the relevant excerpt or synthesized answer.

Return valid JSON only:
{
  "matches": [
    {
      "document_id": "string",
      "filename": "string",
      "relevance_score": number (0-100),
      "excerpt": "string (relevant text snippet or answer)"
    }
  ],
  "synthesis": "string (overall answer to the query based on docs)"
}

Documents:
${docsContext}
`;

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: [{ role: "user", content: prompt }]
        });

        const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return Response.json({ results: [], synthesis: "Could not parse results." });
        
        const result = JSON.parse(jsonMatch[0]);

        // Filter low relevance
        const meaningfulMatches = result.matches.filter(m => m.relevance_score > 50);

        return Response.json({ 
            matches: meaningfulMatches,
            synthesis: result.synthesis
        });

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});