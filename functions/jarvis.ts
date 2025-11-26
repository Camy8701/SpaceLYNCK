import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, project_id, message, query, file_url, content_type, content_id, chat_context } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return Response.json({ error: "Anthropic API Key not configured" }, { status: 500 });

    const anthropic = new Anthropic({ apiKey });
    const projectIdNormalized = project_id || 'global';
    const today = new Date().toISOString().split('T')[0];

    // =====================
    // ACTION: CHAT
    // =====================
    if (action === 'chat') {
      // Parallel fetch all context data
      let contextPromises = [];
      
      if (projectIdNormalized === 'global') {
        contextPromises = [
          base44.entities.Task.filter({ created_by: user.email }, '-created_date', 20),
          base44.entities.AiConversation.filter({ project_id: 'global', user_id: user.id }, '', 1),
          base44.entities.KnowledgeBase.filter({ created_by: user.email }, '', 5),
          base44.entities.Project.filter({ created_by: user.email }, '-created_date', 10),
          base44.entities.CalendarEvent.filter({ created_by: user.email }, 'start_datetime', 10),
          base44.entities.User.filter({}, '', 20) // Team members
        ];
      } else {
        contextPromises = [
          base44.entities.ProjectDocument.filter({ project_id: projectIdNormalized }, '-uploaded_at', 10),
          base44.entities.Branch.filter({ project_id: projectIdNormalized }),
          base44.entities.Task.filter({ project_id: projectIdNormalized }, '-created_date', 25),
          base44.entities.AiConversation.filter({ project_id: projectIdNormalized, user_id: user.id }, '', 1),
          base44.entities.Project.filter({ id: projectIdNormalized }, '', 1),
          base44.entities.KnowledgeBase.filter({ created_by: user.email }, '', 3),
          base44.entities.CalendarEvent.filter({ created_by: user.email }, 'start_datetime', 5),
          base44.entities.User.filter({}, '', 20),
          base44.entities.ProjectInsight.filter({ project_id: projectIdNormalized }, '-last_analyzed', 1)
        ];
      }

      const results = await Promise.all(contextPromises);

      let systemPrompt = "";
      let conversation, history = [];

      if (projectIdNormalized === 'global') {
        const [tasks, conversations, knowledgeBases, projects, events, teamMembers] = results;
        conversation = conversations[0];
        history = conversation?.history || [];

        // Get KB files in parallel
        const kbFilesPromises = knowledgeBases.map(kb => 
          base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '', 5)
        );
        const kbFilesResults = await Promise.all(kbFilesPromises);
        const kbFiles = kbFilesResults.flat().map((f, i) => ({ 
          ...f, 
          kb_name: knowledgeBases[Math.floor(i / 5)]?.name || 'Unknown' 
        }));

        // Build rich context
        const tasksText = tasks.map(t => {
          const overdue = t.due_date && t.due_date < today && t.status !== 'completed' ? ' [OVERDUE]' : '';
          const dueInfo = t.due_date ? ` (due: ${t.due_date})` : '';
          return `- ${t.title} [${t.status}] P:${t.priority || 'Normal'}${dueInfo}${overdue}`;
        }).join('\n');

        const projectsSummary = projects.map(p => 
          `- ${p.name} (${p.type}) started: ${p.start_date}`
        ).join('\n');

        const upcomingEvents = events.filter(e => e.start_datetime >= today).slice(0, 5)
          .map(e => `- ${e.title} on ${e.start_datetime?.split('T')[0]} (${e.category})`).join('\n');

        const teamText = teamMembers.filter(m => m.email !== user.email).slice(0, 10)
          .map(m => `- ${m.full_name} (${m.email})`).join('\n');

        const kbText = kbFiles.slice(0, 10).map(f => 
          `[${f.kb_name}] ${f.filename}: ${(f.content_text || '').substring(0, 400)}`
        ).join('\n');

        const overdueCount = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length;
        const todoCount = tasks.filter(t => t.status === 'todo').length;
        const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;

        systemPrompt = `You are Jarvis, the intelligent AI assistant for Lynck Space productivity platform.
Current Date: ${today}
User: ${user.full_name} (${user.email})

=== WORKSPACE OVERVIEW ===
Total Projects: ${projects.length}
Tasks: ${todoCount} todo, ${inProgressCount} in progress, ${overdueCount} overdue

=== PROJECTS ===
${projectsSummary || 'No projects yet'}

=== TASKS (Recent 20) ===
${tasksText || 'No tasks'}

=== UPCOMING EVENTS ===
${upcomingEvents || 'No upcoming events'}

=== TEAM MEMBERS ===
${teamText || 'No team members'}

=== KNOWLEDGE BASE ===
${kbText || 'No knowledge files'}

=== YOUR CAPABILITIES ===
- Answer questions about any project, task, or document
- Provide status updates and summaries
- Identify overdue tasks and risks
- Suggest priorities and next actions
- Draft reports and communications
- Search through knowledge base
- Help plan and break down work

Be concise, proactive, and helpful. If you notice overdue tasks or risks, mention them.
When suggesting new tasks, format as JSON:
\`\`\`json
{"suggested_tasks": [{"title": "...", "description": "...", "priority": "Normal"}]}
\`\`\``;

      } else {
        // Project-specific context
        const [documents, branches, tasks, conversations, projectArr, knowledgeBases, events, teamMembers, insights] = results;
        conversation = conversations[0];
        history = conversation?.history || [];
        const projectData = projectArr[0];

        // Get KB files in parallel
        const kbFilesPromises = knowledgeBases.map(kb => 
          base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '', 3)
        );
        const kbFilesResults = await Promise.all(kbFilesPromises);
        const kbFiles = kbFilesResults.flat();

        const projectInsight = insights?.[0];

        // Build rich task context
        const tasksText = tasks.map(t => {
          const overdue = t.due_date && t.due_date < today && t.status !== 'completed' ? ' [OVERDUE]' : '';
          const dueInfo = t.due_date ? ` (due: ${t.due_date})` : '';
          const assignee = t.assigned_to ? ` @${t.assigned_to}` : '';
          const branch = branches.find(b => b.id === t.branch_id);
          const branchName = branch ? ` [${branch.name}]` : '';
          return `- ${t.title}${branchName} [${t.status}] P:${t.priority || 'Normal'}${dueInfo}${assignee}${overdue}`;
        }).join('\n');

        const branchesText = branches.map(b => 
          `- ${b.name}${b.completed ? ' ✓' : ''}`
        ).join('\n');

        const docsText = documents.slice(0, 8).map(d => `
[${d.filename}]
Summary: ${d.summary || "N/A"}
Key Info: ${JSON.stringify(d.key_info || {})}
Content: ${d.extracted_text?.substring(0, 600) || 'No content'}
`).join('\n');

        const kbText = kbFiles.slice(0, 5).map(f => 
          `${f.filename}: ${(f.content_text || '').substring(0, 300)}`
        ).join('\n');

        const upcomingEvents = events.filter(e => e.start_datetime >= today).slice(0, 3)
          .map(e => `- ${e.title} on ${e.start_datetime?.split('T')[0]}`).join('\n');

        const teamText = teamMembers.filter(m => m.email !== user.email).slice(0, 5)
          .map(m => `- ${m.full_name}`).join('\n');

        const overdueCount = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed').length;
        const todoCount = tasks.filter(t => t.status === 'todo').length;
        const completedCount = tasks.filter(t => t.status === 'completed').length;

        // Project health from insights
        const healthInfo = projectInsight ? `
=== PROJECT HEALTH ===
Score: ${projectInsight.health_score}/100 (${projectInsight.health_status})
Summary: ${projectInsight.summary}
Risks: ${(projectInsight.risks || []).join(', ') || 'None identified'}
Next Steps: ${(projectInsight.next_steps || []).slice(0, 3).join(', ') || 'N/A'}
` : '';

        systemPrompt = `You are Jarvis, AI assistant for Lynck Space.
Current Date: ${today}
User: ${user.full_name}

=== PROJECT: ${projectData?.name || 'Unknown'} ===
Type: ${projectData?.type || 'N/A'}
Started: ${projectData?.start_date || 'N/A'}
Description: ${projectData?.description || 'No description'}
${healthInfo}
=== TASK SUMMARY ===
Todo: ${todoCount} | Completed: ${completedCount} | Overdue: ${overdueCount}

=== BRANCHES ===
${branchesText || 'No branches'}

=== ALL TASKS ===
${tasksText || 'No tasks'}

=== DOCUMENTS ===
${docsText || 'No documents'}

=== KNOWLEDGE BASE ===
${kbText || 'No KB files'}

=== UPCOMING EVENTS ===
${upcomingEvents || 'None'}

=== TEAM ===
${teamText || 'No team'}

You have full context of this project. Answer precisely based on data above. Mention overdue tasks proactively.
For task suggestions:
\`\`\`json
{"suggested_tasks": [{"title": "...", "description": "...", "priority": "Normal"}]}
\`\`\``;
      }

      // Call Claude with faster model for simple queries
      const messages = [...history.slice(-10), { role: "user", content: message }];
      
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role === 'system' ? 'user' : m.role, content: m.content }))
      });

      const aiResponse = msg.content[0].text;

      // Save conversation asynchronously (don't await)
      const newHistory = [...history.slice(-15), { role: "user", content: message }, { role: "assistant", content: aiResponse }];
      
      if (conversation) {
        base44.entities.AiConversation.update(conversation.id, { history: newHistory });
      } else {
        base44.entities.AiConversation.create({
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

      // Parallel fetch all searchable content
      let searchPromises;
      
      if (projectIdNormalized === 'global') {
        searchPromises = [
          base44.entities.Task.filter({ created_by: user.email }, '-created_date', 50),
          base44.entities.AiConversation.filter({ user_id: user.id }, '-updated_date', 5),
          base44.entities.KnowledgeBase.filter({ created_by: user.email }, '', 5),
          base44.entities.Project.filter({ created_by: user.email }, '', 20)
        ];
      } else {
        searchPromises = [
          base44.entities.ProjectDocument.filter({ project_id: projectIdNormalized }, '-uploaded_at', 20),
          base44.entities.Task.filter({ project_id: projectIdNormalized }, '-created_date', 50),
          base44.entities.AiConversation.filter({ project_id: projectIdNormalized }, '-updated_date', 5),
          base44.entities.Branch.filter({ project_id: projectIdNormalized })
        ];
      }

      const searchResults = await Promise.all(searchPromises);
      
      let documents = [], tasks = [], conversations = [], kbFiles = [], projects = [], branches = [];

      let kbs = [];
      if (projectIdNormalized === 'global') {
        [tasks, conversations, kbs, projects] = searchResults;
        
        // Get KB files in parallel
        const kbFilesPromises = (kbs || []).map(kb => 
          base44.entities.KnowledgeFile.filter({ knowledge_base_id: kb.id }, '', 10)
        );
        const kbFilesResults = await Promise.all(kbFilesPromises);
        kbFiles = kbFilesResults.flat().map((f, i) => ({ 
          ...f, 
          kb_name: (kbs || [])[Math.floor(i / 10)]?.name || 'Unknown' 
        }));
      } else {
        [documents, tasks, conversations, branches] = searchResults;
      }

      // Build search context
      const docsContext = documents.map(d => `[DOCUMENT] ID:${d.id} | ${d.filename} | ${d.extracted_text?.substring(0, 1000) || d.summary || ""}`).join('\n');
      const kbContext = kbFiles.map(f => `[KB:${f.kb_name}] ID:${f.id} | ${f.filename} | ${f.content_text?.substring(0, 1000) || ""}`).join('\n');
      const tasksContext = tasks.map(t => `[TASK] ID:${t.id} | ${t.title} | ${t.status} | ${t.priority} | ${t.description || ""}`).join('\n');
      const chatContext = conversations.flatMap(c => (c.history || []).slice(-6).map(h => `[CHAT] ${h.role}: ${h.content?.substring(0, 300)}`)).join('\n');

      const prompt = `Search query: "${query}"

Find relevant matches in the context below. Return JSON only:
{"synthesis": "concise answer", "matches": [{"id": "...", "type": "document|task|conversation|knowledge_base", "title": "...", "relevance_score": 0-100, "excerpt": "relevant snippet"}]}

Context:
${docsContext}
${kbContext}
${tasksContext}
${chatContext}`;

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }]
      });

      const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ matches: [], synthesis: "No results found." });
      
      const result = JSON.parse(jsonMatch[0]);
      return Response.json({ 
        matches: (result.matches || []).filter(m => m.relevance_score > 35),
        synthesis: result.synthesis
      });
    }

    // =====================
    // ACTION: SUMMARIZE (Summarize KB articles, project descriptions, etc.)
    // =====================
    if (action === 'summarize') {
      if (!content_type || !content_id) {
        return Response.json({ error: 'content_type and content_id required' }, { status: 400 });
      }

      let content = "";
      let title = "";

      if (content_type === 'knowledge_file') {
        const files = await base44.entities.KnowledgeFile.filter({ id: content_id }, '', 1);
        if (files[0]) {
          content = files[0].content_text || "";
          title = files[0].filename;
        }
      } else if (content_type === 'project') {
        const projects = await base44.entities.Project.filter({ id: content_id }, '', 1);
        if (projects[0]) {
          const [tasks, docs] = await Promise.all([
            base44.entities.Task.filter({ project_id: content_id }, '', 20),
            base44.entities.ProjectDocument.filter({ project_id: content_id }, '', 5)
          ]);
          title = projects[0].name;
          content = `Project: ${projects[0].name}
Type: ${projects[0].type}
Description: ${projects[0].description || 'N/A'}
Start: ${projects[0].start_date}
Deadline: ${projects[0].deadline || 'N/A'}

Tasks (${tasks.length}):
${tasks.map(t => `- ${t.title} [${t.status}]`).join('\n')}

Documents (${docs.length}):
${docs.map(d => `- ${d.filename}: ${d.summary || ''}`).join('\n')}`;
        }
      } else if (content_type === 'knowledge_base') {
        const kbs = await base44.entities.KnowledgeBase.filter({ id: content_id }, '', 1);
        if (kbs[0]) {
          title = kbs[0].name;
          const files = await base44.entities.KnowledgeFile.filter({ knowledge_base_id: content_id }, '', 10);
          content = files.map(f => `[${f.filename}]\n${f.content_text?.substring(0, 2000) || ''}`).join('\n\n');
        }
      }

      if (!content) return Response.json({ error: 'Content not found' }, { status: 404 });

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Provide a clear, concise summary of the following content. Include key points, main ideas, and any important details.

Title: ${title}
Content:
${content.substring(0, 8000)}

Return a well-structured summary with:
1. Brief overview (2-3 sentences)
2. Key points (bullet list)
3. Notable details or insights`
        }]
      });

      return Response.json({ summary: msg.content[0].text, title });
    }

    // =====================
    // ACTION: DRAFT_CHAT_RESPONSE (Generate draft replies for chat messages)
    // =====================
    if (action === 'draft_chat_response') {
      if (!chat_context) {
        return Response.json({ error: 'chat_context required' }, { status: 400 });
      }

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: `You are helping draft a professional chat response. Based on the conversation context below, generate 3 possible reply options that are helpful, professional, and appropriate.

Conversation context:
${chat_context}

Respond with JSON only:
{"drafts": [{"tone": "professional", "message": "..."}, {"tone": "friendly", "message": "..."}, {"tone": "brief", "message": "..."}]}`
        }]
      });

      const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ drafts: [] });
      
      const result = JSON.parse(jsonMatch[0]);
      return Response.json({ drafts: result.drafts || [] });
    }

    // =====================
    // ACTION: PROACTIVE_SUGGESTIONS (Based on user activity)
    // =====================
    if (action === 'proactive_suggestions') {
      const [tasks, events, timeEntries, projects] = await Promise.all([
        base44.entities.Task.filter({ created_by: user.email }, '-created_date', 30),
        base44.entities.CalendarEvent.filter({ created_by: user.email }, 'start_datetime', 10),
        base44.entities.TimeEntry.filter({ created_by: user.email, date: today }, '', 5),
        base44.entities.Project.filter({ created_by: user.email }, '-created_date', 5)
      ]);

      const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'completed');
      const todayTasks = tasks.filter(t => t.due_date === today && t.status !== 'completed');
      const upcomingEvents = events.filter(e => e.start_datetime >= today).slice(0, 5);
      const isCheckedIn = timeEntries.some(te => te.status === 'active' || te.status === 'paused');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

      const context = `
User: ${user.full_name}
Current Date: ${today}
Time: ${new Date().toLocaleTimeString()}

Status:
- Checked in today: ${isCheckedIn ? 'Yes' : 'No'}
- Overdue tasks: ${overdueTasks.length}
- Tasks due today: ${todayTasks.length}
- In progress: ${inProgressTasks.length}
- Upcoming events: ${upcomingEvents.length}
- Active projects: ${projects.length}

Overdue Tasks:
${overdueTasks.slice(0, 5).map(t => `- ${t.title} (was due: ${t.due_date})`).join('\n') || 'None'}

Today's Tasks:
${todayTasks.slice(0, 5).map(t => `- ${t.title}`).join('\n') || 'None'}

Upcoming Events:
${upcomingEvents.map(e => `- ${e.title} at ${e.start_datetime}`).join('\n') || 'None'}`;

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Based on the user's current activity and status, generate 3-5 proactive, actionable suggestions to help them be more productive. Be specific and helpful.

${context}

Return JSON only:
{"suggestions": [{"type": "urgent|reminder|tip|action", "title": "Short title", "description": "Helpful suggestion", "action_prompt": "Optional prompt user can click to act on this"}]}`
        }]
      });

      const jsonMatch = msg.content[0].text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return Response.json({ suggestions: [] });
      
      const result = JSON.parse(jsonMatch[0]);
      return Response.json({ suggestions: result.suggestions || [] });
    }

    // =====================
    // ACTION: ANALYZE_DOCUMENT (Analyze uploaded/dropped document)
    // =====================
    if (action === 'analyze_document') {
      if (!file_url) {
        return Response.json({ error: 'file_url required' }, { status: 400 });
      }

      // Extract text from document
      const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            full_text: { type: "string", description: "Complete text content from the document" }
          }
        }
      });

      if (extraction.status !== 'success' || !extraction.output?.full_text) {
        return Response.json({ error: 'Failed to extract document content' }, { status: 400 });
      }

      const docText = extraction.output.full_text;

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Analyze this document and provide:
1. A brief summary (2-3 sentences)
2. Key points and main ideas (bullet list)
3. Any action items or tasks mentioned
4. Questions the user might want to ask about this document

Document content:
${docText.substring(0, 10000)}

Return a comprehensive analysis.`
        }]
      });

      return Response.json({ analysis: msg.content[0].text, extracted_text: docText.substring(0, 500) + '...' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Jarvis Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});