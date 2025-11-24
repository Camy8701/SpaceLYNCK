import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let { project_id, message, project_name } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return Response.json({ error: "API Key not configured" }, { status: 500 });

    const anthropic = new Anthropic({ apiKey });
    
    // Global mode
    if (!project_id) project_id = 'global';

    // 1. Fetch Context
    let documents = [], branches = [], tasks = [], conversations = [];
    
    if (project_id === 'global') {
        // Global context: Just user's recent tasks across projects
        [tasks, conversations] = await Promise.all([
            base44.entities.Task.filter({ created_by: user.email }, '-created_date', 10),
            base44.entities.AiConversation.filter({ project_id: 'global', user_id: user.id }, '', 1)
        ]);
    } else {
        // Project context
        [documents, branches, tasks, conversations] = await Promise.all([
            base44.entities.ProjectDocument.filter({ project_id }, '-uploaded_at', 5),
            base44.entities.Branch.filter({ project_id }),
            base44.entities.Task.filter({ project_id }, '-created_date', 10),
            base44.entities.AiConversation.filter({ project_id, user_id: user.id }, '', 1)
        ]);
    }

    // 2. Prepare History
    let conversation = conversations[0];
    let history = conversation?.history || [];

    // 3. Construct System Prompt
    const tasksText = tasks.map(t => `- ${t.title} (${t.status})`).join('\n');
    
    let systemPrompt = "";
    
    if (project_id === 'global') {
        systemPrompt = `You are an AI assistant for ProjectFlow (Global Dashboard).
User: ${user.full_name}
Recent tasks across all projects:
${tasksText}

Answer questions about the user's work and general productivity.`;
    } else {
        const docsText = documents.map(d => `[${d.filename}]: ${d.extracted_text?.substring(0, 1000)}...`).join('\n');
        const branchesText = branches.map(b => b.name).join(', ');
        
        systemPrompt = `You are an AI assistant for ProjectFlow.
Project: ${project_name}
Branches: ${branchesText}
Recent tasks:
${tasksText}

Documents Context:
${docsText}

Answer based on the project context provided. Be concise.`;
    }

    // 4. Call Claude
    const messages = [...history, { role: "user", content: message }];
    
    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })) // Ensure clean format
    });

    const aiResponse = msg.content[0].text;

    // 5. Update History & Save
    const newHistory = [...messages, { role: "assistant", content: aiResponse }];
    
    if (conversation) {
      await base44.entities.AiConversation.update(conversation.id, { history: newHistory });
    } else {
      await base44.entities.AiConversation.create({
        project_id,
        user_id: user.id,
        history: newHistory
      });
    }

    return Response.json({ response: aiResponse });

  } catch (error) {
    console.error("AI Assistant Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});