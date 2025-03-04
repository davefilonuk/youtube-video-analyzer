'use client';

interface TranscriptDisplayProps {
  transcript: string;
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export default function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  // Decode HTML entities in the transcript
  const decodedTranscript = typeof window !== 'undefined' ? decodeHtmlEntities(transcript) : transcript;
  
  // Split by sentences for better readability
  const sentences = decodedTranscript.split(/(?<=[.!?])\s+/);

  return (
    <div className="w-full bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Full Transcript</h3>
      </div>
      <div className="p-5">
        <div className="text-sm text-gray-700 leading-relaxed">
          {sentences.map((sentence, index) => {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) return null;
            
            return (
              <span key={index}>
                {trimmedSentence + (trimmedSentence.match(/[.!?]$/) ? ' ' : '. ')}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
} 