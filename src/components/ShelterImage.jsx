'use client'

import { useState } from 'react'
import Image from 'next/image'
import { assets } from '@/assets/assets'

//ShelterImage: Takes in the src URL, alt description, width/height of an image, formats it into the shleterImage and returns the image
export default function ShelterImage({ src, alt, width, height }) {
  const [imgSrc, setImgSrc] = useState(src || assets.icon_paw)
  const [objectFit, setObjectFit] = useState('cover')

  const handleError = () => {
    setImgSrc(assets.icon_paw)
    setObjectFit('contain')
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={`object-${objectFit}`}
      onError={handleError}
    />
  )
}
