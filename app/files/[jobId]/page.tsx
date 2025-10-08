'use client';

// Minimal component for debugging build error

interface FileDetailsPageProps {
  params: { jobId: string };
}

export default function FileDetailsPage({ params }: FileDetailsPageProps) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'white', background: 'black', minHeight: '100vh' }}>
      <h1>Página de Detalle del Trabajo</h1>
      <p>Si ves esto, la compilación ha funcionado.</p>
      <p>Job ID: {params.jobId}</p>
    </div>
  );
}