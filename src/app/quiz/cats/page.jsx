'use client';

import React from 'react';
import QuizComponent from '@/components/QuizComponent';
import { assets } from '@/assets/assets';

/**
 * * * @component QuizCats => returns a quiz component for cats.
 */
const catQuestions = [
  {
    question: "What age range are you looking for in a cat?",
    options: [
      { label: "Kitten", value: "baby" },
      { label: "Junior", value: "young" },
      { label: "Adult", value: "adult" },
      { label: "Senior", value: "senior" },
    ],
    image: assets.cat,
    multiple: true,
    apiKey: "age",
  },
  {
    question: "Do you prefer a playful or a relaxed cat?",
    options: [
      { label: "I want a super playful and energetic cat", value: "high-energy" },
      { label: "I’d like a balanced mix of play and cuddles", value: "medium-energy" },
      { label: "I prefer a calm and cuddly lap cat", value: "low-energy" },
    ],
    image: assets.cat,
    multiple: false,
    apiKey: "breed",
  },
  {
    question: "Do you prefer a cat that is independent or one that craves attention?",
    options: [
      { label: "I love a cat that follows me everywhere and loves attention", value: "affectionate" },
      { label: "I prefer a cat that is independent and does its own thing", value: "independent" },
      { label: "I’d like a cat that is affectionate but also enjoys alone time", value: "balanced" },
    ],
    image: assets.cat,
    multiple: false,
    apiKey: "affectionate",
  },
  {
    question: "Do you have young children or other pets?",
    options: [
      { label: "Yes, I have kids", value: "good_with_children" },
      { label: "Yes, I have dogs", value: "good_with_dogs" },
      { label: "Yes, I have other cats", value: "good_with_cats" },
      { label: "No, it’s just me", value: "no_pets" },
    ],
    image: assets.cat,
    multiple: true,
    apiKey: "tags",
  },
  {
    question: "How do you feel about cat fur in your home?",
    options: [
      { label: "I love to clean!", value: "long" },
      { label: "I don’t mind vacuuming occasionally", value: "medium" },
      { label: "I’d prefer to deal with fur as little as possible", value: "short" },
      { label: "I have allergies and need a hypoallergenic cat", value: "hypoallergenic" },
    ],
    image: assets.cat,
    multiple: false,
    apiKey: "coat",
  },
];

const QuizCats = () => {
    return (
    <div className="flex justify-center items-center min-h-screen bg-orange-50 p-6">
        <QuizComponent questions={catQuestions} type="cat"/>
    </div>
    );
  };

export default QuizCats;

