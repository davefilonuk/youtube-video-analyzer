'use client';

import { useState } from 'react';

interface YouTubeFormProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function YouTubeForm({ onSubmit, isLoading }: YouTubeFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    // Normalize the URL
    let normalizedUrl = url.trim();
    
    // Try to extract video ID using different YouTube URL patterns
    let videoId = null;
    
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = normalizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/e\/|youtube\.com\/user\/[^\/]+\/[^\/]+\/|youtube\.com\/[^\/]+\/[^\/]+\/|youtube\.com\/attribution_link\?.*v%3D|youtube-nocookie\.com\/watch\?v=|youtube\.com\/shorts\/)([^&?\/\s]{11})/);
    
    // Short URL: https://youtu.be/VIDEO_ID
    const shortMatch = normalizedUrl.match(/youtu\.be\/([^&?\/\s]{11})/);
    
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = normalizedUrl.match(/youtube\.com\/embed\/([^&?\/\s]{11})/);
    
    if (watchMatch) videoId = watchMatch[1];
    else if (shortMatch) videoId = shortMatch[1];
    else if (embedMatch) videoId = embedMatch[1];
    
    // If we found a video ID, construct a standard URL
    if (videoId && videoId.length === 11) {
      normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
      setError('');
      onSubmit(normalizedUrl);
    } else {
      setError('Please enter a valid YouTube URL');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[rgb(var(--foreground-rgb))]">Verify a Video!</h2>
          <p className="mt-2 text-[rgb(var(--foreground-rgb))] opacity-70">Enter a youtube video url and click analyze to verify the contents</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-grow">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <input
                type="text"
                id="youtube-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full pl-10 pr-10 py-2 text-[rgb(var(--foreground-rgb))] bg-[rgba(var(--foreground-rgb),0.05)] border border-[rgb(var(--card-border-rgb))] rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                disabled={isLoading}
              />
              {url && !isLoading && (
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--foreground-rgb))] opacity-50 hover:opacity-100"
                  onClick={() => setUrl('')}
                  aria-label="Clear input"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </div>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 