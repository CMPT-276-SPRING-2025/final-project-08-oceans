'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import PetGrid from '../../components/PetGrid'
import FilterButtons from '../../components/FilterButtons'
import { saveToSessionStorage, getFromSessionStorage, generateCacheKey } from '../../lib/clientStorage'
import { LoadingBar } from '@/components/ui/loading-bar'

const AllPetsPageClient = () => {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type')
  const subType = searchParams.get('subType')
  const location = searchParams.get('location')

  // Function to store filters and navigate to detail page
  const goToDetailPage = (petId) => {
    const currentFilters = {
      type: searchParams.get('type') || '',
      subType: searchParams.get('subType') || '',
      location: searchParams.get('location') || '',
    };
    localStorage.setItem('petFilters', JSON.stringify(currentFilters));
    
    // Show loading when navigating to pet details
    setLoading(true);
    const backUrl = encodeURIComponent(window.location.pathname + window.location.search); 
    router.push(`/pets/${petId}?backURL=${backUrl}`);
  };

  useEffect(() => {
    // Retrieve filters from localStorage
    const storedFilters = localStorage.getItem('petFilters');
    if (storedFilters) {
      const filters = JSON.parse(storedFilters);

      const newParams = new URLSearchParams();
      if (filters.type) {
        newParams.set('type', filters.type);
      }
      if (filters.subType) {
        newParams.set('subType', filters.subType);
      }
      if (filters.location) {
        newParams.set('location', filters.location);
      }

      const newURL = `?${newParams.toString()}`;

      router.push(newURL);

      localStorage.removeItem('petFilters');
    }
  }, [router]);

  useEffect(() => {
    async function fetchPets() {
      setLoading(true)
      setError(null)
      
      try {
        let url = '/pets'
        const queryParams = new URLSearchParams()
        
        if (type) queryParams.set('type', type)
        if (subType) queryParams.set('subType', subType)
        if (location) queryParams.set('location', location)
        
        if (queryParams.toString()) {
          url += `?${queryParams.toString()}`
        }
        
        const cacheKey = generateCacheKey('petfinder_all_pets', {
          type: type || 'all',
          subType,
          location
        })
        
        const cachedData = getFromSessionStorage(cacheKey)
        
        if (cachedData) {
          console.log(`Using cached pet data for: ${cacheKey}`)
          setPets(cachedData)
          setLoading(false)
          return
        }
        
        console.log(`Fetching pets from: ${url}`)
        
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Fetched data:', { 
          petCount: data.pets?.length || 0, 
          pagination: data.pagination,
          firstPet: data.pets && data.pets.length > 0 ? data.pets[0] : 'No pets found'
        })
        
        if (data.pets && Array.isArray(data.pets)) {
          // Save the fetched data to session storage (cache for 30 minutes)
          saveToSessionStorage(cacheKey, data.pets, 30)
          setPets(data.pets)
        } else {
          console.error('Invalid pets data format:', data)
          setPets([])
        }
      } catch (err) {
        console.error('Error fetching pets:', err)
        setError(err.message)
        setPets([])
      } finally {
        setLoading(false)
      }
    }

    fetchPets()
  }, [type, subType, location]) // Re-fetch when type, subType, or location changes

  // Determine page title based on type and subType
  let pageTitle = 'All Pets Available for Adoption'
  
  if (type) {
    if (type === 'scales-fins-other' && subType) {
      if (subType === 'reptile') {
        pageTitle = 'Reptiles Available for Adoption'
      }
      else if (subType === 'fish') {
        pageTitle = 'Fish Available for Adoption'
      }
    } else if (type === 'dog') {
      pageTitle = 'Dogs Available for Adoption'
    } else if (type === 'cat') {
      pageTitle = 'Cats Available for Adoption'
    } else if (type === 'bird') {
      pageTitle = 'Birds Available for Adoption'
    } else if (type === 'small-pets') {
      pageTitle = 'Small Pets Available for Adoption'
    } else {
      // Capitalize and pluralize the type for the title
      const typeName = type.charAt(0).toUpperCase() + type.slice(1)
      pageTitle = `${typeName}s Available for Adoption`
    }
  }

  return (
    <div className="pt-[10vh] pb-24 w-full max-w-screen-xl mx-auto px-4">
      <LoadingBar 
        isLoading={loading}
        message={loading ? "Loading Pets..." : ""}
      />
      <h1 className="text-3xl font-bold text-center my-8">
        {pageTitle}
      </h1>
      
      <FilterButtons activeType={type || 'all'} />
      
      {error ? (
        <div className="text-center py-10 text-red-500">
          Error: {error}
        </div>
      ) : (
        <PetGrid pets={pets} goToDetailPage={goToDetailPage}/>
      )}
    </div>
  )
}

export default AllPetsPageClient