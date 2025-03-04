'use client';

import { useState, useEffect, useRef } from 'react';
import YouTubeForm from '@/components/YouTubeForm';
import axios from 'axios';
import ThemeToggle from '@/components/ThemeToggle';

// Define the video history type
type AnalyzedVideo = {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  reliabilityScore: number | null;
  transcript: string | null;
  summary: string | null;
  goodAdvice: string[];
  badAdvice: string[];
  opinions: string[];
  analysis: string | null;
};

export default function Home() {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [goodAdvice, setGoodAdvice] = useState<string[]>([]);
  const [badAdvice, setBadAdvice] = useState<string[]>([]);
  const [opinions, setOpinions] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [reliabilityScore, setReliabilityScore] = useState<number | null>(null);
  const [videoHistory, setVideoHistory] = useState<AnalyzedVideo[]>([]);
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>('');
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  // Load video history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('videoHistory');
    if (savedHistory) {
      try {
        setVideoHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse video history:', e);
      }
    }
  }, []);

  // Save video history to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('videoHistory', JSON.stringify(videoHistory));
  }, [videoHistory]);

  // Extract YouTube video ID from URL
  const extractVideoId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  };

  // Fetch video title using YouTube API or oEmbed
  const fetchVideoTitle = async (videoId: string): Promise<string> => {
    try {
      const response = await axios.get(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      return response.data.title || 'Untitled Video';
    } catch (err) {
      console.error('Failed to fetch video title:', err);
      return 'Untitled Video';
    }
  };

  // Add a new function to load saved analysis results
  const loadSavedAnalysis = (video: AnalyzedVideo) => {
    // Set the current video details
    setCurrentVideoId(video.id);
    setCurrentVideoTitle(video.title);
    
    // Load the saved analysis data
    setTranscript(video.transcript);
    setSummary(video.summary);
    setGoodAdvice(video.goodAdvice || []);
    setBadAdvice(video.badAdvice || []);
    setOpinions(video.opinions || []);
    setAnalysis(video.analysis);
    setReliabilityScore(video.reliabilityScore);
    
    // Reset other states
    setError(null);
    setIsLoading(false);
    setIsTranscriptExpanded(false);
  };

  // Modify the handleSubmit function to save the complete analysis data
  const handleSubmit = async (youtubeUrl: string) => {
    // Keep the loading indicator visible but don't clear the existing content
    setIsLoading(true);
    setError(null);
    
    // We'll keep the current content visible while loading the new content
    try {
      // Extract video ID for history tracking
      const videoId = extractVideoId(youtubeUrl);
      
      // Check if this video already exists in the history
      const existingVideo = videoHistory.find(video => video.id === videoId);
      if (existingVideo) {
        // If it exists, just load the saved analysis data
        loadSavedAnalysis(existingVideo);
        return;
      }
      
      // Get video title in parallel with main analysis
      let videoTitle = 'Untitled Video';
      try {
        videoTitle = await fetchVideoTitle(videoId);
      } catch (e) {
        console.error('Failed to fetch video title:', e);
      }
      
      const response = await axios.post('/api/summarize', { youtubeUrl });
      
      // Process all data at once to keep it consistent
      const data = response.data;
      
      // Only set state if we received a complete and valid response
      if (data && data.transcript) {
        // Now that we have new data, update the state
        setCurrentVideoId(videoId);
        setCurrentVideoTitle(videoTitle);
        setTranscript(data.transcript);
        setSummary(data.summary || null);
        setGoodAdvice(data.goodAdvice || []);
        setBadAdvice(data.badAdvice || []);
        setOpinions(data.opinions || []);
        setIsTranscriptExpanded(false);
        
        // Process analysis text to remove reliability score references
        let analysisText = data.analysis || null;
        if (analysisText) {
          // Enhanced regex to catch more patterns of reliability score mentions
          analysisText = analysisText.replace(/\b(making it|with|has|giving it|resulting in) a[^.]*?\b(\d+%|\d+\s*percent)\b[^.]*?\breliability[^.]*?\./gi, '');
          // Also catch sentences that end with a reliability score
          analysisText = analysisText.replace(/\b(reliability score of|reliability rating of|reliability of) \d+%\s*\./gi, '');
          // Remove any remaining reliability score percentages
          analysisText = analysisText.replace(/\b(moderately|highly|generally) reliable source with a [^.]*?(\d+%|\d+\s*percent)\b[^.]*?\./gi, '');
          // Remove sentences starting with "The reliability score is"
          analysisText = analysisText.replace(/\bThe reliability score is[^.]*?\./gi, '');
          // Remove trailing whitespace
          analysisText = analysisText.trim();
        }
        setAnalysis(analysisText);
        
        // Ensure reliability score is a valid number between 0-100
        const score = data.reliabilityScore !== undefined ? 
          Number(data.reliabilityScore) : null;
        
        const scoreValue = score !== null && !isNaN(score) ? 
          Math.max(0, Math.min(100, Math.round(score))) : null;
        
        setReliabilityScore(scoreValue);
        
        // Add to history once we have all the data
        if (videoId && videoTitle) {
          // Create a new history item with the complete analysis data
          const newHistoryItem: AnalyzedVideo = {
            id: videoId,
            title: videoTitle,
            url: youtubeUrl,
            timestamp: Date.now(),
            reliabilityScore: scoreValue,
            transcript: data.transcript,
            summary: data.summary || null,
            goodAdvice: data.goodAdvice || [],
            badAdvice: data.badAdvice || [],
            opinions: data.opinions || [],
            analysis: analysisText
          };
          
          // Use functional update to ensure we work with latest state
          setVideoHistory(prevHistory => {
            // Find if this video ID already exists in the history
            const existingItemIndex = prevHistory.findIndex(item => item.id === videoId);
            
            // Create a new array to avoid mutation
            const updatedHistory = [...prevHistory];
            
            if (existingItemIndex >= 0) {
              // Remove the existing item
              updatedHistory.splice(existingItemIndex, 1);
            }
            
            // Add the new item at the beginning and limit to 10 items
            return [newHistoryItem, ...updatedHistory].slice(0, 10);
          });
        }
      } else {
        throw new Error('Incomplete data received from API');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || 'Failed to analyze video');
      } else {
        console.error('Error analyzing video:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const downloadText = (text: string, filename: string) => {
    const element = document.createElement('a');
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Helper function to format paragraphs
  const formatParagraphs = (text: string) => {
    if (!text) return null;
    
    // Split into sentences, then group into paragraphs (4-5 sentences per paragraph)
    const sentences = text.split(/(?<=[.!?])\s+/);
    const paragraphs = [];
    
    for (let i = 0; i < sentences.length; i += 4) {
      const paragraph = sentences.slice(i, i + 4).join(' ');
      if (paragraph) paragraphs.push(paragraph);
    }
    
    return paragraphs.map((para, idx) => (
      <p key={idx} className="mb-3">{para}</p>
    ));
  };

  // Function to determine score color based on score value
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  // Function to determine background color for the circle
  const getScoreBackgroundColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-blue-600';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Function to determine ring color for the circular progress
  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'ring-green-600';
    if (score >= 60) return 'ring-blue-600';
    if (score >= 40) return 'ring-yellow-500';
    if (score >= 20) return 'ring-orange-500';
    return 'ring-red-500';
  };

  // Function to generate a descriptive label for the score
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly Reliable';
    if (score >= 60) return 'Generally Reliable';
    if (score >= 40) return 'Mixed Reliability';
    if (score >= 20) return 'Questionable';
    return 'Unreliable';
  };

  const TooltipReliabilityScore = () => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const bottomArrowRef = useRef<HTMLDivElement>(null);
    const topArrowRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      const positionTooltip = () => {
        const el = tooltipRef.current;
        const bottomArrow = bottomArrowRef.current;
        const topArrow = topArrowRef.current;
        if (!el || !bottomArrow || !topArrow) return;
        
        const parentRect = el.parentElement?.getBoundingClientRect();
        if (!parentRect) return;
        
        // Check if tooltip would be cut off at top of screen
        const tooltipHeight = el.offsetHeight;
        const topSpace = parentRect.top;
        
        // Position tooltip to the right of the score circle
        el.style.left = 'calc(100% + 20px)';
        el.style.bottom = '0';
        el.style.top = '0';
        el.style.transform = 'none';
        
        // Show bottom arrow by default
        bottomArrow.style.display = 'block';
        topArrow.style.display = 'none';
      };
      
      // Position initially and on resize
      positionTooltip();
      window.addEventListener('resize', positionTooltip);
      
      return () => {
        window.removeEventListener('resize', positionTooltip);
      };
    }, []);
    
    return (
      <>
        <div 
          ref={tooltipRef}
          className="absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 w-96 max-w-[90vw] bg-[rgb(var(--card-bg-rgb))] shadow-xl rounded-lg border border-[rgb(var(--card-border-rgb))] p-5"
          style={{
            margin: 'auto',
            height: 'fit-content'
          }}
        >
          <div className="flex flex-col md:flex-row gap-4 lg:gap-8">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">How to interpret</h3>
              <ul className="text-sm">
                <li className="mb-1"><span className="font-semibold text-green-600">80-100%:</span> Very reliable</li>
                <li className="mb-1"><span className="font-semibold text-blue-600">60-79%:</span> Generally reliable</li>
                <li className="mb-1"><span className="font-semibold text-yellow-600">40-59%:</span> Somewhat reliable</li>
                <li className="mb-1"><span className="font-semibold text-orange-500">20-39%:</span> Questionable</li>
                <li><span className="font-semibold text-red-600">0-19%:</span> Unreliable</li>
              </ul>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">How it's calculated</h3>
              <p className="text-sm">
                <span className="font-semibold">Positive factors:</span> Citations, expert consensus, evidence-based claims<br />
                <span className="font-semibold">Negative factors:</span> Unverified claims, contradictions, misleading content
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom arrow (when tooltip is above) */}
        <div 
          ref={bottomArrowRef}
          className="absolute h-3 w-3 bg-[rgb(var(--card-bg-rgb))] transform rotate-45 z-40" 
          style={{ 
            bottom: '50%',
            right: '-1.5px',
            borderTop: '1px solid rgba(var(--card-border-rgb), 1)', 
            borderRight: '1px solid rgba(var(--card-border-rgb), 1)',
          }}
        ></div>
        
        {/* Top arrow (when tooltip is below) */}
        <div 
          ref={topArrowRef}
          className="absolute h-3 w-3 bg-[rgb(var(--card-bg-rgb))] transform rotate-45 z-40" 
          style={{ 
            top: '50%',
            right: '-1.5px',
            borderBottom: '1px solid rgba(var(--card-border-rgb), 1)', 
            borderRight: '1px solid rgba(var(--card-border-rgb), 1)',
            display: 'none',
          }}
        ></div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))] flex flex-col">
      <header className="bg-[rgb(var(--card-bg-rgb))] border-b border-[rgb(var(--card-border-rgb))] shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center">
            <div className="flex items-center">
              {/* YouTube Logo */}
              <svg className="w-8 h-8 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path className="text-red-600" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor"/>
              </svg>
              <h1 className="text-xl font-bold text-[rgb(var(--foreground-rgb))]">YouTube Video Analyzer</h1>
            </div>
            <div className="ml-auto flex items-center space-x-6">
              <a href="/about" className="text-sm text-[rgb(var(--foreground-rgb))] opacity-75 hover:text-[rgb(var(--accent-rgb))] font-medium">About</a>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left sidebar for input form and video history */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))] mb-4">
            <div className="border-b border-[rgb(var(--card-border-rgb))] px-4 py-2 bg-[rgb(var(--card-header-bg-rgb))]">
              <h2 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Video Content</h2>
            </div>
            <div className="p-4">
              <YouTubeForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
          
          {/* Video history section */}
          <div className="bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))] flex-1">
            <div className="border-b border-[rgb(var(--card-border-rgb))] px-4 py-2 bg-[rgb(var(--card-header-bg-rgb))]">
              <h2 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Recently Analyzed</h2>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(100vh-260px)]">
              {videoHistory.length > 0 ? (
                <ul className="space-y-2">
                  {videoHistory.map((video) => (
                    <li 
                      key={video.id + video.timestamp} 
                      className="text-sm border-b last:border-0 border-[rgba(var(--card-border-rgb),0.5)] pb-2"
                    >
                      <button 
                        onClick={() => loadSavedAnalysis(video)}
                        className="text-left w-full hover:bg-[rgba(var(--card-border-rgb),0.1)] p-1 rounded transition-colors"
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-2 mt-1">
                            <img 
                              src={`https://i.ytimg.com/vi/${video.id}/default.jpg`} 
                              alt="" 
                              className="w-12 h-9 object-cover rounded"
                            />
                          </div>
                          <div>
                            <p className="font-medium line-clamp-2">{video.title}</p>
                            <div className="flex items-center mt-1">
                              {video.reliabilityScore !== null && (
                                <span 
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mr-1 ${
                                    video.reliabilityScore >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    video.reliabilityScore >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                    video.reliabilityScore >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    video.reliabilityScore >= 20 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}
                                >
                                  <span>{video.reliabilityScore}%</span>
                                </span>
                              )}
                              <span className="text-xs text-[rgb(var(--foreground-rgb))] opacity-60">
                                {new Date(video.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm italic text-[rgb(var(--foreground-rgb))] opacity-50 text-center py-4">
                  No videos analyzed yet
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col gap-5">
          {isLoading && (
            <div className="mb-4">
              <div className="w-full bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))] p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="h-4 w-4 bg-[rgb(var(--accent-rgb))] rounded-full flex items-center justify-center">
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Analyzing New Video...</h3>
                </div>
                <p className="text-sm text-[rgb(var(--foreground-rgb))] opacity-70">Please wait while we analyze your video. Current content will remain visible until new results are ready.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <div className="w-full bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))] p-4 border-l-4 border-red-500">
                <div className="flex items-center space-x-2 mb-1">
                  <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Error</h3>
                </div>
                <p className="text-red-400 text-sm">{error}</p>
                <p className="mt-1 text-[rgb(var(--foreground-rgb))] opacity-60 text-xs">
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
            </div>
          )}

          {/* Always maintain layout with minimal content shift */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-5 min-h-[300px]">
            {summary ? (
              <>
                {currentVideoTitle && (
                  <div className="bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))] mb-5 lg:col-span-2">
                    <div className="p-4 flex items-center">
                      {currentVideoId && (
                        <img 
                          src={`https://i.ytimg.com/vi/${currentVideoId}/mqdefault.jpg`} 
                          alt={currentVideoTitle}
                          className="w-28 h-auto mr-4 rounded"
                        />
                      )}
                      <div>
                        <h2 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">{currentVideoTitle}</h2>
                        <a 
                          href={`https://www.youtube.com/watch?v=${currentVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-600 hover:underline"
                        >
                          View on YouTube
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              
                <div className="w-full bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))]">
                  <div className="border-b border-[rgb(var(--card-border-rgb))] px-4 py-2 bg-[rgb(var(--card-header-bg-rgb))] flex justify-between items-center">
                    <h3 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Video Summary</h3>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => copyToClipboard(summary)}
                        className="inline-flex items-center justify-center h-7 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-[rgb(var(--foreground-rgb))] leading-relaxed max-h-[35vh] overflow-y-auto">
                      {formatParagraphs(summary)}
                    </div>
                  </div>
                </div>

                {reliabilityScore !== null && (
                  <div className="w-full bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))]">
                    <div className="border-b border-[rgb(var(--card-border-rgb))] px-4 py-2 bg-[rgb(var(--card-header-bg-rgb))]">
                      <h3 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Video Reliability Score</h3>
                    </div>
                    <div className="p-5 flex justify-center">
                      <div className="flex flex-col items-center py-4">
                        <div className="relative group">
                          <div className={`w-48 h-48 rounded-full flex items-center justify-center ${getScoreBackgroundColor(reliabilityScore)} shadow-lg`}>
                            <span className="text-5xl font-bold text-white">
                              {Math.round(reliabilityScore)}%
                            </span>
                          </div>
                          
                          <p className="text-lg font-medium mt-4 mb-1 text-center">{getScoreLabel(reliabilityScore)}</p>
                          <div className="text-xs text-gray-500 mt-1 text-center">
                            Hover for details
                          </div>
                          
                          <TooltipReliabilityScore />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : !isLoading && !error ? (
              <div className="lg:col-span-2 text-center p-8 flex flex-col items-center justify-center">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-[rgb(var(--foreground-rgb))] mb-2">No Video Analyzed Yet</h3>
                <p className="text-sm text-[rgb(var(--foreground-rgb))] opacity-70 max-w-md mx-auto">
                  Enter a YouTube URL in the form to the left to analyze the content for reliability and factual accuracy.
                </p>
              </div>
            ) : null}
          </div>
          
          {summary && !isLoading && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                <div className="bg-[rgb(var(--good-advice-bg-rgb))] rounded shadow-sm border border-[rgb(var(--good-advice-border-rgb))] overflow-hidden">
                  <div className="border-b border-[rgb(var(--good-advice-border-rgb))] px-4 py-2 bg-[rgba(var(--good-advice-border-rgb),0.2)]">
                    <h3 className="text-base font-semibold text-green-900 dark:text-green-100">Good Advice</h3>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-[rgb(var(--foreground-rgb))] space-y-2 max-h-[25vh] overflow-y-auto">
                      {goodAdvice.length > 0 ? (
                        goodAdvice.map((advice, index) => (
                          <p key={index} className="flex items-start">
                            <svg className="h-3.5 w-3.5 text-green-500 mr-1.5 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{advice}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm italic text-[rgb(var(--foreground-rgb))] opacity-50">No clear good advice identified.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-[rgb(var(--bad-advice-bg-rgb))] rounded shadow-sm border border-[rgb(var(--bad-advice-border-rgb))] overflow-hidden">
                  <div className="border-b border-[rgb(var(--bad-advice-border-rgb))] px-4 py-2 bg-[rgba(var(--bad-advice-border-rgb),0.2)]">
                    <h3 className="text-base font-semibold text-red-900 dark:text-red-100">Questionable Advice</h3>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-[rgb(var(--foreground-rgb))] space-y-2 max-h-[25vh] overflow-y-auto">
                      {badAdvice.length > 0 ? (
                        badAdvice.map((advice, index) => (
                          <p key={index} className="flex items-start">
                            <svg className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>{advice}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm italic text-[rgb(var(--foreground-rgb))] opacity-50">No questionable advice identified.</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-[rgb(var(--opinion-bg-rgb))] rounded shadow-sm border border-[rgb(var(--opinion-border-rgb))] overflow-hidden">
                  <div className="border-b border-[rgb(var(--opinion-border-rgb))] px-4 py-2 bg-[rgba(var(--opinion-border-rgb),0.2)]">
                    <h3 className="text-base font-semibold text-[rgb(var(--foreground-rgb))]">Opinions</h3>
                  </div>
                  <div className="p-5">
                    <div className="text-sm text-[rgb(var(--foreground-rgb))] space-y-2 max-h-[25vh] overflow-y-auto">
                      {opinions.length > 0 ? (
                        opinions.map((opinion, index) => (
                          <p key={index} className="flex items-start">
                            <svg className="h-3.5 w-3.5 text-[rgb(var(--foreground-rgb))] opacity-50 mr-1.5 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{opinion}</span>
                          </p>
                        ))
                      ) : (
                        <p className="text-sm italic text-[rgb(var(--foreground-rgb))] opacity-50">No clear opinions identified.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {transcript && (
                <div className="mb-4">
                  <div className="w-full bg-[rgb(var(--card-bg-rgb))] rounded shadow-sm border border-[rgb(var(--card-border-rgb))]">
                    <div className="border-b border-[rgb(var(--card-border-rgb))] px-4 py-2 bg-[rgb(var(--card-header-bg-rgb))] flex justify-between items-center">
                      <button 
                        onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                        className="text-base font-semibold text-[rgb(var(--foreground-rgb))] flex items-center w-full justify-between"
                      >
                        <span>Video Full Transcript</span>
                        <svg 
                          className={`h-4 w-4 transform transition-transform ${isTranscriptExpanded ? 'rotate-180' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => copyToClipboard(transcript)}
                          className="inline-flex items-center justify-center h-7 px-3 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Copy
                        </button>
                        <button 
                          onClick={() => downloadText(transcript, 'transcript.txt')}
                          className="inline-flex items-center justify-center h-7 px-3 text-xs font-medium rounded bg-[rgba(var(--foreground-rgb),0.1)] text-[rgb(var(--foreground-rgb))] border border-[rgba(var(--foreground-rgb),0.2)] hover:bg-[rgba(var(--foreground-rgb),0.15)] transition-colors shadow-sm"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                    {isTranscriptExpanded && (
                      <div className="p-5">
                        <div className="text-sm text-[rgb(var(--foreground-rgb))] leading-relaxed max-h-80 overflow-y-auto">
                          {formatParagraphs(transcript)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      
      <footer className="border-t border-[rgb(var(--card-border-rgb))] bg-[rgb(var(--card-bg-rgb))] mt-auto py-3">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-[rgb(var(--foreground-rgb))] opacity-60 text-center">
            YouTube Video Analyzer © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
