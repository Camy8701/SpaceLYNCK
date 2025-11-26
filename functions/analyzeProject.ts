import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { project_id } = await req.json();
        if (!project_id) return Response.json({ error: 'Project ID required' }, { status: 400 });

        const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
        if (!apiKey) return Response.json({ error: "API Key not configured" }, { status: 500 });

        // Fetch Project Data
        const [project] = await base44.entities.Project.filter({ id: project_id }, '', 1);
        if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

        const tasks = await base44.entities.Task.filter({ project_id }, '-updated_date', 50);
        const documents = await base44.entities.ProjectDocument.filter({ project_id }, '-uploaded_at', 5);
        const branches = await base44.entities.Branch.filter({ project_id });

        // Prepare Context for AI
        const completedTasks = tasks.filter(t => t.status === 'completed');
        const activeTasks = tasks.filter(t => t.status === 'todo');
        const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

        const context = `
Project Name: ${project.name}
Description: ${project.description}
Start Date: ${project.start_date}

Task Statistics:
- Total Tasks: ${tasks.length}
- Completed: ${completedTasks.length}
- Active: ${activeTasks.length}
- Overdue: ${overdueTasks.length}

Recent Tasks:
${tasks.slice(0, 15).map(t => `- [${t.status}] ${t.title} (Priority: ${t.priority}, Due: ${t.due_date || 'None'})`).join('\n')}

Documents (First 5):
${documents.map(d => `- ${d.filename}: ${d.extracted_text?.substring(0, 200) || 'No text'}...`).join('\n')}

Branches: ${branches.map(b => b.name).join(', ')}
`;

        const anthropic = new Anthropic({ apiKey });

        const prompt = `
You are an expert Project Manager AI. Analyze the project data above and provide a health report.
Identify risks (e.g., overdue tasks, lack of progress, missing documentation), assess overall health, and suggest next steps.

Return ONLY a valid JSON object with the following structure:
{
  "health_score": number (0-100),
  "health_status": string ("On Track" | "At Risk" | "Needs Attention" | "Critical"),
  "summary": string (short executive summary),
  "risks": string[] (list of potential risks),
  "key_insights": string[] (positive or neutral observations/patterns),
  "next_steps": string[] (actionable recommendations)
}
`;

        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1500,
            system: "You are a precise JSON-generating AI assistant for project management.",
            messages: [
                { role: "user", content: context + prompt }
            ]
        });

        const content = msg.content[0].text;
        // Extract JSON if there's extra text (though we asked for only JSON)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to generate JSON analysis");
        
        const analysis = JSON.parse(jsonMatch[0]);

        // Save Analysis to DB
        const insightData = {
            project_id,
            ...analysis,
            last_analyzed: new Date().toISOString()
        };

        // Check if insight exists to update or create
        // Since we don't have 'upsert' easily exposed via single call on filter, we create new or just rely on fetching latest.
        // Better: Create new record, we fetch latest by date.
        await base44.entities.ProjectInsight.create(insightData);

        // Notification
        await base44.entities.Notification.create({
            user_id: user.id,
            type: 'ai_analysis',
            title: 'AI Analysis Complete',
            message: `New health report for ${project.name}: ${analysis.health_status}`,
            action_url: `/ProjectDetails?id=${project_id}`,
            related_entity_id: project_id
        });

        return Response.json(insightData);

    } catch (error) {
        console.error(error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});