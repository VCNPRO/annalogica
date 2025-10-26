
// Mock external dependencies
jest.mock('@/lib/inngest/client', () => ({
  inngest: {
    createFunction: jest.fn((config, trigger, handler) => handler),
  },
}));

const mockOpenAI = {
  audio: {
    transcriptions: {
      create: jest.fn(),
    },
  },
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockOpenAI),
}));

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}));

jest.mock('@/lib/db/transcriptions', () => ({
  updateTranscriptionProgress: jest.fn(),
  saveTranscriptionResults: jest.fn(),
  markTranscriptionError: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  TranscriptionJobDB: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/error-tracker', () => ({
  trackError: jest.fn(),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Inngest Function: transcribeFile', () => {
  let transcribeFile;
  let TranscriptionJobDB, put, updateTranscriptionProgress, saveTranscriptionResults, markTranscriptionError, trackError;

  beforeEach(() => {
    // Set env var and reset modules before each test to ensure clean state
    process.env.OPENAI_API_KEY = 'test-key';
    jest.resetModules();

    // Re-require modules to get fresh versions with the new env var
    transcribeFile = require('./transcribe-audio.js').default;
    TranscriptionJobDB = require('@/lib/db').TranscriptionJobDB;
    put = require('@vercel/blob').put;
    updateTranscriptionProgress = require('@/lib/db/transcriptions').updateTranscriptionProgress;
    saveTranscriptionResults = require('@/lib/db/transcriptions').saveTranscriptionResults;
    markTranscriptionError = require('@/lib/db/transcriptions').markTranscriptionError;
    trackError = require('@/lib/error-tracker').trackError;

    // Clear mocks after re-requiring
    jest.clearAllMocks();
  });

  it('should successfully transcribe, analyze, and save results for a job', async () => {
    // 1. ARRANGE
    const mockJobId = 'job-123';
    const mockEvent = {
      data: { jobId: mockJobId },
    };

    TranscriptionJobDB.findById.mockResolvedValue({
      id: mockJobId,
      audio_url: 'https://fake-blob.com/audio.mp3',
      filename: 'test-audio.mp3',
      user_id: 'user-abc',
      metadata: { summaryType: 'detailed' },
    });

    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'audio/mpeg']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });

    mockOpenAI.audio.transcriptions.create.mockResolvedValue({
      text: 'This is a test transcription.',
      duration: 120,
      segments: [{ start: 0, end: 2, text: 'This is' }, { start: 2, end: 4, text: ' a test transcription.' }],
    });

    mockOpenAI.chat.completions.create
      .mockResolvedValueOnce({ // Speakers
        choices: [{ message: { content: JSON.stringify({ speakers: [{ name: 'Speaker 1', role: 'Interviniente' }] }) } }],
      })
      .mockResolvedValueOnce({ // Summary
        choices: [{ message: { content: 'This is a detailed summary.' } }],
      })
      .mockResolvedValueOnce({ // Tags
        choices: [{ message: { content: JSON.stringify({ tags: ['test', 'audio'] }) } }],
      });

    put.mockResolvedValue({ url: 'https://fake-blob.com/generated-file.txt' });

    const step = { run: jest.fn((name, fn) => fn()) };

    // 2. ACT
    const result = await transcribeFile({ event: mockEvent, step });

    // 3. ASSERT
    expect(result).toEqual({ success: true, jobId: mockJobId, duration: 120 });
    expect(TranscriptionJobDB.findById).toHaveBeenCalledWith(mockJobId);
    expect(updateTranscriptionProgress).toHaveBeenCalledWith(mockJobId, expect.any(Number));
    expect(saveTranscriptionResults).toHaveBeenCalledWith(mockJobId, expect.any(Object));
    expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalled();
    expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
    expect(put).toHaveBeenCalledTimes(5);
    expect(markTranscriptionError).not.toHaveBeenCalled();
    expect(trackError).not.toHaveBeenCalled();
  });

  it('should handle errors during transcription and mark the job as failed', async () => {
    // 1. ARRANGE
    const mockJobId = 'job-456';
    const mockEvent = {
      data: { jobId: mockJobId },
    };
    const errorMessage = 'Whisper API failed';

    TranscriptionJobDB.findById.mockResolvedValue({
      id: mockJobId,
      audio_url: 'https://fake-blob.com/audio.mp3',
      filename: 'test-audio.mp3',
      user_id: 'user-abc',
    });

    global.fetch.mockResolvedValue({
      ok: true,
      headers: new Map([['content-type', 'audio/mpeg']]),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    mockOpenAI.audio.transcriptions.create.mockRejectedValue(new Error(errorMessage));

    const step = { run: jest.fn((name, fn) => fn()) };

    // 2. ACT & 3. ASSERT
    await expect(transcribeFile({ event: mockEvent, step })).rejects.toThrow(errorMessage);
    expect(markTranscriptionError).toHaveBeenCalledWith(mockJobId, errorMessage);
    expect(trackError).toHaveBeenCalledWith(
      'transcription_error',
      'critical',
      errorMessage,
      expect.any(Error),
      expect.any(Object)
    );
    expect(saveTranscriptionResults).not.toHaveBeenCalled();
  });
});
