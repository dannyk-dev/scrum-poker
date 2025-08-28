'use client'

import { cn } from '@/lib/utils'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react'

import { Button, Group, Input, NumberField, type NumberFieldProps } from 'react-aria-components'


const InputNumberChevron = ({className, ...props}: NumberFieldProps) => {
  return (
    <NumberField {...props} minValue={0} className={cn('w-fit space-y-2', className)}>
      <Group className='dark:bg-input/30 border-input data-focus-within:border-ring data-focus-within:ring-ring/50 data-focus-within:has-aria-invalid:ring-destructive/20 dark:data-focus-within:has-aria-invalid:ring-destructive/40 data-focus-within:has-aria-invalid:border-destructive relative inline-flex h-9 w-full min-w-0 items-center overflow-hidden rounded-md border bg-transparent text-base whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50 data-focus-within:ring-[3px] md:text-sm'>
        <Input className='selection:bg-primary selection:text-primary-foreground w-full grow px-3 py-2 text-center tabular-nums outline-none' />
        <div className='flex h-[calc(100%+2px)] flex-col'>
          <Button
            slot='increment'
            className='border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground -me-px flex h-1/2 w-6 flex-1 items-center justify-center border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
          >
            <ChevronUpIcon className='size-3' />
            <span className='sr-only'>Increment</span>
          </Button>
          <Button
            slot='decrement'
            className='border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground -me-px -mt-px flex h-1/2 w-6 flex-1 items-center justify-center border text-sm transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
          >
            <ChevronDownIcon className='size-3' />
            <span className='sr-only'>Decrement</span>
          </Button>
        </div>
      </Group>
    </NumberField>
  )
}

export default InputNumberChevron;
