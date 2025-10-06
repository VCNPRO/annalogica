import Replicate from "replicate";
import { put } from '@vercel/blob';
import { verifyRequestAuth } from '@/lib/auth';
import { processRateLimit, getClientIdentifier, checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // SECURITY: Verify authentication
    const user = verifyRequestAuth(request);
    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    // SECURITY: Rate limiting
    const identifier = getClientIdentifier(request, user.userId);
    const rateLimitResponse = await checkRateLimit(processRateLimit, identifier, 'transcripciones procesadas');
    if (rateLimitResponse) return rateLimitResponse;

    const { audioUrl, filename } = await request.json();
    
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const output: any = await replicate.run(
      "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
      { input: { audio: audioUrl, language: "Spanish" }}
    );
    
    const text = output.transcription || output.text || '';
    const segments = output.segments || [];
    const baseName = filename.replace(/\.[^/.]+$/, '');
    
    const txtBlob = await put(`${baseName}.txt`, text, { 
      access: 'public',
      contentType: 'text/plain; charset=utf-8'
    });
    
    let srt = '';
    segments.forEach((seg: any, i: number) => {
      const start = formatTime(seg.start);
      const end = formatTime(seg.end);
      srt += `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n\n`;
    });
    const srtBlob = await put(`${baseName}.srt`, srt, { 
      access: 'public',
      contentType: 'text/plain; charset=utf-8'
    });
    
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
        const summaryBlob = await put(`${baseName}-summary.txt`, summary, { 
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
