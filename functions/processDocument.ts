import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import pdf from 'npm:pdf-parse@1.1.1';
import mammoth from 'npm:mammoth@1.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, project_id, filename, file_size, file_type } = await req.json();

    // Download file
    const fileRes = await fetch(file_url);
    if (!fileRes.ok) throw new Error("Failed to download file");
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer); // Convert to Uint8Array (compatible with Buffer in Deno mostly)
    
    let extractedText = "";

    // Extraction Logic
    if (file_type.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
       try {
         const data = await pdf(Buffer.from(arrayBuffer));
         extractedText = data.text;
       } catch (e) {
         console.error("PDF parse error", e);
         extractedText = "(PDF text extraction failed)";
       }
    } else if (file_type.includes('word') || filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc')) {
       try {
         const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
         extractedText = result.value;
       } catch (e) {
         console.error("Mammoth error", e);
         extractedText = "(Word doc extraction failed)";
       }
    } else if (file_type.includes('text') || filename.toLowerCase().endsWith('.txt')) {
       const decoder = new TextDecoder();
       extractedText = decoder.decode(buffer);
    } else {
       extractedText = "(No text extraction available for this file type)";
    }

    // Truncate text if too long for DB text field (Base44 text fields can handle large strings usually, but let's be safe or just store it)
    // Assuming Base44 'string' is large text (TEXT/CLOB).

    const doc = await base44.entities.ProjectDocument.create({
      project_id,
      filename,
      file_url,
      file_type,
      file_size,
      extracted_text: extractedText,
      uploaded_at: new Date().toISOString()
    });

    return Response.json({ success: true, document: doc });

  } catch (error) {
    console.error("Process Document Error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});