"use client"

import React, { useState, useEffect } from "react"
import { Progress } from "./progress"
import { createPortal } from "react-dom"

/**
 * @component LoadingBar => returns a loading bar component that displays a loading message and progress.
 * outputs a loading bar with a message and progress percentage.
 * 
 */
const LoadingBar = ({
  isLoading = false,
  showOverlay = true,
  progress = null,
  message = "Loading...",
  onComplete = () => {},
  loadingTime = 2000,
}) => {
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [mounted, setMounted] = useState(false)

  // This effect is used to set the mounted state to true when the component mounts and false when it unmounts.
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // This effect is used to update the loading progress and call the onComplete function when the loading is complete.
  useEffect(() => {
    let timer
    if (isLoading) {
      setLoadingProgress(0)
      
      // If progress is provided, use it to set the loading progress
      if (progress !== null) {
        setLoadingProgress(progress)
        if (progress >= 100) {
          setTimeout(() => onComplete(), 300) 
        }
        return
      }

      const interval = 100
      const increment = (100 * interval) / loadingTime
      
      // If no progress is provided, set the loading progress to 0 and start the timer
      timer = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 99) {
            clearInterval(timer)
            return 100
          }
          return Math.min(prev + increment, 99)
        })
      }, interval)

      setTimeout(() => {
        setLoadingProgress(100)
        clearInterval(timer)
        setTimeout(() => onComplete(), 300)
      }, loadingTime)
    } else {
      setLoadingProgress(0)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isLoading, progress, loadingTime, onComplete])

  if (!mounted || !isLoading) {
    return null
  }

  const content = (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-300">
      {showOverlay && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}
      <div className="relative z-10 w-full max-w-md px-6 py-8 bg-white dark:bg-darkTheme rounded-xl shadow-lg">
        <div className="mb-3 font-semibold text-center text-lg text-gray-800 dark:text-white">
          {message}
        </div>
        <Progress 
          value={loadingProgress} 
          className="h-3 bg-orange-100 dark:bg-gray-700"
        />
        <div className="mt-2 text-right text-sm text-gray-600 dark:text-gray-300">
          {Math.round(loadingProgress)}%
        </div>
      </div>
    </div>
  )

  return mounted ? createPortal(content, document.body) : null
}

/**
 * 
 * @param {*} WrappedComponent => The component to be wrapped with the loading bar.
 * @returns {JSX.Element} A component that wraps the provided component with a loading bar.
 */
export const withLoading = (WrappedComponent) => {
  return (props) => {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("Loading...")
    
    // This function starts the loading process and sets a custom message if provided.
    const startLoading = (customMessage) => {
      if (customMessage) setMessage(customMessage)
      setLoading(true)
      return new Promise(resolve => {
        setTimeout(() => {
          setLoading(false)
          resolve()
        }, 2000)
      })
    }
    
    const stopLoading = () => {
      setLoading(false)
    }

    return (
      <>
        <LoadingBar isLoading={loading} message={message} />
        <WrappedComponent 
          {...props} 
          startLoading={startLoading}
          stopLoading={stopLoading}
          isLoading={loading}
        />
      </>
    )
  }
}

/**
 * useLoading => A custom hook that provides loading state and functions to control the loading bar.
 * @returns {Object} An object containing the loading state, startLoading function, stopLoading function, and LoadingBarComponent.
 */
export const useLoading = () => {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("Loading...")
  
  const startLoading = (customMessage) => {
    if (customMessage) setMessage(customMessage)
    setLoading(true)
    return new Promise(resolve => {
      setTimeout(() => {
        setLoading(false)
        resolve()
      }, 2000)
    })
  }
  
  const stopLoading = () => {
    setLoading(false)
  }

  const LoadingBarComponent = () => (
    <LoadingBar isLoading={loading} message={message} />
  )

  return {
    isLoading: loading,
    startLoading,
    stopLoading,
    setLoadingMessage: setMessage,
    LoadingBarComponent
  }
}

export { LoadingBar }
