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

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Jarvis Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});