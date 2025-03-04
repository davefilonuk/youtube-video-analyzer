import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))]">
      <header className="bg-[rgb(var(--card-bg-rgb))] border-b border-[rgb(var(--card-border-rgb))] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-[rgb(var(--foreground-rgb))]">YouTube Fact Checker</h1>
            <div className="ml-auto flex items-center space-x-6">
              <Link href="/" className="text-sm text-[rgb(var(--foreground-rgb))] opacity-75 hover:text-[rgb(var(--accent-rgb))] font-medium">Home</Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-[rgb(var(--card-bg-rgb))] rounded-lg shadow-md border border-[rgb(var(--card-border-rgb))] mb-8">
          <div className="border-b border-[rgb(var(--card-border-rgb))] px-6 py-4 bg-[rgb(var(--card-header-bg-rgb))]">
            <h2 className="text-lg font-semibold text-[rgb(var(--foreground-rgb))]">About YouTube Fact Checker</h2>
          </div>
          <div className="p-6">
            <div className="prose text-[rgb(var(--foreground-rgb))] max-w-none">
              <p className="mb-4">
                YouTube Fact Checker is a tool designed to help viewers critically evaluate the content they consume on YouTube. 
                By analyzing video transcripts, our tool identifies and categorizes content into:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><span className="font-medium text-green-600 dark:text-green-400">Good Advice</span> — Factually accurate, helpful information that can be trusted</li>
                <li><span className="font-medium text-red-600 dark:text-red-400">Questionable Advice</span> — Content that may be misleading, inaccurate, or potentially harmful</li>
                <li><span className="font-medium text-[rgb(var(--accent-rgb))]">Opinions</span> — Subjective statements that aren't necessarily factual claims</li>
              </ul>
              <p className="mb-4">
                Our tool provides a reliability score that helps you quickly assess how factual and reliable a video's content is.
                This score is calculated based on the ratio of good advice to questionable advice and opinions found in the video.
              </p>
              <p className="mb-4">
                <strong>How it works:</strong> Enter any YouTube URL, and our algorithm will:
              </p>
              <ol className="list-decimal pl-6 mb-4 space-y-2">
                <li>Extract the video's transcript</li>
                <li>Analyze the content for factual claims, advice, and opinions</li>
                <li>Generate a comprehensive summary</li>
                <li>Categorize statements by reliability</li>
                <li>Calculate an overall reliability score</li>
              </ol>
              <p>
                This tool is designed for educational purposes and to promote critical thinking when consuming online content.
                While our analysis strives for accuracy, we recommend using it as one of many tools to evaluate information.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[rgb(var(--card-border-rgb))] bg-[rgb(var(--card-bg-rgb))] mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <p className="text-sm text-[rgb(var(--foreground-rgb))] opacity-60 text-center">
            YouTube Fact Checker © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
} 