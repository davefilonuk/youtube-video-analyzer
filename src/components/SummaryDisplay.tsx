'use client';

interface SummaryDisplayProps {
  summary: string | null;
  error: string | null;
  isLoading: boolean;
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

export default function SummaryDisplay({ summary, error, isLoading }: SummaryDisplayProps) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Generating Summary...</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-gray-200 rounded-full w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded-full w-full"></div>
          <div className="h-3 bg-gray-200 rounded-full w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Error</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <p className="mt-2 text-gray-600 text-xs">
          {error.includes('no meaningful content') ? (
            <>
              This video may contain mostly music or non-verbal content. Try a video with more spoken content.
            </>
          ) : (
            <>
              This could be due to missing captions on the video, an invalid URL, or an issue with the API.
            </>
          )}
        </p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Decode HTML entities in the summary
  const decodedSummary = typeof window !== 'undefined' ? decodeHtmlEntities(summary) : summary;
  
  // Check if summary is empty or only contains whitespace
  if (!decodedSummary.trim()) {
    return (
      <div className="w-full bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
        <div className="flex items-center space-x-2 mb-2">
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">No Summary Available</h3>
        </div>
        <p className="text-sm text-gray-700">
          We couldn't generate a summary for this video. It may contain mostly music or non-verbal content.
        </p>
      </div>
    );
  }

  // Split by sentences for better readability
  const sentences = decodedSummary.split(/(?<=[.!?])\s+/);

  return (
    <div className="w-full bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800">Video Summary</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="text-sm text-gray-700 leading-relaxed">
          {sentences.map((sentence, index) => {
            const trimmedSentence = sentence.trim();
            if (!trimmedSentence) return null;
            
            return (
              <p key={index} className="mb-2">
                {trimmedSentence + (trimmedSentence.match(/[.!?]$/) ? '' : '.')}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
} 