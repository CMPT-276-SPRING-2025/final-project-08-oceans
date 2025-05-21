"use client";

import React, { useState } from 'react';
import { assets } from '@/assets/assets';
import Image from 'next/image';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] w-full px-5 lg:px-8 xl:px-[8%] py-4 flex items-center bg-orange-50 text-gray-900 shadow-md">
        
        {/* Logo */}
        <div className="flex items-center">
          <a href="/">
          <Image 
                src={assets.icon_paw} 
                alt="Paw" 
                width={32}
                height={32}
                priority
                />
          </a>
        </div>

        {/* Desktop Menu */}
        <ul className="hidden md:flex items-center gap-10 text-2xl pl-10">
          <li><a href="/" className="hover:text-orange-500">Home</a></li>
          <li><a href="/shelters" className="hover:text-orange-500">Shelters</a></li>
          <li><a href="/quiz" className="hover:text-orange-500">Quiz</a></li>
          <li><a href="/pets_all" className="hover:text-orange-500">Pets</a></li>
        </ul>

        {/* Right Side */}
        <div className="ml-auto flex items-center gap-4">
          {/* Desktop Contact Button */}
          <a href="/contact" className="hidden md:flex px-6 py-2 border border-orange-500 bg-orange-500 text-white rounded-full hover:bg-orange-600">
            Contact
          </a>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMenuOpen(true)} className="block md:hidden z-[1010]">
            <Image 
              src={assets.menu} 
              alt="menu" 
              width={28} 
              height={28}
              style={{ width: 'auto', height: 'auto' }}
            />
          </button>
        </div>
      </nav>

      {/* Slide-In Mobile Menu */}
      <div
        className={`fixed top-0 right-0 w-64 h-full z-[1000] bg-orange-100 shadow-lg p-6 transition-transform duration-300 md:hidden ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-end">
          <button onClick={() => setIsMenuOpen(false)}>
            <Image 
              src={assets.close} 
              alt="close" 
              width={20} 
              height={20}
              style={{ width: 'auto', height: 'auto' }}
            />
          </button>
        </div>
        <ul className="flex flex-col mt-10 gap-6 text-lg font-normal">
          <li onClick={() => setIsMenuOpen(false)}><a href="/">Home</a></li>
          <li onClick={() => setIsMenuOpen(false)}><a href="/shelters">Shelters</a></li>
          <li onClick={() => setIsMenuOpen(false)}><a href="/quiz">Quiz</a></li>
          <li onClick={() => setIsMenuOpen(false)}><a href="/pets_all">Pets</a></li>
          <li onClick={() => setIsMenuOpen(false)}><a href="/contact">Contact</a></li>
        </ul>
      </div>
    </>
  );
};

export default Navbar;
