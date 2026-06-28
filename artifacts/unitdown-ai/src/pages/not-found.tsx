import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-2">Page Not Found</h1>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link href="/">
          <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Back to UnitDown AI
          </span>
        </Link>
      </div>
    </div>
  );
}
