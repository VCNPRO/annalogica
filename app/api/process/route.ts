import Replicate from "replicate";
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const









cd /tmp/annalogica

# Completar /api/process
cat > app/api/process/route.ts << 'EOF'
import Replicate from "replicate";
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const { audioUrl, filename } = await request.json();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 });
    
    // Transcribir con Replicate usando la URL del blob
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const output: any = await replicate.run(
      "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
      { input: { audio: audioUrl, language: "Spanish" }}
    );
    
    const text = output.transcription || output.text || '';
    const segments = output.segments || [];
    
    // Guardar TXT
    const txtBlob = await put(`${filename}.txt`, text, { 
      access: 'public',
      contentType: 'text/plain; charset=utf-8'
    });
    
    // Guardar SRT
    let srt = '';
    segments.forEach((seg: any, i: number) => {
      const start = formatTime(seg.start);
      const end = formatTime(seg.end);
      srt += `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n\n`;
    });
    const srtBlob = await put(`${filename}.srt`, srt, { 
      access: 'public',
      contentType: 'text/plain; charset=utf-8'
    });
    
    // Generar resumen
    let summaryUrl = null;
    if (text.length > 100) {
      try {
        const summaryRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{ role: 'user', content: `Resume en español en 3-4 párrafos:\n\n${text.slice(0, 8000)}` }]
          })
        });
        const summaryData = await summaryRes.json();
        const summary = summaryData.content[0].text;
        const summaryBlob = await put(`${filename}-summary.txt`, summary, { 
          access: 'public',
          contentType: 'text/plain; charset=utf-8'
        });
        summaryUrl = summaryBlob.url;
      } catch (e) {
        console.log('Summary failed:', e);
      }
    }
    
    return Response.json({
      success: true,
      txtUrl: txtBlob.url,
      srtUrl: srtBlob.url,
      summaryUrl
    });
    
  } catch (error: any) {
    console.error('Process error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

function pad(num: number, size = 2) {
  return String(num).padStart(size, '0');
}
