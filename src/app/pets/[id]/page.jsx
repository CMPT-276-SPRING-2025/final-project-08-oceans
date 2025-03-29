'use client'

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { assets } from '@/assets/assets';

export default function PetDetailPage({ params }) {
  const { id } = use(params);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (pet?.photos?.length > 1) {  // Changed from just length check to length > 1
      setCurrentImageIndex((prevIndex) => 
        prevIndex === pet.photos.length - 1 ? 0 : prevIndex + 1
      );
    }
  };
  
  const prevImage = () => {
    if (pet?.photos?.length > 1) {  // Changed from just length check to length > 1
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? pet.photos.length - 1 : prevIndex - 1
      );
    }
  };

  useEffect(() => {
    const fetchPet = async () => {
      try {
        const response = await fetch(`/pets/api/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch');
        setPet(data.pet);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPet();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading pet details...</div>
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">Error: {error || 'Pet not found'}</p>
        <Link href="/pets/pets_all" className="text-blue-500 hover:underline">
          Return to all pets
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto pt-[100px] p-10 min-h-screen">
      <Link href="/pets_all" className="inline-block mb-6 text-blue-500 hover:underline">
        &larr; Back to all pets
      </Link>
      
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6">
        <div className="md:flex">
          <div className="md:w-1/2 relative">

          {/* Pet photo */}
            {pet.photos && pet.photos.length > 0 ? (
              <>
                <div className="relative h-full w-full overflow-hidden border border-gray-50">
                  <Image 
                    src={pet.photos[currentImageIndex].large || pet.photos[currentImageIndex].medium} 
                    alt={pet.name || 'Pet image'}
                    fill
                    className="object-cover rounded-2xl"
                    priority
                  />
                </div>
                
                {/* Navigation Arrows - Only show and enable if more than one image */}
                {pet.photos.length > 1 && (
                  <>
                <button 
                  onClick={prevImage}
                  className={`absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full transition ${
                    pet.photos.length > 1 ? 'hover:bg-opacity-70 cursor-pointer' : 'opacity-50 cursor-default'
                  }`}
                  aria-label="Previous image"
                  disabled={pet.photos.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button 
                  onClick={nextImage}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full transition ${
                    pet.photos.length > 1 ? 'hover:bg-opacity-70 cursor-pointer' : 'opacity-50 cursor-default'
                  }`}
                  aria-label="Next image"
                  disabled={pet.photos.length <= 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
    )}
        
        {/* Image Indicators - Only show if more than one image */}
        {pet.photos.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
            {pet.photos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`h-2 w-2 rounded-full ${currentImageIndex === index ? 'bg-white' : 'bg-white bg-opacity-50'}`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </>
    ) : (
      <div className="h-96 w-full bg-gray-200 flex items-center justify-center">
        <p className="text-gray-500">No image available</p>
      </div>
    )}
          </div>
          
          <div className="md:w-1/2 p-6">
            <div className="flex justify-between items-start">
              <h1 className="text-4xl font-bold text-gray-800">{pet.name}</h1>
              {pet.status && (
                <span className="inline-block bg-orange-100 text-orange-600 px-3 py-1 text-md font-semibold rounded-full">
                  {pet.status}
                </span>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{pet.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Breed</p>
                <p className="font-medium">
                  {pet.breeds?.primary || 'Unknown'}
                  {pet.breeds?.secondary && ` / ${pet.breeds.secondary}`}
                  {pet.breeds?.mixed && " (Mixed)"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-medium">{pet.age}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium">{pet.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Size</p>
                <p className="font-medium">{pet.size}</p>
              </div>
            </div>

            {/* Pet Characteristics */}
            {pet.attributes && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">Characteristics</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pet.attributes).map(([key, value]) => (
                    value && (
                      <span key={key} className="bg-blue-100 text-blue-800 px-2 py-1 text-sm rounded-full">
                        {key.replace(/_/g, ' ')}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
            
            {/* Pet contact information */}
            {pet.contact && (
              <div className="flex flex-col gap-3 mt-8 p-4 bg-orange-50 rounded-lg">
                <div className="text-md flex gap-4 items-center self-start">
                  <Image 
                  src={assets.email} 
                  alt="email" 
                  width={28}/>
                  {pet.contact?.email ? (
                    <a
                      href={'mailto:${pet.contact.email}'}
                      className='hover:underline'
                      >
                        {pet.contact.email}
                    </a>
                  ) : (
                    <span>Not Available</span>
                  )}
                </div>
                <div className="text-md flex gap-4 items-center self-start">
                  <Image 
                    src={assets.phone} 
                    alt="Phone icon" 
                    width={28}
                    height={28}
                  />
                  {pet.contact?.phone ? (
                    <a 
                      href={`tel:${pet.contact.phone}`} 
                      className="hover:underline"
                    >
                      {pet.contact.phone}
                    </a>
                  ) : (
                    <span>Not available</span>
                  )} 
                </div>
                {pet.contact.address && (
                 <div className="text-md flex gap-4 items-center self-start">
                    <Image src={assets.location} alt="location" width={28}/> {pet.contact.address.city || ''}, {pet.contact.address.state || ''}
                  </div>
                )}
              </div>
            )}
            
            {pet.organization_id && (
              <div className="mt-8 flex items-center justify-center">
                <Link 
                  href={`/shelters/${pet.organization_id}`}
                  className=" flex flex-grow min-w-[120px] max-w-[300px] items-center justify-center bg-orange-500 text-white font-bold py-3 px-6 rounded-3xl hover:bg-orange-600 transition"
                >
                  Adopt {pet.name}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}