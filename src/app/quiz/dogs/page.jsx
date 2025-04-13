'use client';

import React from 'react';
import QuizComponent from '@/components/QuizComponent';
import { assets } from '@/assets/assets';

/**
 * * @component QuizDogs => returns a quiz component for dogs.
 */
const dogQuestions = [
    {
      question: "What age range are you looking for in a dog?",
      options: [
        { label: "Puppy", value: "baby" },
        { label: "Junior", value: "young" },
        { label: "Adult", value: "adult" },
        { label: "Senior", value: "senior" },
      ],
      image: assets.dog,
      multiple: true, 
      apiField: "age",
    },
    {
      question: "How much space do you have for a dog?",
      options: [
        { label: "A small apartment", value: "small" },
        { label: "A house with a yard", value: "medium" },
        { label: "A large property or farm", value: "large,xlarge" },
      ],
      image: assets.dog,
      multiple: false, 
      apiField: "size",
    },
    {
      question: "How much time can you dedicate to exercising your dog?",
      options: [
        { label: "I prefer a couch potato", value: "low-energy" },
        { label: "A few short walks a day", value: "moderate-energy" },
        { label: "I love long walks and outdoor adventures!", value: "high-energy" },
      ],
      image: assets.dog,
      multiple: false,
      apiField: "breed", 
    },
    {
      question: "Do you have young children or other pets?",
      options: [
        { label: "Yes, I have kids", value: "good_with_children" },
        { label: "Yes, I have other dogs", value: "good_with_dogs" },
        { label: "Yes, I have cats", value: "good_with_cats" },
        { label: "No, it’s just me", value: "no_pets" },
      ],
      image: assets.dog,
      multiple: true,
      apiField: "tags",
    },
    {
      question: "How do you feel about dog fur in your home?",
      options: [
        { label: "I love to clean!", value: "long" },
        { label: "I don’t mind vacuuming occasionally", value: "medium" },
        { label: "I’d prefer to deal with fur as little as possible", value: "short" },
        { label: "I have allergies and need a hypoallergenic dog", value: "hypoallergenic" },
      ],
      image: assets.dog,
      multiple: false,
      apiField: "coat",
    },
  ];

const QuizDogs = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-orange-50 p-6">
      <QuizComponent questions={dogQuestions} type="dog" />
    </div>
  )
}

export default QuizDogs

