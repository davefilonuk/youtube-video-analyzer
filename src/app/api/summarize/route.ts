import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

// Initialize OpenAI client (only if API key is available)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Flag to determine if we should use OpenAI or local analysis
const USE_OPENAI = true; // Set to false to use local analysis instead

export async function POST(request: NextRequest) {
  try {
    const { youtubeUrl } = await request.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Extract video ID from YouTube URL
    const videoId = extractVideoId(youtubeUrl);
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Fetch transcript
    const transcript = await fetchTranscript(videoId);
    
    if (!transcript) {
      return NextResponse.json(
        { error: 'Could not fetch transcript for this video. The video may not have captions available.' },
        { status: 404 }
      );
    }

    if (transcript.trim() === '') {
      return NextResponse.json(
        { error: 'The transcript contains no meaningful content to analyze' },
        { status: 422 }
      );
    }

    // Analyze the transcript (using OpenAI if available and enabled, otherwise local analysis)
    let analysisResult;
    if (USE_OPENAI && openai) {
      try {
        analysisResult = await analyzeWithAI(transcript);
      } catch (error) {
        console.error('Error analyzing with AI:', error);
        // Fallback to local analysis if AI fails
        analysisResult = analyzeLocally(transcript);
      }
    } else {
      analysisResult = analyzeLocally(transcript);
    }

    // Calculate reliability score
    const reliabilityScore = calculateReliabilityScore(
      analysisResult.goodAdvice.length,
      analysisResult.badAdvice.length,
      analysisResult.opinions.length
    );

    return NextResponse.json({ 
      transcript: transcript,
      summary: analysisResult.summary,
      goodAdvice: analysisResult.goodAdvice,
      badAdvice: analysisResult.badAdvice,
      opinions: analysisResult.opinions,
      analysis: analysisResult.analysis,
      reliabilityScore: reliabilityScore
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again with a different video.' },
      { status: 500 }
    );
  }
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;#39;/g, "'");
}

// Fetch transcript from YouTube
async function fetchTranscript(videoId: string): Promise<string> {
  try {
    const transcriptResponse = await YoutubeTranscript.fetchTranscript(videoId);
    
    // Filter out non-informative segments like [Music], [Applause], etc.
    const filteredSegments = transcriptResponse.filter((item: { text: string }) => {
      const text = item.text.trim();
      // Skip segments that only contain non-informative content
      return !(
        text === '[Music]' || 
        text === '[Applause]' || 
        text === '[Laughter]' ||
        text === '[Silence]' ||
        text === '[Background Noise]' ||
        text === '[Inaudible]' ||
        /^\[.*\]$/.test(text) // Any text that is just [Something]
      );
    });
    
    // If after filtering we have no content, return empty string
    if (filteredSegments.length === 0) {
      return '';
    }
    
    // Process the remaining segments
    return filteredSegments.map((item: { text: string }) => {
      let text = decodeHtmlEntities(item.text.trim());
      
      // Remove any remaining [tags] within the text
      text = text.replace(/\[.*?\]/g, '').trim();
      
      // Skip empty segments after processing
      if (!text) return '';
      
      // Add period if the segment doesn't end with punctuation
      if (text && !text.match(/[.!?]$/)) {
        text += '.';
      }
      return text;
    })
    .filter(text => text.length > 0) // Remove any empty strings
    .join(' ');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Failed to fetch transcript');
  }
}

// Local analysis function that doesn't require OpenAI
function analyzeLocally(transcript: string): {
  summary: string;
  goodAdvice: string[];
  badAdvice: string[];
  opinions: string[];
  analysis: string;
} {
  // Truncate transcript if it's too long
  const maxLength = 15000;
  const truncatedTranscript = transcript.length > maxLength 
    ? transcript.substring(0, maxLength) + "... (transcript truncated due to length)"
    : transcript;

  // Split transcript into sentences
  const sentences = truncatedTranscript.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
  
  // Generate summary using TextRank-inspired algorithm
  const summary = generateSummary(sentences);
  
  // Extract potential advice and opinions
  const { goodAdvice, badAdvice, opinions } = categorizeContent(sentences);
  
  // Generate a simple analysis
  const analysis = generateAnalysis(sentences, goodAdvice, badAdvice, opinions);
  
  return {
    summary,
    goodAdvice,
    badAdvice,
    opinions,
    analysis
  };
}

// Function to generate a summary using a simplified TextRank approach
function generateSummary(sentences: string[]): string {
  // If we have very few sentences, just join them all
  if (sentences.length <= 5) {
    return sentences.join(' ');
  }
  
  // Calculate word frequency
  const wordFrequency: Record<string, number> = {};
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'like', 
    'through', 'over', 'before', 'after', 'between', 'under', 'during',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her',
    'its', 'our', 'their', 'this', 'that', 'these', 'those', 'just', 'going',
    'really', 'very', 'so', 'actually', 'basically', 'literally', 'got', 'get',
    'im', "i'm", "youre", "you're", "theyre", "they're", "ive", "i've",
    "weve", "we've", "theyve", "they've", "dont", "don't", "cant", "can't"
  ]);
  
  sentences.forEach(sentence => {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
  });
  
  // Score sentences based on word frequency and position
  const sentenceScores = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/\b\w+\b/g) || [];
    let score = 0;
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        score += wordFrequency[word] || 0;
      }
    });
    
    // Give higher scores to sentences at the beginning and end of the transcript
    // These often contain important introductory or concluding information
    const positionBonus = 
      index < sentences.length * 0.2 ? 2 : // First 20% of sentences
      index > sentences.length * 0.8 ? 1.5 : // Last 20% of sentences
      1; // Middle sentences
    
    // Longer sentences often contain more information
    const lengthFactor = Math.min(1.5, words.length / 10);
    
    return { 
      sentence, 
      score: words.length > 0 ? (score / words.length) * positionBonus * lengthFactor : 0,
      originalIndex: index 
    };
  });
  
  // Sort sentences by score and select top ones
  const topSentences = [...sentenceScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(15, Math.ceil(sentences.length * 0.2))); // Take top 20% or at most 15 sentences
  
  // Sort back to original order
  const orderedTopSentences = [...topSentences]
    .sort((a, b) => a.originalIndex - b.originalIndex)
    .map(item => item.sentence);
  
  // Group sentences into paragraphs (3-4 sentences per paragraph)
  const paragraphs = [];
  
  // Create an introduction paragraph
  const introSentences = orderedTopSentences.filter((sentence) => {
    const item = sentenceScores.find(s => s.sentence === sentence);
    return item && item.originalIndex < sentences.length * 0.2;
  }).slice(0, 3);
  
  // Create a body paragraph
  const bodySentences = orderedTopSentences.filter((sentence) => {
    const item = sentenceScores.find(s => s.sentence === sentence);
    return item && item.originalIndex >= sentences.length * 0.2 && item.originalIndex <= sentences.length * 0.8;
  }).slice(0, 6);
  
  // Create a conclusion paragraph
  const conclusionSentences = orderedTopSentences.filter((sentence) => {
    const item = sentenceScores.find(s => s.sentence === sentence);
    return item && item.originalIndex > sentences.length * 0.8;
  }).slice(0, 3);
  
  // Add paragraphs if they contain sentences
  if (introSentences.length > 0) {
    paragraphs.push(introSentences.join(' '));
  }
  
  if (bodySentences.length > 0) {
    // Split body into 2 paragraphs if it's long enough
    if (bodySentences.length > 3) {
      const midpoint = Math.floor(bodySentences.length / 2);
      paragraphs.push(bodySentences.slice(0, midpoint).join(' '));
      paragraphs.push(bodySentences.slice(midpoint).join(' '));
    } else {
      paragraphs.push(bodySentences.join(' '));
    }
  }
  
  if (conclusionSentences.length > 0) {
    paragraphs.push(conclusionSentences.join(' '));
  }
  
  return paragraphs.join('\n\n');
}

