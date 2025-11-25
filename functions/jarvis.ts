import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, project_id, message, query } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return Response.json({ error: "Anthropic API Key not configured" }, { status: 500 });

    const anthropic = new Anthropic({ apiKey });
    const projectIdNormalized = project_id || 'global';

    // =====================
    // ACTION: CHAT
    // =====================
    if (action === 'chat') {
      let documents = [], branches = [], tasks = [], conversations = [], knowledgeBases = [], kbFiles = [];
      let projectData = null;
      let project_name = '';

      if (projectIdNormalized === 'global') {
        // Global context
        const [globalTasks, globalConvs, kbs] = await Promise.all([
          base44.entities.Task.filter({ created_by: user.email }, '-created_date', 15),
          base44.entities.AiConversation.filter({ project_id: 'global', user_id: user.id }, '', 1),
          base44.entities.KnowledgeBase.filter({ created_by: user.email }, '', 5)
        ]);
        tasks = globalTasks;
        conversations = globalConvs;
        knowledgeBases = kbs;

        // Get KB files content
        for (const kb of knowledgeBases) {
          const files = await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '', 10);
          kbFiles.push(...files.map(f => ({ ...f, kb_name: kb.name })));
        }
      } else {
        // Project context
        const results = await Promise.all([
          base44.entities.ProjectDocument.filter({ project_id: projectIdNormalized }, '-uploaded_at', 10),
          base44.entities.Branch.filter({ project_id: projectIdNormalized }),
          base44.entities.Task.filter({ project_id: projectIdNormalized }, '-created_date', 15),
          base44.entities.AiConversation.filter({ project_id: projectIdNormalized, user_id: user.id }, '', 1),
          base44.entities.Project.filter({ id: projectIdNormalized }, '', 1)
        ]);
        
        documents = results[0];
        branches = results[1];
        tasks = results[2];
        conversations = results[3];
        const projects = results[4];
        if (projects && projects.length > 0) {
          projectData = projects[0];
          project_name = projectData.name;
        }
      }

      // Prepare History
      let conversation = conversations[0];
      let history = conversation?.history || [];

      // Construct System Prompt
      const tasksText = tasks.map(t => `- ${t.title} (${t.status}, priority: ${t.priority || 'Normal'})`).join('\n');
      
      let systemPrompt = "";
      
      if (projectIdNormalized === 'global') {
        const kbText = kbFiles.map(f => `[${f.kb_name}] ${f.filename}: ${(f.content_text || '').substring(0, 500)}`).join('\n');
        
        systemPrompt = `You are Jarvis, the AI assistant for Lynck Space - a productivity and project management platform.
User: ${user.full_name} (${user.email})

Recent tasks across all projects:
${tasksText || 'No tasks yet'}

Knowledge Base Content:
${kbText || 'No knowledge base files'}

You can help with:
- Drafting reports and summaries
- Analyzing tasks and priorities
- Answering questions about their documents and projects
- Research (if user asks to search/research something)
- Breaking down complex tasks into subtasks

When suggesting tasks to create, output them in this JSON format at the end of your response:
\`\`\`json
{
  "suggested_tasks": [
    { "title": "Task Title", "description": "Brief description", "priority": "Normal" }
  ]
}
\`\`\`
`;
      } else {
        const docsText = documents.map(d => `
[${d.filename}]
Summary: ${d.summary || "N/A"}
Key Info: ${JSON.stringify(d.key_info || {})}
Text: ${d.extracted_text?.substring(0, 800)}...
`).join('\n');
        const branchesText = branches.map(b => b.name).join(', ');
        
        systemPrompt = `You are Jarvis, the AI assistant for Lynck Space.
Project: ${project_name}
Branches: ${branchesText || 'None'}

Recent tasks:
${tasksText || 'No tasks'}

Documents Context:
${docsText || 'No documents uploaded'}

Answer based on the project context. Be concise and helpful.

When suggesting tasks, output them as:
\`\`\`json
{
  "suggested_tasks": [
    { "title": "Task Title", "description": "Brief description", "priority": "Normal" }
  ]
}
\`\`\`
`;
      }

      // Call Claude
      const messages = [...history, { role: "user", content: message }];
      
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
      });

      const aiResponse = msg.content[0].text;

      // Update History & Save
      const newHistory = [...messages, { role: "assistant", content: aiResponse }];
      
      if (conversation) {
        await base44.entities.AiConversation.update(conversation.id, { history: newHistory });
      } else {
        await base44.entities.AiConversation.create({
          project_id: projectIdNormalized,
          user_id: user.id,
          history: newHistory
        });
      }

      return Response.json({ response: aiResponse });
    }

    // =====================
    // ACTION: SEARCH (Deep Search)
    // =====================
    if (action === 'search') {
      if (!query) return Response.json({ error: 'Query required' }, { status: 400 });

      // Fetch documents, tasks, and conversations
      let documents = [], tasks = [], conversations = [], kbFiles = [];

      if (projectIdNormalized === 'global') {
        const [globalTasks, globalConvs, kbs] = await Promise.all([
          base44.entities.Task.filter({ created_by: user.email }, '-created_date', 30),
          base44.entities.AiConversation.filter({ user_id: user.id }, '-updated_date', 5),
          base44.entities.KnowledgeBase.filter({ created_by: user.email }, '', 5)
        ]);
        tasks = globalTasks;
        conversations = globalConvs;
        
        for (const kb of kbs) {
          const files = await base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '', 10);
          kbFiles.push(...files.map(f => ({ ...f, kb_name: kb.name })));
        }
      } else {
        [documents, tasks, conversations] = await Promise.all([
          base44.entities.ProjectDocument.filter({ project_id: projectIdNormalized }, '-uploaded_at', 15),
          base44.entities.Task.filter({ project_id: projectIdNormalized }, '-created_date', 30),
          base44.entities.AiConversation.filter({ project_id: projectIdNormalized }, '-updated_date', 5)
        ]);
      }

      // Prepare context
      const docsContext = documents.map((d) => `
[DOCUMENT]
ID: ${d.id}
Type: document
Title: ${d.filename}
Content: ${d.extracted_text?.substring(0, 1500) || d.summary || "No content"}
`).join('\n');

      const kbContext = kbFiles.map((f) => `
[KNOWLEDGE_BASE]
ID: ${f.id}
Type: knowledge_base
Title: ${f.filename} (${f.kb_name})
Content: ${f.content_text?.substring(0, 1500) || "No content"}
`).join('\n');

      const tasksContext = tasks.map((t) => `
[TASK]
ID: ${t.id}
Type: task
Title: ${t.title}
Status: ${t.status}
Priority: ${t.priority || 'Normal'}
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
You are Jarvis, an intelligent search engine for Lynck Space. The user is searching for: "${query}"

Search through the provided context (Documents, Knowledge Base, Tasks, and Chat History).
Find relevant information and provide a synthesized answer plus a list of specific sources.

Return valid JSON only:
{
  "synthesis": "string (A concise, direct answer citing the information found)",
  "matches": [
    {
      "id": "string",
      "type": "document" | "task" | "conversation" | "knowledge_base",
      "title": "string",
      "relevance_score": number (0-100),
      "excerpt": "string (The specific relevant snippet)"
    }
  ]
}

Context:
${docsContext}
${kbContext}
${tasksContext}
${chatContext}
`;

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      });

      const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ matches: [], synthesis: "Could not parse results." });
      
      const result = JSON.parse(jsonMatch[0]);
      const meaningfulMatches = result.matches.filter(m => m.relevance_score > 40);

      return Response.json({ 
        matches: meaningfulMatches,
        synthesis: result.synthesis
      });
    }

    return Response.json({ error: 'Invalid action. Use "chat" or "search".' }, { status: 400 });

  } catch (error) {
    console.error("Jarvis Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});