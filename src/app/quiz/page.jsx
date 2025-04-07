'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { assets } from '@/assets/assets';
import Image from 'next/image';

const pets = [
    { name: 'Dogs', image: assets.dog_quiz, path: '/quiz/dogs' },
    { name: 'Cats', image: assets.cat_quiz, path: '/quiz/cats' },
    { name: 'Fish', image: assets.fish_quiz, path: '/quiz/fish' },
    { name: 'Birds', image: assets.bird_quiz, path: '/quiz/birds' },
    { name: 'Small pets', image: assets.smallpets_quiz, path: '/quiz/smallpets' },
    { name: 'Reptiles', image: assets.reptiles_quiz, path: '/quiz/reptiles' },
    { name: 'or.....Let us decide!', image: assets.general_quiz, path: '/quiz/random' },
];

const Quiz = () => {
  const router = useRouter();

  const handleClick = (path) => {
    router.push(path);
  };


  const regularCardSizes = "(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw";
  const wideCardSizes = "(max-width: 767px) 50vw, (max-width: 1023px) 66vw, 50vw"; 

  return (
    <div className="w-full flex flex-col justify-center items-center bg-orange-50 min-h-screen py-10"> 
      <h2 className="text-2xl font-semibold mb-10 px-4 text-center">Choose your desired pet to take a quiz!</h2> 

      <div className="w-full max-w-6xl px-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 auto-rows-min">
        {pets.map((pet, index) => {
          const isWideCard = pet.name === "or.....Let us decide!";
          return (
            <Card
              key={index}
              className={`cursor-pointer shadow-md hover:shadow-2xl hover:bg-orange-300 transition duration-300 bg-orange-100
                p-3 md:p-4 text-center rounded-xl flex flex-col overflow-hidden
                ${isWideCard ? "h-48 md:h-56 md:col-span-2" : "h-48 md:h-56 w-full"}`} 
              onClick={() => handleClick(pet.path)}
            >
              <CardContent className="text-lg md:text-xl font-medium py-2 flex-shrink-0">{pet.name}</CardContent>
              <div className="relative flex-grow flex items-center justify-center min-h-0 p-1 md:p-2"> 
                <Image
                  src={pet.image}
                  alt={pet.name}
                  fill
                  className={isWideCard ? "object-cover" : "object-contain"}
                  sizes={isWideCard ? wideCardSizes : regularCardSizes}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Quiz;