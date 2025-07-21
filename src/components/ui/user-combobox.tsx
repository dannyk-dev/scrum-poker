'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { api } from '@/trpc/react'
import { Spinner } from '@/components/ui/spinner'

type Props = {
  value: string[];
  onValueChange: (value: string[]) => void;
}

const ComboboxUsers = ({ value, onValueChange }: Props) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { data, isLoading } = api.game.getPlayerEmails.useQuery(undefined, {
    enabled: open
  });

  const options = useMemo(() => {
    if (!data) return [];

    return data.map(user => ({
      label: `${user.name} - ${user.email}`,
      value: user.email!
    }))
  }, [data]);

  const [selectedValues, setSelectedValues] = useState<string[]>(value)

  const toggleSelection = (value: string) => {
    setSelectedValues(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]))
  }

  useEffect(() => {
    onValueChange(selectedValues);
  }, [selectedValues, onValueChange])

  const removeSelection = (value: string) => {
    setSelectedValues(prev => prev.filter(v => v !== value))
  }

  const maxShownItems = 2
  const visibleItems = expanded ? selectedValues : selectedValues.slice(0, maxShownItems)
  const hiddenCount = selectedValues.length - visibleItems.length

  return (
    <div className='w-full max-w-full space-y-2'>
      {/* <Label htmlFor={id}>Multiple combobox expandable</Label> */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className='h-auto  min-h-8 w-full justify-between hover:bg-transparent'
          >
            <div className='flex flex-wrap items-center gap-1 pe-2.5'>
              {selectedValues.length > 0 ? (
                <>
                  {visibleItems.map(val => {
                    const user = options.find(c => c.value === val)

                    return user ? (
                      <Badge key={val} variant='outline'>
                        {user.label}
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-4'
                          onClick={e => {
                            e.stopPropagation()
                            removeSelection(val)
                          }}
                          asChild
                        >
                          <span>
                            <XIcon className='size-3' />
                          </span>
                        </Button>
                      </Badge>
                    ) : null
                  })}
                  {hiddenCount > 0 || expanded ? (
                    <Badge
                      variant='outline'
                      onClick={e => {
                        e.stopPropagation()
                        setExpanded(prev => !prev)
                      }}
                    >
                      {expanded ? 'Show Less' : `+${hiddenCount} more`}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <span className='text-muted-foreground'>Select User</span>
              )}
            </div>
            <ChevronsUpDownIcon size={16} className='text-muted-foreground/80 shrink-0' aria-hidden='true' />
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-(--radix-popper-anchor-width) p-0'>
          {isLoading ? (
            <div className="w-full py-6">
              <Spinner size='medium' className='mx-auto' />
            </div>
          ) : (
            <Command>
            <CommandInput placeholder='Search framework...' />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {options.map(option => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => toggleSelection(option.value)}
                  >
                    <span className='truncate'>{option.label}</span>
                    {selectedValues.includes(option.value) && <CheckIcon size={16} className='ml-auto' />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default ComboboxUsers
