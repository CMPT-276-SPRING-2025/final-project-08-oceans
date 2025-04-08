'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LoadingBar } from '@/components/ui/loading-bar'; // Import LoadingBar
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
  const [loading, setLoading] = useState(false); // Add loading state

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
    let dogBreedSet = new Set();
    let dogCoatSet = new Set();

     // temp sets to collect breed-related answers separately
    let catEnergySet = new Set();
    let catAffectionSet = new Set();
    let catCoatSet = new Set();

    let careSet = new Set();
    let interactionSet = new Set();

    const handleStandardField = (q, key, answer) => {
      if (q.multiple) {
         if (!query[key]) query[key] = [];
         const valuesToAdd = Array.isArray(answer) ? answer : [answer];
         query[key].push(...valuesToAdd);
      } else {
         query[key] = answer;
      }
   }

    questions.forEach((q, index) => {
      const key = q.apiKey || q.apiField;
      const answer = selectedAnswers[index];
      if (!key || !answer) return;

      // DOGS
      if (type === 'dog') {
        if (key === 'breed') {
          if (answer === 'low-energy') energyDogBreeds.low_energy?.forEach(b => dogBreedSet.add(b));
          else if (answer === 'moderate-energy') energyDogBreeds.medium_energy?.forEach(b => dogBreedSet.add(b));
          else if (answer === 'high-energy') energyDogBreeds.high_energy?.forEach(b => dogBreedSet.add(b));
        } else if (key === 'coat' && answer === 'hypoallergenic') {
          hypoallergenicDogBreeds.hypoallergenic_breeds_akc_in_api?.forEach(b => dogCoatSet.add(b));
        } else if (key === 'tags') {
          const tagValues = Array.isArray(answer) ? answer : [answer]; // Ensure array

          if (tagValues.includes("no_pets")){} // Add nothing
          tagValues.forEach(tagValue => {
              // Check if it's one of the specific Petfinder boolean flags
              if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                  // Use the tag value itself as the query key, set value to true
                  query[tagValue] = true; // Petfinder uses boolean flags
              }
          });
        }else {
          handleStandardField(q, key, answer);
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
        } else if (key === 'tags') {
          const tagValues = Array.isArray(answer) ? answer : [answer]; // Ensure array

          if (tagValues.includes("no_pets")){} // Add nothing
          tagValues.forEach(tagValue => {
              // Check if it's one of the specific Petfinder boolean flags
              if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                  // Use the tag value itself as the query key, set value to true
                  query[tagValue] = true; // Petfinder uses boolean flags
              }
          });
        }else {
          handleStandardField(q, key, answer);
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
              list?.forEach(b => careSet.add(b));
            });
          }

          // Match answer with interaction levels
          if (interactionOptions) {
            Object.values(interactionOptions).forEach(list => {
              list?.forEach(b => interactionSet.add(b));
            });
          }
        } else {
          handleStandardField(q, key, answer);
        }
      }
    });

    if (type === 'dog') {
      if (dogCoatSet.size > 0) {
        // Find the intersection of dogBreedSet and dogCoatSet
        for (const breed of dogBreedSet) {
          if (dogCoatSet.has(breed)) {
            breedSet.add(breed);
          }
        }
      }
      else{
        breedSet = dogBreedSet;
      }
    }
    else if (type === 'cat') {
      if (catCoatSet.size > 0) {
        // Find the intersection of catEnergySet, catAffectionSet, and catCoatSet
        for (const breed of catEnergySet) {
          if (catAffectionSet.has(breed) && catCoatSet.has(breed)) {
            breedSet.add(breed);
          }
        }
      }
      else{
        for (const breed of catEnergySet) {
          if (catAffectionSet.has(breed)) {
            breedSet.add(breed);
          }
        }
      }
    } else if (['bird', 'fish', 'reptile', 'small-pets'].includes(type)) {
      // Find the intersection of careSet and interactionSet
      for (const breed of careSet) {
        if (interactionSet.has(breed)) {
          breedSet.add(breed);
        }
      }
    }

    // Add the breed sets to the query
    if (breedSet.size > 0) {
      query['breed'] = Array.from(breedSet).join(',');
    }

    return Object.entries(query)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
      .join('&');
  };

  const buildRelaxedQuery = () => {
    const query = {};
    let breedSet = new Set();

    questions.forEach((q, index) => {
      const key = q.apiKey || q.apiField;
      const answer = selectedAnswers[index];

      if (!key || !answer) return;

      const skipKeys = ['size', 'breed'];

      if (['bird', 'fish', 'reptile', 'small-pets'].includes(type)) {
        skipKeys.push('age');
      }

      if (skipKeys.includes(key)) return;
      if (key === 'coat' && answer === 'hypoallergenic'){
        if (type === 'dog') {
          hypoallergenicDogBreeds.hypoallergenic_breeds_akc_in_api?.forEach(b => breedSet.add(b));
        } else if (type === 'cat') {
          hypoallergenicCatBreeds.hypoallergenic_breeds?.forEach(b => breedSet.add(b));
        }
      }
      if (key === 'tags') {
        const tagValues = Array.isArray(answer) ? answer : [answer]; // Ensure array

        if (tagValues.includes("no_pets")){} // Add nothing
        tagValues.forEach(tagValue => {
            // Check if it's one of the specific Petfinder boolean flags
            if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                // Use the tag value itself as the query key, set value to true
                query[tagValue] = true; // Petfinder uses boolean flags
            }
        });
      }
      else if (q.multiple) {
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
        setLoading(false); // Reset loading if validation fails
        return;
      }
      chosenType = topType;
    }

    const query = buildQueryFromAnswers();
    let relaxedQuery = null;

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
    setLoading(true); // Set loading to true

    try {
      const res = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${query}`);
      const data = await res.json();
      if (data?.pets?.length) {
        allPets = data.pets;
      }

      if (!allPets.length) {
        relaxedQuery = buildRelaxedQuery();
        const relaxedRes = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${relaxedQuery}`);
        const relaxedData = await relaxedRes.json();
        if (relaxedData?.pets?.length) {
          allPets = relaxedData.pets;
          localStorage.setItem('fallbackMessage', 'We couldn\'t find an exact match, but here are some similar pets!');
        } else {
          localStorage.removeItem('fallbackMessage'); // Clear any previous fallback message
        }
      } else {
         localStorage.removeItem('fallbackMessage'); // Clear fallback if strict query worked
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
        localStorage.setItem('quizQuery', relaxedQuery || query); // Store the query that worked
        router.push('/results');
        // setLoading(false) will be handled by finally, even after navigation starts
      } else {
        alert('Sorry, no matching pets found, even with relaxed criteria. Try different preferences.');
        // setLoading(false) will be handled by finally
      }
    } catch (err) {
      alert('Something went wrong while fetching pets. Please try again later.');
      // setLoading(false) will be handled by finally
    } finally {
      setLoading(false); // Ensure loading is always reset
    }
  };


  const question = questions[currentQuestion];

  return (
    <>
      <LoadingBar isLoading={loading} message="Finding your perfect match..." />
      <div className={`flex justify-center gap-50 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
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
              const isMulti = question.multiple;
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
              disabled={currentQuestion === 0 || loading} // Disable when loading
              onClick={handlePrevious}
            >
              Previous
            </Button>

            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-3xl shadow-2xl text-md"
              disabled={!selectedAnswers[currentQuestion] || loading} // Disable when loading
              onClick={handleNext}
            >
              {currentQuestion + 1 < questions.length ? 'Next' : 'See Results'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuizComponent;