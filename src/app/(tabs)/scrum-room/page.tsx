import React from 'react'

type Props = {}

const ScrumRoomPage = (props: Props) => {
  return (
    <div className='w-full h-full flex flex-col items-center justify-center mx-auto'>
      <h1 className="text-2xl leading-loose">Welcome to scrum poker.</h1>
      <p>Choose a room or create a new one</p>
    </div>
  )
}

export default ScrumRoomPage
