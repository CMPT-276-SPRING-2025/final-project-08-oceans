"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

//Wrapper for providing the theme of the website
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
} 