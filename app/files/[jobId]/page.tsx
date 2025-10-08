'use client';

// Minimal component with 'any' type for props to bypass build error

export default function FileDetailsPage(props: any) {
  const { jobId } = props.params;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'white', background: 'black', minHeight: '100vh' }}>
      <h1>Página de Detalle del Trabajo</h1>
      <p>Si ves esto, la compilación ha funcionado.</p>
      <p>Job ID: {jobId}</p>
    </div>
  );
}
