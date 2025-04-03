'use client';

import React from 'react';
import { Input } from "@/components/ui/input";

const LocationSearchInput = ({ value, onChange, className }) => {
  let inputClassName = "flex-1 bg-white border border-orange-400 hover:border-2";

  if (className) {
    inputClassName += ` ${className}`;
  }

  return (
    <Input
      placeholder="Location"
      className={inputClassName}
      value={value}
      onChange={onChange}
    />
  );
};

export {LocationSearchInput};