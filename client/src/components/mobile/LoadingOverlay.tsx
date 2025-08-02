import { Heart, Stethoscope } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export default function LoadingOverlay({ isVisible, message = "Loading..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center z-50">
      <div className="text-center px-8">
        {/* Logo and Branding */}
        <div className="mb-8">
          <div className="relative">
            {/* Main Logo Circle */}
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
              <Stethoscope className="h-10 w-10 text-white" />
            </div>
            
            {/* Animated Pulse Rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-emerald-200 rounded-full animate-ping opacity-75"></div>
              <div className="absolute w-24 h-24 border-2 border-blue-200 rounded-full animate-pulse"></div>
            </div>
          </div>
          
          {/* Clinic Name */}
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            My Homeo Health
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Homeopathy Clinic Management System
          </p>
        </div>

        {/* Loading Animation */}
        <div className="mb-6">
          {/* Animated Dots */}
          <div className="flex justify-center space-x-2 mb-4">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Loading Message */}
        <p className="text-gray-700 font-medium text-lg mb-2">{message}</p>
        <p className="text-gray-500 text-sm">
          Please wait while we prepare your healthcare dashboard...
        </p>
        
        {/* Healthcare Icons Animation */}
        <div className="mt-8 flex justify-center space-x-6 opacity-50">
          <Heart className="h-6 w-6 text-red-400 animate-pulse" />
          <div className="w-6 h-6 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-6 h-6 bg-blue-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}
