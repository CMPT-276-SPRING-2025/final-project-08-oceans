'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import energyDogBreeds from '@/app/pets/Quiz_Breed_questions/Energy Dog breeds.json';
import hypoallergenicDogBreeds from '@/app/pets/Quiz_Breed_questions/Hypoellergenic-Dog-breeds.json';
import energyCatBreeds from '@/app/pets/Quiz_Breed_questions/Energy-Cat-breeds.json';
import dependenceCatBreeds from '@/app/pets/Quiz_Breed_questions/Dependence-Cat-breeds.json';
import breedMappings from '@/app/pets/Quiz_Breed_questions/Bird-Small-Fish-Reptile-Breeds.json';
import careLevelMappings from '@/app/pets/Quiz_Breed_questions/care-Level-Generic.json';
import interactionMappings from '@/app/pets/Quiz_Breed_questions/Interaction-Level-Generic.json';
import hypoallergenicCatBreeds from '@/app/pets/Quiz_Breed_questions/Hypoallergenic-Cat-breeds.json';

const QuizComponent = ({ questions, type, isLetUsDecide }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(Array(questions.length).fill(null));
  const router = useRouter();
  const [typeScores, setTypeScores] = useState({});

  const handleNext = () => {
    if (selectedAnswers[currentQuestion] !== null) {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        fetchRecommendedPets();
      }
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleAnswerChange = (answer) => {
    const updated = [...selectedAnswers];
    updated[currentQuestion] = answer;
    setSelectedAnswers(updated);
  
    if (isLetUsDecide) {
      const types = Array.isArray(answer) ? answer : [answer];
      const newScores = { ...typeScores };
      types.forEach((type) => {
        newScores[type] = (newScores[type] || 0) + 1;
      });
      setTypeScores(newScores);
    }
  };
  

  const buildQueryFromAnswers = () => {
    const query = {};
    let breedSet = new Set();
     // temp sets to collect breed-related answers separately
    const catEnergySet = new Set();
    const catAffectionSet = new Set();
    const catCoatSet = new Set();

    questions.forEach((q, index) => {
      const key = q.apiKey || q.apiField;
      const answer = selectedAnswers[index];
      if (!key || !answer) return;

      // DOGS
      if (type === 'dog') {
        if (key === 'breed') {
          if (answer === 'low-energy') energyDogBreeds.low_energy?.forEach(b => breedSet.add(b));
          else if (answer === 'moderate-energy') energyDogBreeds.medium_energy?.forEach(b => breedSet.add(b));
          else if (answer === 'high-energy') energyDogBreeds.high_energy?.forEach(b => breedSet.add(b));
        } else if (key === 'coat' && answer === 'hypoallergenic') {
          hypoallergenicDogBreeds.hypoallergenic_breeds_akc_in_api?.forEach(b => breedSet.add(b));
        } else {
          if (q.multiple) {
            if (!query[key]) query[key] = [];
            if (Array.isArray(answer)) query[key].push(...answer);
            else query[key].push(answer);
          } else {
            query[key] = answer;
          }
        }
      }

      // CATS
      else if (type === 'cat') {
        if (key === 'breed') {
          if (answer === 'low-energy') energyCatBreeds.energy_level.low?.forEach(b => catEnergySet.add(b));
          else if (answer === 'medium-energy') energyCatBreeds.energy_level.medium?.forEach(b => catEnergySet.add(b));
          else if (answer === 'high-energy') energyCatBreeds.energy_level.high?.forEach(b => catEnergySet.add(b));
        } else if (key === 'affectionate') {
          if (answer === 'affectionate') dependenceCatBreeds.dependence_level.dependent?.forEach(b => catAffectionSet.add(b));
          else if (answer === 'independent') dependenceCatBreeds.dependence_level.independent?.forEach(b => catAffectionSet.add(b));
          else if (answer === 'balanced') dependenceCatBreeds.dependence_level.middle_ground?.forEach(b => catAffectionSet.add(b));
        } else if (key === 'coat' && answer === 'hypoallergenic') {
          hypoallergenicCatBreeds.hypoallergenic_breeds?.forEach(b => catCoatSet.add(b));
        } else {
          if (q.multiple) {
            if (!query[key]) query[key] = [];
            if (Array.isArray(answer)) query[key].push(...answer);
            else query[key].push(answer);
          } else {
            query[key] = answer;
          }
        }
      }

      // BIRD / FISH / REPTILE / SMALL PET
      else if (['bird', 'fish', 'reptile', 'small-pets'].includes(type)) {
        const category =
          type === 'bird' ? 'bird_breeds' :
          type === 'fish' ? 'fish_breeds' :
          type === 'reptile' ? 'reptile_breeds' :
          'small_furry_rabbit_breeds';
      
        if (key === 'breed') {
          const careOptions = careLevelMappings.care_level?.[category];
          const interactionOptions = interactionMappings.interaction_level?.[category];
      
          // Match answer with care levels
          if (careOptions) {
            Object.values(careOptions).forEach(list => {
              list?.forEach(b => breedSet.add(b));
            });
          }
      
          // Match answer with interaction levels
          if (interactionOptions) {
            Object.values(interactionOptions).forEach(list => {
              list?.forEach(b => breedSet.add(b));
            });
          }
        } else {
          if (q.multiple) {
            if (!Array.isArray(query[key])) {
              query[key] = Array.isArray(answer) ? [...answer] : [answer];
            } else {
              if (Array.isArray(answer)) {
                query[key].push(...answer);
              } else {
                query[key].push(answer);
              }
            }
          } else {
            query[key] = answer;
          }
        }
      }
      
      
    });

    if (breedSet.size > 0) {
      query['breed'] = Array.from(breedSet).join(',');
    }

    return Object.entries(query)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
      .join('&');
  };

  const buildRelaxedQuery = () => {
    const query = {};
  
    questions.forEach((q, index) => {
      const key = q.apiKey || q.apiField;
      const answer = selectedAnswers[index];
      if (!key || !answer) return;
  
      const skipKeys = ['tags', 'coat', 'breed', 'good_with',];
  
      if (['bird', 'fish', 'reptile', 'small-pets'].includes(type)) {
        skipKeys.push('age','size');
      }
  
      if (skipKeys.includes(key)) return;
  
      if (q.multiple) {
        if (!query[key]) query[key] = [];
        if (Array.isArray(answer)) {
          query[key].push(...answer);
        } else {
          query[key].push(answer);
        }
      } else {
        query[key] = answer;
      }
    });
  
    return Object.entries(query)
    .flatMap(([k, v]) =>
      Array.isArray(v) ? v.map(val => `${k}=${encodeURIComponent(val)}`) : [`${k}=${encodeURIComponent(v)}`]
    )
    .join('&');
  
  };
  

  const fetchRecommendedPets = async () => {
    let chosenType = type;
  
    if (isLetUsDecide) {
      const topType = Object.entries(typeScores).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topType) {
        alert('Please answer all questions!');
        return;
      }
      chosenType = topType;
    }
  
    const query = buildQueryFromAnswers();
  
    const petfinderTypeMap = {
      reptile: { type: 'scales-fins-other', subType: 'reptile' },
      fish: { type: 'scales-fins-other', subType: 'fish' },
      bird: { type: 'bird' },
      'small-pets': { type: 'small-pets' },
      dog: { type: 'dog' },
      cat: { type: 'cat' },
    };
  
    const actualTypeInfo = petfinderTypeMap[chosenType] || { type: chosenType };
    const { type: actualType, subType } = actualTypeInfo;
  
    let allPets = [];
  
    try {
      if (query.includes('age=')) {
        const ageMatch = query.match(/age=([^&]*)/);
        const ageValues = ageMatch ? ageMatch[1].split(',') : [];
  
        for (const age of ageValues) {
          const modifiedQuery = query.replace(/age=([^&]*)/, `age=${age}`);
          const res = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${modifiedQuery}`);
          const data = await res.json();
          if (data?.pets?.length) {
            allPets.push(...data.pets);
          }
        }
      } else {
        const res = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${query}`);
        const data = await res.json();
        if (data?.pets?.length) {
          allPets = data.pets;
        }
      }
  
      if (!allPets.length) {
        const relaxedQuery = buildRelaxedQuery();
        const res = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${relaxedQuery}`);
        const data = await res.json();
        if (data?.pets?.length) {
          allPets = data.pets;
        }
      }
  
      if (allPets.length) {
        const uniquePets = Array.from(new Map(allPets.map(p => [p.id, p])).values());
  
        localStorage.setItem('pets', JSON.stringify(uniquePets));
        
        localStorage.setItem('petType', actualType);
        if (subType) {
          localStorage.setItem('petSubType', subType);
        } else {
          localStorage.removeItem('petSubType');
        }
  
        router.push('/results');
      } else {
        alert('Sorry, no matching pets found. Try different preferences.');
      }
    } catch (err) {
      console.error('Error fetching pets:', err);
      alert('Something went wrong. Please try again later.');
    }
  };
  

  const question = questions[currentQuestion];

  return (
    <div className="flex justify-center gap-50">
      <div className="w-1/2 flex justify-center items-center">
        <Image src={question.image} alt="Pet" className="w-100 h-100 object-contain" />
      </div>

      <div className="w-[800px] h-[500px] max-w-2xl bg-orange-100 p-10 rounded-xl shadow-md text-center">
        <h2 className="text-2xl font-semibold mb-6 mt-3">{question.question}</h2>
        <p className="text-lg text-gray-600 text-left mb-6">
          Question {currentQuestion + 1} out of {questions.length}
        </p>
        <div className="flex flex-col gap-8 text-left">
          {question.options.map((option, i) => {
            const isMulti = question.apiKey === 'age' || question.apiKey === 'tags';
            const currentValue = selectedAnswers[currentQuestion];

            const isChecked = isMulti
              ? Array.isArray(currentValue) && currentValue.includes(option.value)
              : currentValue === option.value;

            const handleChange = () => {
              if (isMulti) {
                const updated = Array.isArray(currentValue) ? [...currentValue] : [];
                const index = updated.indexOf(option.value);
                if (index === -1) {
                  updated.push(option.value);
                } else {
                  updated.splice(index, 1);
                }
                handleAnswerChange(updated);
              } else {
                handleAnswerChange(option.value);
              }
            };

            return (
              <label key={i} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`question-${currentQuestion}`}
                  value={option.value}
                  checked={isChecked}
                  onChange={handleChange}
                  className="hidden peer"
                />
                <div className="w-5 h-5 border-2 border-gray-500 rounded-md flex items-center justify-center peer-checked:bg-orange-500 peer-checked:border-orange-500">
                  {isChecked && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  )}
                </div>
                <span className="text-md font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>


        <div className="flex justify-between mt-10">
          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-3xl shadow-2xl text-md"
            disabled={currentQuestion === 0}
            onClick={handlePrevious}
          >
            Previous
          </Button>

          <Button
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-3xl shadow-2xl text-md"
            disabled={!selectedAnswers[currentQuestion]}
            onClick={handleNext}
          >
            {currentQuestion + 1 < questions.length ? 'Next' : 'See Results'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizComponent;