// Function to categorize content into advice and opinions
function categorizeContent(sentences: string[]): {
  goodAdvice: string[];
  badAdvice: string[];
  opinions: string[];
} {
  const goodAdvice: string[] = [];
  const badAdvice: string[] = [];
  const opinions: string[] = [];
  
  // Keywords that might indicate advice
  const adviceKeywords = [
    'should', 'recommend', 'advice', 'tip', 'suggestion', 'best practice',
    'important to', 'make sure', 'always', 'never', 'don\'t', 'do not',
    'need to', 'must', 'have to', 'better to', 'try to', 'ensure', 'avoid',
    'remember to', 'focus on', 'consider', 'be sure to', 'key is to',
    'crucial to', 'essential to', 'recommended', 'advised', 'suggested'
  ];
  
  // Keywords that might indicate questionable advice
  const questionableKeywords = [
    'always', 'never', 'everyone', 'nobody', 'guaranteed', 'miracle',
    'instant', 'easy', 'simple', 'quick', 'effortless', 'magic',
    'secret', 'trick', 'hack', '100%', 'absolutely', 'completely',
    'perfect', 'foolproof', 'ultimate', 'best ever', 'only way',
    'impossible', 'definitely', 'undoubtedly', 'without fail',
    'every time', 'all the time', 'no exceptions'
  ];
  
  // Keywords that might indicate opinions
  const opinionKeywords = [
    'i think', 'i believe', 'in my opinion', 'i feel', 'personally',
    'from my perspective', 'i would say', 'i consider', 'i find',
    'seems to me', 'appears to be', 'might be', 'could be', 'may be',
    'i prefer', 'i like', 'i love', 'i hate', 'i dislike', 'i enjoy',
    'for me', 'in my experience', 'i tend to', 'i usually', 'i often',
    'i rarely', 'i never', 'i always', 'i sometimes', 'i guess',
    'i suppose', 'i assume', 'i imagine', 'i suspect', 'i doubt',
    'i wonder', 'i hope', 'i wish', 'i expect', 'i anticipate'
  ];
  
  // Topic-specific advice patterns (for common YouTube topics)
  const topicAdvicePatterns = {
    technology: [
      /upgrade (your|the) (?:\w+)/i,
      /install (?:\w+)/i,
      /configure (?:\w+)/i,
      /settings? for (?:\w+)/i,
      /how to (?:use|setup|configure) (?:\w+)/i
    ],
    finance: [
      /invest in (?:\w+)/i,
      /save (?:money|funds)/i,
      /budget for (?:\w+)/i,
      /financial (?:planning|strategy)/i,
      /retirement (?:planning|savings)/i
    ],
    health: [
      /(?:eat|consume) (?:more|less) (?:\w+)/i,
      /exercise (?:regularly|daily|weekly)/i,
      /(?:avoid|reduce) (?:\w+)/i,
      /healthy (?:habits|lifestyle|choices)/i,
      /medical (?:advice|treatment|care)/i
    ],
    education: [
      /study (?:techniques|methods|strategies)/i,
      /learn (?:how to|about) (?:\w+)/i,
      /practice (?:\w+)/i,
      /educational (?:resources|materials)/i,
      /teaching (?:methods|strategies)/i
    ]
  };
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    let categorized = false;
    
    // Check for opinion indicators first
    if (opinionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      opinions.push(sentence);
      categorized = true;
    }
    
    if (!categorized) {
      // Check for advice indicators
      const containsAdviceKeyword = adviceKeywords.some(keyword => 
        lowerSentence.includes(keyword)
      );
      
      // Check for topic-specific advice patterns
      const matchesTopicPattern = Object.values(topicAdvicePatterns).some(patterns => 
        patterns.some(pattern => pattern.test(sentence))
      );
      
      if (containsAdviceKeyword || matchesTopicPattern) {
        // Check if it might be questionable advice
        const containsQuestionableKeyword = questionableKeywords.some(keyword => 
          lowerSentence.includes(keyword) && 
          // Avoid false positives with common phrases
          !lowerSentence.includes('not always') &&
          !lowerSentence.includes('not never') &&
          !lowerSentence.includes('not completely') &&
          !lowerSentence.includes('not 100%')
        );
        
        // Check for red flags in health/finance advice
        const containsHealthWarning = 
          (lowerSentence.includes('health') || lowerSentence.includes('medical')) && 
          (lowerSentence.includes('cure') || lowerSentence.includes('treatment') || 
           lowerSentence.includes('remedy') || lowerSentence.includes('heal'));
        
        const containsFinanceWarning = 
          (lowerSentence.includes('money') || lowerSentence.includes('invest') || 
           lowerSentence.includes('financial') || lowerSentence.includes('wealth')) && 
          (lowerSentence.includes('guaranteed') || lowerSentence.includes('risk-free') || 
           lowerSentence.includes('double your') || lowerSentence.includes('triple your'));
        
        if (containsQuestionableKeyword || containsHealthWarning || containsFinanceWarning) {
          badAdvice.push(sentence);
        } else {
          goodAdvice.push(sentence);
        }
        
        categorized = true;
      }
    }
    
    // Check for strong opinions that weren't caught by keywords
    if (!categorized && 
        (lowerSentence.includes('best') || 
         lowerSentence.includes('worst') || 
         lowerSentence.includes('favorite') || 
         lowerSentence.includes('love') || 
         lowerSentence.includes('hate'))) {
      opinions.push(sentence);
    }
  });
  
  // Limit the number of items in each category
  return {
    goodAdvice: goodAdvice.slice(0, 10),
    badAdvice: badAdvice.slice(0, 10),
    opinions: opinions.slice(0, 10)
  };
}

