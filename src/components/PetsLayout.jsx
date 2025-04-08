'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const PetsLayoutClient = ({ children }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = searchParams.get('type') || 'all';

    // Get the current pathname to determine if we are on the pets page
    const handleCategoryChange = (category) => {
      router.push(category === 'all' ? '/pets_all' : `/pets_all?type=${category}`);
    };

    return (
        <div className="w-full pt-[100px]">
          <Tabs value={type} onValueChange={handleCategoryChange} className="w-full flex justify-center items-center">
            <TabsList className="bg-transparent p-0 h-auto gap-4 flex justify-center">
              {["all", "cat", "dog", "bird"].map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className={`px-4 py-2 rounded-full text-md font-medium border transition-colors
                    ${type === category ? "bg-orange-500 text-white" : "bg-orange-100 text-black hover:bg-orange-500 hover:text-white"}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6">{children}</div>
        </div>
    );
};

// Main layout component
const PetsLayout = ({ children }) => {
  return <PetsLayoutClient>{children}</PetsLayoutClient>;
};

export default PetsLayout;
