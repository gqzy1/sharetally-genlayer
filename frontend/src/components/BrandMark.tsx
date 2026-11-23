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
    <rect x="2" y="2" width="28" height="28" rx="7" fill="#2d1b2c" />
    <path d="M9 10.5H23" stroke="#c6a4bc" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 16H17.5" stroke="#e7f45a" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M9 21.5H21" stroke="#f5a6cb" strokeWidth="2.1" strokeLinecap="round" />
    <circle cx="22.5" cy="16" r="2.2" fill="#fff0dd" />
  </svg>
);