// Function to calculate a reliability score based on the ratio of good advice to bad advice and opinions
function calculateReliabilityScore(goodAdviceCount: number, badAdviceCount: number, opinionCount: number): number {
  // If there's no content, return a neutral score
  if (goodAdviceCount + badAdviceCount + opinionCount === 0) {
    return 50;
  }

  // Calculate weights for each type
  const goodWeight = 1.0;
  const badWeight = -0.8;
  const opinionWeight = -0.3; // Opinions aren't as bad as bad advice, but they're not facts

  // Calculate weighted sum
  const weightedSum = 
    (goodAdviceCount * goodWeight) + 
    (badAdviceCount * badWeight) + 
    (opinionCount * opinionWeight);

  // Total number of statements
  const totalStatements = goodAdviceCount + badAdviceCount + opinionCount;
  
  // Calculate normalized score (from -1 to 1)
  const normalizedScore = weightedSum / totalStatements;
  
  // Convert to percentage (0 to 100)
  let percentageScore = Math.round((normalizedScore + 1) * 50);
  
  // Ensure the score is between 0 and 100
  percentageScore = Math.max(0, Math.min(100, percentageScore));
  
  return percentageScore;
}

// Function to generate a simple analysis
function generateAnalysis(sentences: string[], goodAdvice: string[], badAdvice: string[], opinions: string[]): string {
  const totalSentences = sentences.length;
  
  // Calculate percentages
  const advicePercentage = ((goodAdvice.length + badAdvice.length) / totalSentences * 100).toFixed(1);
  const opinionPercentage = (opinions.length / totalSentences * 100).toFixed(1);
  
  // Calculate reliability score
  const reliabilityScore = calculateReliabilityScore(goodAdvice.length, badAdvice.length, opinions.length);
  
  // Determine content type
  let contentType = "informational";
  if (goodAdvice.length > badAdvice.length && goodAdvice.length > opinions.length) {
    contentType = "advice-focused";
  } else if (opinions.length > goodAdvice.length && opinions.length > badAdvice.length) {
    contentType = "opinion-focused";
  }
  
  // Determine content quality
  let contentQuality = "mixed";
  if (goodAdvice.length > 0 && badAdvice.length === 0) {
    contentQuality = "generally reliable";
  } else if (badAdvice.length > goodAdvice.length) {
    contentQuality = "potentially misleading";
  } else if (badAdvice.length > 0 && goodAdvice.length > badAdvice.length * 2) {
    contentQuality = "mostly reliable with some questionable claims";
  }
  
  // Determine content balance
  let contentBalance = "balanced";
  if (opinions.length > (goodAdvice.length + badAdvice.length) * 2) {
    contentBalance = "heavily opinion-based";
  } else if ((goodAdvice.length + badAdvice.length) > opinions.length * 2) {
    contentBalance = "primarily factual and advice-oriented";
  }
  
  // Generate analysis text
  let analysis = `This content appears to be primarily ${contentType} and ${contentQuality}. `;
  
  if (goodAdvice.length > 0) {
    analysis += `It contains ${goodAdvice.length} pieces of potentially helpful advice. `;
  }
  
  if (badAdvice.length > 0) {
    analysis += `There are ${badAdvice.length} statements that might be questionable or overgeneralized. `;
  }
  
  if (opinions.length > 0) {
    analysis += `The content includes ${opinions.length} subjective opinions. `;
  }
  
  analysis += `\n\nOverall, this content is ${contentBalance} in its presentation and has a reliability score of ${reliabilityScore}%. `;
  
  if (reliabilityScore >= 80) {
    analysis += "This indicates the content is highly reliable and fact-based. ";
  } else if (reliabilityScore >= 60) {
    analysis += "This indicates the content is generally reliable with some opinions mixed in. ";
  } else if (reliabilityScore >= 40) {
    analysis += "This indicates the content has a mix of reliable information and questionable claims. ";
  } else if (reliabilityScore >= 20) {
    analysis += "This indicates the content is more opinion-based than fact-based. ";
  } else {
    analysis += "This indicates the content may contain mostly questionable claims or opinions rather than facts. ";
  }
  
  if (contentQuality === "potentially misleading") {
    analysis += "Viewers should approach this content with caution and verify information from other sources. ";
  } else if (contentQuality === "mostly reliable with some questionable claims") {
    analysis += "While much of the advice seems reasonable, some claims should be verified with additional research. ";
  } else if (contentQuality === "generally reliable") {
    analysis += "The advice provided appears to be reasonable, though as with any content, critical thinking is still recommended. ";
  }
  
  analysis += `\n\nNote: This analysis is based on automated text processing and should be considered as a general guide rather than a definitive evaluation.`;
  
  return analysis;
}

