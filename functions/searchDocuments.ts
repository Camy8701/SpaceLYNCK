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

        // Fetch documents, tasks, and conversations
        // In a real scalable app, we'd use vector search.
        const [documents, tasks, conversations] = await Promise.all([
            base44.entities.ProjectDocument.filter({ project_id }, '-uploaded_at', 15),
            base44.entities.Task.filter({ project_id }, '-created_date', 30),
            base44.entities.AiConversation.filter({ project_id }, '-updated_date', 5)
        ]);

        const anthropic = new Anthropic({ apiKey });

        // Prepare context
        const docsContext = documents.map((d) => `
[DOCUMENT]
ID: ${d.id}
Type: document
Title: ${d.filename}
Content: ${d.extracted_text?.substring(0, 1500) || d.summary || "No content"}
`).join('\n');

        const tasksContext = tasks.map((t) => `
[TASK]
ID: ${t.id}
Type: task
Title: ${t.title}
Status: ${t.status}
Assignee: ${t.assigned_to || 'Unassigned'}
Description: ${t.description || "N/A"}
`).join('\n');

        const chatContext = conversations.flatMap(c => (c.history || []).slice(-10).map(h => `
[CHAT]
ID: ${c.id}
Type: conversation
Role: ${h.role}
Content: ${h.content?.substring(0, 500)}
`)).join('\n');

        const prompt = `
You are an intelligent search engine for a project management tool. The user is searching for: "${query}"

Search through the provided context (Documents, Tasks, and Chat History).
Find relevant information and provide a synthesized answer plus a list of specific sources.

Return valid JSON only:
{
  "synthesis": "string (A concise, direct answer to the user's query citing the information found)",
  "matches": [
    {
      "id": "string (the ID of the entity)",
      "type": "document" | "task" | "conversation",
      "title": "string (Filename, Task Title, or 'Conversation')",
      "relevance_score": number (0-100),
      "excerpt": "string (The specific relevant snippet)"
    }
  ]
}

Context:
${docsContext}
${tasksContext}
${chatContext}
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