'use client'

import PopoverForm from '@/components/ui/popover-form';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import { useTheme } from 'next-themes'
import React, { useState, type ReactNode } from 'react'

type Theme = "light" | "dark" | "system";

const ThemeMap: Record<Theme, ReactNode> = {
  dark: <IconMoon className='w-full h-full' />,
  light: <IconSun className='w-full h-full' />,
  system: <IconDeviceDesktop className='w-full h-full' />
}

const ThemeSwitcher = () => {
  const { setTheme, themes, theme, systemTheme } = useTheme();
  const [open, setOpen] = useState(false)


  return (
      <PopoverForm
        showSuccess={false}
        title="Choose a theme"
        preferIcon
        icon={ThemeMap[theme as Theme]}
        open={open}
        setOpen={setOpen}
        width="200px"
        popupClass='-top-24'
        height="175px"
        showCloseButton={true}
        openChild={
          <div className="p-2">

            <div className="pt-2 space-y-2 z-0">
              {themes.map((t) => {
                const isSelected = theme === t
                const effectiveTheme: Theme = (t === "system" ? systemTheme : t) as Theme

                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      setOpen(false);
                    }}
                    className={`w-full  flex items-center px-3 py-2 text-sm rounded-md ${
                      isSelected
                        ? `bg-primary ${
                            effectiveTheme === "light"
                              ? "text-white"
                              : "text-black"
                          }`
                        : ` hover:text-black hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white dark:text-white`
                    }`}
                  >
                    {t === "light" && <IconSun className="mr-2 h-4 w-4" />}
                    {t === "dark" && <IconMoon className="mr-2 h-4 w-4 " />}
                    {t === "system" && <IconDeviceDesktop className="mr-2 h-4 w-4" />}
                    <span className="capitalize">{t}</span>
                  </button>
                )
              })}
            </div>
          </div>
        }
      />
  )
}

export default ThemeSwitcher