// Analyze transcript using OpenAI (only used if USE_OPENAI is true and API key is available)
async function analyzeWithAI(transcript: string): Promise<{
  summary: string;
  goodAdvice: string[];
  badAdvice: string[];
  opinions: string[];
  analysis: string;
}> {
  try {
    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized");
    }
    
    // Truncate transcript if it's too long (OpenAI has token limits)
    const maxLength = 15000; // Approximately 3750 tokens
    const truncatedTranscript = transcript.length > maxLength 
      ? transcript.substring(0, maxLength) + "... (transcript truncated due to length)"
      : transcript;

    const prompt = `
      Analyze the following YouTube video transcript and provide:
      
      1. A concise summary (3-5 paragraphs) of the main points
      2. A list of good advice (factually correct, helpful recommendations)
      3. A list of questionable advice (potentially misleading or incorrect information)
      4. A list of opinions (subjective views expressed)
      5. A brief analysis of the overall content quality and reliability, including a numeric reliability score from 0-100%
      
      Format your response as JSON with the following structure:
      {
        "summary": "Concise summary here...",
        "goodAdvice": ["Point 1", "Point 2", ...],
        "badAdvice": ["Point 1", "Point 2", ...],
        "opinions": ["Opinion 1", "Opinion 2", ...],
        "analysis": "Brief analysis here..."
      }
      
      Transcript:
      ${truncatedTranscript}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125", // Using a more affordable model that's good for this task
      messages: [
        { role: "system", content: "You are an expert content analyzer who evaluates advice and information in YouTube videos." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent results
    });

    // Parse the JSON response
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(content);
    
    return {
      summary: result.summary || "No summary could be generated.",
      goodAdvice: result.goodAdvice || [],
      badAdvice: result.badAdvice || [],
      opinions: result.opinions || [],
      analysis: result.analysis || "No analysis could be generated."
    };
  } catch (error) {
    console.error('Error analyzing with AI:', error);
    // Fallback to local analysis if AI fails
    return analyzeLocally(transcript);
  }
} 