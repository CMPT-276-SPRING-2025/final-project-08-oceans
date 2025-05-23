'use client'

import React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { assets } from '../assets/assets'
import Link from 'next/link'

const LandingPage = () => {
  return (
    <div className='px-[10%] lg:pl-[12%] py-20 scroll-mt-[100px] min-h-screen bg-orange-50 flex items-center justify-center'>
      <div className='flex w-full flex-col lg:flex-row items-center gap-24 mx-auto'>
        <div className='lg:w-5/9 w-full flex flex-col items-center text-center space-y-6'>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className='lg:w-5/9 w-full flex flex-col items-center text-center space-y-6 max-w-2xl'
          >
          <h2 className="text-3xl md:text-5xl font-bold text-[#0D0D46] leading-tight md:whitespace-nowrap">
            Find Your Purrfect Pet Match
          </h2>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}
            className='text-base sm:text-xl text-gray-700 max-w-2xl leading-relaxed mt-3'
          >
            Adopting a pet has never been easier! <span className="font-semibold">LoveAtFirstPaw</span> 
            connects you with cats and dogs from nearby shelters based on your personality and lifestyle. 
            Take a quick quiz and discover your ideal furry companion today!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut', delay: 0.8 }}
          >
            <Link href="/quiz">
              <button className="bg-orange-500 text-white md:text-xl font-semibold py-4 px-8 rounded-full shadow-md hover:bg-orange-600 transition mt-5">
                Take a quiz!
              </button>
            </Link>
          </motion.div>
    
        </div>

        <div className='lg:w-5/12 lg:flex hidden justify-center'>
          <div className='w-72 sm:w-80 lg:w-96 rounded-3xl overflow-hidden'>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut',}}
            className="w-72 sm:w-80 lg:w-96 rounded-3xl overflow-hidden"
          >
            <Image 
              src={assets.home_cat} 
              alt='cat picture' 
              className='w-full rounded-3xl object-cover' 
              width={350}
              height={350}
            />
          </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
