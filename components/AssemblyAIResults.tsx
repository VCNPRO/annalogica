'use client';
import React from 'react';

type TranscriptProps = {
  transcript: {
    summary?: string;
    utterances?: { speaker: number; text: string }[];
    chapters?: { headline: string; summary: string; start: number; end: number }[];
    iab_categories_result?: {
      summary?: { label: string; relevance: number }[];
    };
  };
};

export default function AssemblyAIResults({ transcript }: TranscriptProps) {
  if (!transcript) return null;

  return (
    <section className="space-y-8">
      {transcript.summary && (
        <div>
          <h2 className="text-xl font-semibold">📝 Resumen</h2>
          <p className="text-gray-700">{transcript.summary}</p>
        </div>
      )}

      {transcript.utterances?.length && (
        <div>
          <h2 className="text-xl font-semibold">🗣️Intervinientes</h2>
          <ul className="list-disc pl-5">
            {transcript.utterances.map((u, i) => (
              <li key={i}>
                <strong>Speaker {u.speaker}:</strong> {u.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcript.chapters?.length && (
        <div>
          <h2 className="text-xl font-semibold">📚 Capítulos</h2>
          <ul className="list-disc pl-5">
            {transcript.chapters.map((c, i) => (
              <li key={i}>
                <strong>{c.headline}</strong> ({Math.round(c.start / 1000)}s – {Math.round(c.end / 1000)}s)
                <p>{c.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transcript.iab_categories_result?.summary?.length && (
        <div>
          <h2 className="text-xl font-semibold">🧠 Temas detectados</h2>
          <ul className="list-disc pl-5">
            {transcript.iab_categories_result.summary.map((t, i) => (
              <li key={i}>
                {t.label} ({Math.round(t.relevance * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}