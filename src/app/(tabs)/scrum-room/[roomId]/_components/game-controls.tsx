import { Button } from '@/components/ui/button'
import React from 'react'
import { IconRestore } from '@tabler/icons-react';

const GameControls = () => {
  return (
    <div className='flex items-center gap-x-4'>
      <Button variant='default' size="sm">
        <IconRestore />
        Restart Game
      </Button>
    </div>
  )
}

export default GameControls
