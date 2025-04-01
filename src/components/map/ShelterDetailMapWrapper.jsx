'use client';

import dynamic from 'next/dynamic';

// Import the map component with no SSR since it uses browser APIs
const ShelterDetailMap = dynamic(
  () => import('./ShelterDetailMap'),
  { ssr: false }
);

export default function ShelterDetailMapWrapper({ shelter }) {
  return (
    <div className="w-full h-full">
      <ShelterDetailMap shelter={shelter} />
    </div>
  );
}
