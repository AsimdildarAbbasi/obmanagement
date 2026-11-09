/* eslint-disable @next/next/no-img-element */
'use client';
import { useState } from 'react';
import { apiUrl } from '../lib/api';

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function UserAvatar({ name, imageUrl, size = 48, className = '' }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 bg-[#0C7347] flex items-center justify-center text-white font-bold ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={apiUrl(imageUrl)}
          alt={name || 'Profile'}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: Math.max(12, Math.round(size * 0.34)) }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}
