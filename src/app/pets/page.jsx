'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react'

const Pets = ({ children }) => {
    // Handles multiple page routes
    const router = useRouter();
    const pathname = usePathname();
    const activeCategory = pathname.split('/')[1] || 'pets_all';
  
    useEffect(() => {
        if (!["pets_all", "pets_cats", "pets_dogs", "pets_fish"].includes(activeCategory)) {
          router.push('/pets_all'); // Redirect to default if an invalid category
        }
      }, [activeCategory, router]);

    const handleCategoryChange = (category) => {
      router.push(`/${category}`);
    };

    return (
        <div className="w-full p-6">
          {/* Tabs Navigation */}
          <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
            <TabsList className="bg-transparent p-0 h-auto space-x-2 flex">
              {["pets_all", "pets_cats", "pets_dogs", "pets_fish"].map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                    ${
                      activeCategory === category
                        ? "border-purple-500 outline outline-2 outline-purple-500 bg-orange-500 text-white"
                        : "bg-orange-100 text-black hover:bg-orange-500 hover:text-white"
                    }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
    
          {/* Page Content */}
          <div className="mt-6">{children}</div>
        </div>
      );
    };

export default Pets
