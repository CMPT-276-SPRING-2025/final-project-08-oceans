'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LoadingBar } from '@/components/ui/loading-bar';
import energyDogBreeds from '@/app/pets/Quiz_Breed_questions/Energy Dog breeds.json';
import hypoallergenicDogBreeds from '@/app/pets/Quiz_Breed_questions/Hypoellergenic-Dog-breeds.json';
import energyCatBreeds from '@/app/pets/Quiz_Breed_questions/Energy-Cat-breeds.json';
import dependenceCatBreeds from '@/app/pets/Quiz_Breed_questions/Dependence-Cat-breeds.json';
import ageRangeBreeds from '@/app/pets/Quiz_Breed_questions/ageRangeBreeds.json';
import careLevelMappings from '@/app/pets/Quiz_Breed_questions/care-Level-Generic.json';
import interactionMappings from '@/app/pets/Quiz_Breed_questions/Interaction-Level-Generic.json';
import hypoallergenicCatBreeds from '@/app/pets/Quiz_Breed_questions/Hypoallergenic-Cat-breeds.json';

/**
 * Renders a quiz interface for pet selection.
 * Gives recommended pets based on their preferences.
 * @param {object} props - The component props
 * @param {Array<object>} props.questions - An array of question objects for the quiz
 * @param {string} props.type - The type of pet the quiz is for
 * @param {boolean} props.isLetUsDecide - Flag indicating if the quiz should determine the pet type based on answers.
 * @returns {React.ReactElement} The rendered quiz component.
 */
