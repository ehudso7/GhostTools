import AgentWriteForm from '../components/AgentWriteForm';

export const metadata = {
  title: 'AgentWrite - AI Product Description Generator | GhostTools',
  description: 'Generate professional, high-converting product descriptions with AI',
};

export default function AgentWritePage() {
  return (
    <div className="container mx-auto py-10">
      <AgentWriteForm />
    </div>
  );
}