    1     'use client';
    2     import React from 'react';
    3
    4     type TranscriptProps = {
    5       transcript: {
    6         summary?: string;
    7         utterances?: { speaker: number; text: string }[];
    8         chapters?: { headline: string; summary: string; start: number; end: number }[];
    9         iab_categories_result?: {
   10           summary?: { label: string; relevance: number }[];
   11         };
   12       };
   13     };
   14
   15     export default function AssemblyAIResults({ transcript }: TranscriptProps) {
   16       if (!transcript) return null;
   17
   18       return (
   19         <section className="space-y-8">
   20           {transcript.summary && (
   21             <div>
   22               <h2 className="text-xl font-semibold">📝 Resumen</h2>
   23               <p className="text-gray-700">{transcript.summary}</p>
   24             </div>
   25           )}
   26
   27           {transcript.utterances?.length && (
   28             <div>
   29               <h2 className="text-xl font-semibold">🗣️Intervinientes</h2>
   30               <ul className="list-disc pl-5">
   31                 {transcript.utterances.map((u, i) => (
   32                   <li key={i}>
   33                     <strong>Speaker {u.speaker}:</strong> {u.text}
   34                   </li>
   35                 ))}
   36               </ul>
   37             </div>
   38           )}
   39
   40           {transcript.chapters?.length && (
   41             <div>
   42               <h2 className="text-xl font-semibold">📚 Capítulos</h2>
   43               <ul className="list-disc pl-5">
   44                 {transcript.chapters.map((c, i) => (
   45                   <li key={i}>
   46                     <strong>{c.headline}</strong> ({Math.round(c.start / 1000)}s – {Math.round(c.end / 1000)}s)
   47                     <p>{c.summary}</p>
   48                   </li>
   49                 ))}
   50               </ul>
   51             </div>
   52           )}
   53
   54           {transcript.iab_categories_result?.summary?.length && (
   55             <div>
   56               <h2 className="text-xl font-semibold">🧠 Temas detectados</h2>
   57               <ul className="list-disc pl-5">
   58                 {transcript.iab_categories_result.summary.map((t, i) => (
   59                   <li key={i}>
   60                     {t.label} ({Math.round(t.relevance * 100)}%)
   61                   </li>
   62                 ))}
   63               </ul>
   64             </div>
   65           )}
   66         </section>
   67       );
   68     } 
