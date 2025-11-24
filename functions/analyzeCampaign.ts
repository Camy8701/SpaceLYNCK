import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Anthropic from 'npm:@anthropic-ai/sdk@0.32.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url, task_context } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return Response.json({ error: "API Key not configured" }, { status: 500 });

    // Optional: Fetch URL content (simple text extraction)
    let pageContent = "";
    try {
      const res = await fetch(url);
      const text = await res.text();
      // Very basic strip tags for context
      pageContent = text.replace(/<[^>]*>/g, ' ').substring(0, 15000); 
    } catch (e) {
      console.log("Failed to fetch URL content, relying on URL only", e);
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `Analyze this marketing campaign and provide:
1. Current performance assessment
2. Issues identified
3. 3-5 specific recommendations

Campaign URL: ${url}
Task context: ${task_context}
Page Content Snippet: ${pageContent}

Format the response EXACTLY as follows (markdown):

✅ WHAT'S WORKING:
- [point]

⚠️ ISSUES:
- [point]

💡 RECOMMENDATIONS:
1. [action]
2. [action]
3. [action]`;

    const msg = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    });

    return Response.json({ analysis: msg.content[0].text });

  } catch (error) {
    console.error("Campaign Analysis Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});