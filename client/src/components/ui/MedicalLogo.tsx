import React from 'react';

interface MedicalLogoProps {
  size?: number;
  className?: string;
  showBackground?: boolean;
}

export const MedicalLogo: React.FC<MedicalLogoProps> = ({ 
  size = 24, 
  className = "",
  showBackground = false
}) => {
  if (showBackground) {
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#14B8A6" />
            </linearGradient>
          </defs>
          
          {/* Circle Background */}
          <circle
            cx="24"
            cy="24"
            r="24"
            fill="url(#logoGradient)"
          />
          
          {/* Medical Cross */}
          <path
            d="M24 12C24.8284 12 25.5 12.6716 25.5 13.5V22.5H34.5C35.3284 22.5 36 23.1716 36 24C36 24.8284 35.3284 25.5 34.5 25.5H25.5V34.5C25.5 35.3284 24.8284 36 24 36C23.1716 36 22.5 35.3284 22.5 34.5V25.5H13.5C12.6716 25.5 12 24.8284 12 24C12 23.1716 12.6716 22.5 13.5 22.5H22.5V13.5C22.5 12.6716 23.1716 12 24 12Z"
            fill="white"
          />
        </svg>
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Medical Cross */}
      <path
        d="M12 2C12.5523 2 13 2.44772 13 3V11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H13V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H11V3C11 2.44772 11.4477 2 12 2Z"
        fill="currentColor"
      />
    </svg>
  );
};