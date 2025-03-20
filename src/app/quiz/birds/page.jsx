'use client';

import React from 'react';
import QuizComponent from '@/components/QuizComponent';
import { assets } from '@/assets/assets';

const genericQuestions = [
  {
    question: "How much space can you dedicate to your pet's enclosure?",
    options: [
      { label: "A small cage or tank", value: "small" },
      { label: "A medium-sized enclosure", value: "medium" },
      { label: "A large enclosure or free-roaming setup", value: "large" },
    ],
    image: assets.bird,
    multiple: true,
    apiKey: "size",
  },
  {
    question: "How much interaction do you want with your pet?",
    options: [
      { label: "I want a pet I can handle and bond with daily", value: "interactive" },
      { label: "I’d like a pet that is okay with some interaction but doesn’t need constant attention", value: "moderate" },
      { label: "I prefer a pet I can mostly observe rather than handle", value: "observational" },
    ],
    image: assets.bird,
    multiple: false,
    apiKey: "type",
  },
  {
    question: "What level of care are you comfortable with?",
    options: [
      { label: "I prefer a low-maintenance pet that’s easy to care for", value: "low-care" },
      { label: "I don’t mind moderate daily care and cleaning", value: "moderate-care" },
      { label: "I’m ready for a high-maintenance pet that needs a lot of attention", value: "high-care" },
    ],
    image: assets.bird,
    multiple: true,
    apiKey: "type",
  },
  {
    question: "How long of a commitment are you willing to make?",
    options: [
      { label: "A few years", value: "short-lifespan" },
      { label: "5–10 years", value: "medium-lifespan" },
      { label: "10+ years", value: "long-lifespan" },
    ],
    image: assets.bird,
    multiple: true,
    apiKey: "age",
  },
  {
    question: "Do you have young children or other pets at home?",
    options: [
      { label: "Yes, young kids", value: "good_with_children" },
      { label: "Yes, dogs", value: "good_with_dogs" },
      { label: "Yes, cats", value: "good_with_cats" },
      { label: "No, just me", value: "no_other_pets" },
    ],
    image: assets.bird,
    multiple: true,
    apiKey: "type",
  },
];

const QuizBirds = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-orange-50 p-6">
      <QuizComponent questions={genericQuestions} />
    </div>
  );
};

export default QuizBirds;

