'use client'

import React, { useEffect, useState } from 'react'
import PetGrid from '@/components/PetGrid'
import FilterButtons from '@/components/FilterButtons'

const DogsPage = () => {
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const response = await fetch('/pets?type=dog')
        if (!response.ok) {
          throw new Error('Failed to fetch dogs')
        }
        const data = await response.json()
        setPets(data)
      } catch (error) {
        console.error('Error fetching dogs:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPets()
  }, [])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dogs...</div>
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Dogs Available for Adoption</h1>
      <FilterButtons />
      <PetGrid pets={pets} />
    </div>
  )
}

export default DogsPage
