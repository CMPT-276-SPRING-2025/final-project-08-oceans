'use client';

import React from 'react';
import QuizComponent from '@/components/QuizComponent';
import { assets } from '@/assets/assets';

/**
 * @component QuizRandom => returns a quiz component for random pets.
 */
const randomQuestions = [
  {
    question: "How much time can you spend interacting with your pet daily?",
    options: [
      { label: "Several hours—I want a pet that loves attention!", value: ["dog", "cat"] },
      { label: "Some interaction is nice, but I also want an independent pet", value: ["cat", "small-pets"] },
      { label: "Occasional interaction, but not daily handling", value: ["scales-fins-other", "bird", "fish"] },
    ],
    image: assets.generalpets,
    multiple: false,
    apiKey: "breed",
  },
  {
    question: "How much care are you willing to provide?",
    options: [
      { label: "Daily care, playtime, and training!", value: ["dog", "cat"] },
      { label: "Regular feeding and cleaning, but minimal training", value: ["small-pets", "cats"] },
      { label: "Low maintenance—feeding and occasional habitat upkeep", value: ["scales-fins-other", "fish", "bird"] },
    ],
    image: assets.generalpets,
    multiple: false,
    apiKey: "breed",
  },
  {
    question: "Do you want a pet that can freely roam your home?",
    options: [
      { label: "Yes! I want a pet that can explore and interact", value: ["dog", "cat"] },
      { label: "Sometimes—I'd like a pet that can come out occasionally", value: ["small-pets"] },
      { label: "No, I prefer a pet that stays in its enclosure", value: ["bird",  "fish", "scales-fins-other"] },
    ],
    image: assets.generalpets,
    multiple: false,
    apiKey: "breed",
  },
  {
    question: "What kind of companionship are you looking for?",
    options: [
      { label: "A loyal, affectionate companion", value: ["dog", "cat"] },
      { label: "A pet that’s independent but still loving", value: ["cat", "bird"] },
      { label: "A quiet pet that I can observe and enjoy", value: ["bird", "fish", "small-pets"] },
      { label: "A small, cute pet that’s fun to watch and sometimes handle", value: ["small-pets", "scales-fins-other"] },
    ],
    image: assets.generalpets,
    multiple: false,
    apiKey: "breed",
  },
  {
    question: "How important is your pet’s cleanliness to you?",
    options: [
      { label: "Very important—I prefer a pet that is clean and easy to maintain", value: [ "cat", "fish", "bird"] },
      { label: "Somewhat important—I don’t mind occasional cleaning but prefer a tidy pet", value: ["cat", "fish", "bird"] },
      { label: "Not very important—I’m okay with a pet that may require more cleaning", value: ["dog"] },
    ],
    image: assets.generalpets,
    multiple: false,
    apiKey: "breed",
  },
];

const QuizRandom = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-orange-50 p-6">
      <QuizComponent questions={randomQuestions} type="random" isLetUsDecide />
    </div>
  );
};

export default QuizRandom;
