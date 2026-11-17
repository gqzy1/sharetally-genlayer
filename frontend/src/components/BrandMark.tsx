import React from 'react';

export const BrandMark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="28" height="28" rx="7" fill="#14151A" />
    <path d="M9 10.5H23" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 16H17.5" stroke="#38BDF8" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M9 21.5H21" stroke="#34D399" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="22.5" cy="16" r="2.2" fill="#FFFFFF" />
  </svg>
);
