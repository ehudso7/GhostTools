import PodScribeForm from '../components/PodScribeForm';

export const metadata = {
  title: 'PodScribe - AI Podcast Transcription & Summarization | GhostTools',
  description: 'Automatically transcribe and summarize podcast episodes with advanced AI',
};

export default function PodScribePage() {
  return (
    <div className="container mx-auto py-10">
      <PodScribeForm />
    </div>
  );
}