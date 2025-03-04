# YouTube Video Summarizer

A Next.js application that allows users to paste a YouTube video URL and get an AI-generated summary of the video content.

## Features

- Input a YouTube video URL
- Extract the video transcript
- Generate a concise summary using OpenAI's GPT model
- Responsive UI with loading states and error handling

## Prerequisites

- Node.js 18.x or later
- An OpenAI API key

## Getting Started

1. Clone the repository:

```bash
git clone <repository-url>
cd youtube-video-summarizer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How to Use

1. Enter a valid YouTube video URL in the input field
2. Click the "Summarize Video" button
3. Wait for the application to fetch the transcript and generate a summary
4. View the generated summary below the form

## Technologies Used

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- OpenAI API
- YouTube Transcript API

## Limitations

- The application can only summarize videos that have captions/transcripts available
- Very long videos may have their transcripts truncated due to token limits
- The quality of the summary depends on the quality of the transcript and the AI model

## License

MIT
