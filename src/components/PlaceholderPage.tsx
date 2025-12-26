import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-slate-50">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
          <Construction className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
        {description && (
          <p className="text-slate-600 mb-6">{description}</p>
        )}
        <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border-2 border-blue-200 font-semibold">
          Coming Soon
        </div>
      </div>
    </div>
  );
}