const QuizComponent = ({ questions, type, isLetUsDecide }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState(Array(questions.length).fill(null));
  const router = useRouter();
  const [typeScores, setTypeScores] = useState({});
  const [loading, setLoading] = useState(false);

  // If the current question is answered, it moves to the next question or fetches recommended pets if it's the last question
  const handleNext = () => {
    if (selectedAnswers[currentQuestion] !== null) {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        fetchRecommendedPets();
      }
    }
  };

  // Moves to the previous question if the current question is greater than 0
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Updates the selected answer for the current question and updates type scores if isLetUsDecide is true
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


  /**
   * Constructs a detailed query string based on the selected answers for fetching pets.
   * Output: string: A URL query string formatted for route.ts (e.g., "size=large&age=adult&breed=Labrador,Retriever").
   */
  const buildQueryFromAnswers = () => {
    const query = {};
    let breedSet = new Set();
    let dogBreedSet = new Set();
    let dogCoatSet = new Set();

    let catEnergySet = new Set();
    let catAffectionSet = new Set();
    let catCoatSet = new Set();

    let careSet = new Set();
    let interactionSet = new Set();
    let ageSet = new Set();

    //If the question is a standard field, it handles the query accordingly
    const handleStandardField = (q, key, answer) => {
      // Check if the question allows multiple answers
      if (q.multiple) {
        // If the key doesn't exist in the query object yet, initialize it as an empty array
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

      //Quiz feature to filter down from type dog
      if (type === 'dog') {
        if (key === 'breed') {
          if (answer === 'low-energy') energyDogBreeds.low_energy?.forEach(b => dogBreedSet.add(b));
          else if (answer === 'moderate-energy') energyDogBreeds.medium_energy?.forEach(b => dogBreedSet.add(b));
          else if (answer === 'high-energy') energyDogBreeds.high_energy?.forEach(b => dogBreedSet.add(b));
        } else if (key === 'coat' && answer === 'hypoallergenic') {
          hypoallergenicDogBreeds.hypoallergenic_breeds_akc_in_api?.forEach(b => dogCoatSet.add(b));
        } else if (key === 'tags') {
          const tagValues = Array.isArray(answer) ? answer : [answer]; 
          
          // Processes each tag and checks if each one is good with certain categories
          tagValues.forEach(tagValue => {
              if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                  query[tagValue] = true;
              }
          });
          //Else, it handles the standard field
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
          const tagValues = Array.isArray(answer) ? answer : [answer]; 

          // Processes each tag and checks if each one is good with certain categories
          tagValues.forEach(tagValue => {
              if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                  query[tagValue] = true;
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
          if (answer === 'low') careLevelMappings.care_level?.[category]?.low?.forEach(b => careSet.add(b));
          else if (answer === 'medium') careLevelMappings.care_level?.[category]?.medium?.forEach(b => careSet.add(b));
          else if (answer === 'high') careLevelMappings.care_level?.[category]?.high?.forEach(b => careSet.add(b));
        } 
        else if (key === 'breed-interact') {
          if (answer === 'interactive') interactionMappings.interaction_level?.[category]?.interactive?.forEach(b => interactionSet.add(b));
          else if (answer === 'middle_ground') interactionMappings.interaction_level?.[category]?.middle_ground?.forEach(b => interactionSet.add(b));
          else if (answer === 'observational') interactionMappings.interaction_level?.[category]?.observational?.forEach(b => interactionSet.add(b));
        }
        else if (key === 'age'){
          if (answer === 'short-lifespan') ageRangeBreeds.lifespan_categories?.short_lifespan?.[type]?.forEach(b => ageSet.add(b));
          else if (answer === 'medium-lifespan') ageRangeBreeds.lifespan_categories?.medium_lifespan?.[type]?.forEach(b => ageSet.add(b));
          else if (answer === 'long-lifespan') ageRangeBreeds.lifespan_categories?.long_lifespan?.[type]?.forEach(b => ageSet.add(b));
        } 
        else if (key === 'tags') {
            const tagValues = Array.isArray(answer) ? answer : [answer]; // Ensure array

            if (tagValues.includes("no_pets")){} // Add nothing
            tagValues.forEach(tagValue => {
                // Check if it's one of the specific Petfinder boolean flags
                if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                    // Use the tag value itself as the query key, set value to true
                    query[tagValue] = true; // Petfinder uses boolean flags
                }
            });
        } else {
          handleStandardField(q, key, answer);
        }
      }
    });

    // If the type is dog, it checks if the breed set is empty and adds the dog breeds to the set
    if (type === 'dog') {
      if (dogCoatSet.size > 0) {
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
      // Find the intersection of careSet, interactionSet, and ageSet
      if (ageSet.size > 0) {
        for (const breed of careSet) {
          if (interactionSet.has(breed) && ageSet.has(breed)) {
            breedSet.add(breed);
          }
        }
        if (!breedSet.size > 0) {
          for (const breed of careSet) {
            if (interactionSet.has(breed)) {
              breedSet.add(breed);
            }
          }
        }
      }
      else {
        for (const breed of careSet) {
          if (interactionSet.has(breed)) {
            breedSet.add(breed);
          }
        }
      }
    }

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

      const skipKeys = ['size', 'breed', 'affectionate'];

      // If the type is dog, it skips the 'age' key
      if (['bird', 'fish', 'reptile', 'small-pets'].includes(type)) {
        skipKeys.push('age');
      }

      if (skipKeys.includes(key)) return;

      if (key === 'coat' && answer === 'hypoallergenic'){
        if (type === 'dog') {
          // If the type is dog, it adds the hypoallergenic breeds to the set
          hypoallergenicDogBreeds.hypoallergenic_breeds_akc_in_api?.forEach(b => breedSet.add(b));
        } else if (type === 'cat') {
          // If the type is cat, it adds the hypoallergenic breeds to the set
          hypoallergenicCatBreeds.hypoallergenic_breeds?.forEach(b => breedSet.add(b));
        }
      }

      if (key === 'tags') {
        const tagValues = Array.isArray(answer) ? answer : [answer]; 

        tagValues.forEach(tagValue => {
            if (['good_with_children', 'good_with_dogs', 'good_with_cats'].includes(tagValue)) {
                query[tagValue] = true; 
            }
        });
      }

      //If there are multiple answers, it handles the query accordingly
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
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
      .join('&');
  };


  const fetchRecommendedPets = async () => {
    let chosenType = type;

    // If isLetUsDecide is true, it determines the type based on the highest score
    if (isLetUsDecide) {
      const topType = Object.entries(typeScores).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!topType) {
        alert('Please answer all questions!');
        setLoading(false); 
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
    setLoading(true);

    try {
      const res = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${query}`);
      const data = await res.json();

      // Check if the response contains pets
      if (data?.pets?.length) {
        allPets = data.pets;
      }

      // If no length is found, it builds a relaxed query and fetches again
      if (!allPets.length) {
        relaxedQuery = buildRelaxedQuery();
        const relaxedRes = await fetch(`/pets?type=${actualType}${subType ? `&subType=${subType}` : ''}&${relaxedQuery}`);
        const relaxedData = await relaxedRes.json();

        // Check if the relaxed response contains pets
        if (relaxedData?.pets?.length) {
          allPets = relaxedData.pets;
          localStorage.setItem('fallbackMessage', 'We couldn\'t find an exact match, but here are some similar pets!');
        } else {
          localStorage.removeItem('fallbackMessage');
        }
      } else {
         localStorage.removeItem('fallbackMessage');
      }

      // If pets are found, it filters out duplicates and stores them in localStorage
      if (allPets.length) {
        const uniquePets = Array.from(new Map(allPets.map(p => [p.id, p])).values());

        localStorage.setItem('pets', JSON.stringify(uniquePets));
        localStorage.setItem('petType', actualType);
        if (subType) {
          localStorage.setItem('petSubType', subType);
        } else {
          localStorage.removeItem('petSubType');
        }
        localStorage.setItem('quizQuery', relaxedQuery || query); 
        router.push('/results');
      } else {
        alert('Sorry, no matching pets found, even with relaxed criteria. Try different preferences.');
      }
    } catch (err) {
      alert('Something went wrong while fetching pets. Please try again later.');
    } finally {
      setLoading(false); 
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

                // If the question is multiple choice, it updates the selected answers accordingly
                if (isMulti) {
                  const updated = Array.isArray(currentValue) ? [...currentValue] : [];
                  const index = updated.indexOf(option.value);

                  // If the option is already selected, it removes it from the array
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