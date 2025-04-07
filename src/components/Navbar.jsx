import React from 'react'
import { assets } from '@/assets/assets'
import Image from 'next/image'

const Navbar = () => {

  return (
    <nav className="w-full fixed top-0 left-0 right-0 z-50
    px-5 lg:px-8 xl:px-[8%] py-4 flex items-center bg-orange-50 text-gray-900 shadow-md h-2/23 ">

        <div className="flex items-center pr-20 ">
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

        <ul className={`flex items-center gap-22 rounded-full  py-3 text-2xl pl-5 `}>
                <li><a href="/" className='hover:text-orange-500 transition duration-150' >Home</a></li>
                <li><a href="/shelters" className='hover:text-orange-500 transition duration-150'>Shelters</a></li>
                <li><a href="/quiz" className='hover:text-orange-500 transition duration-150'>Quiz</a></li>
                <li><a href="/pets_all" className='hover:text-orange-500 transition duration-150'>Pets</a></li>
        </ul>
        

        <div className='flex ml-auto gap-4 '>
            <a href="/contact" className="flex gap-3 px-10 py-2.5 border border-orange-500 bg-orange-500 shadow-lg
                text-white rounded-full ml-4 font-Ovo hover:bg-orange-600 hover:border-orange-600 transition text-xl"> 
            Contact 
            </a>
        </div>
  </nav>
  )
}

export default Navbar
