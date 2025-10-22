import AudioUpload from '@/components/AudioUpload';

export default function TestAudioPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Transcripción de Audio
          </h1>
          <p className="text-gray-600">
            Sube un archivo de audio y obtén transcripción automática
          </p>
        </div>

        <AudioUpload />
      </div>
    </div>
  );
}
