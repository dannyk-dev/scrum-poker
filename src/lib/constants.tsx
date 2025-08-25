import { AlarmClock, Building2, CreditCard, Settings2, UserCog, Workflow } from 'lucide-react'

export const profileLinks: {
  label: string;
  href: string;
  icon?: React.ReactNode;
}[] = [
  { label: 'My Profile', href: '/profile', icon: <UserCog className='h-5 w-5' /> },
  { label: 'Organization', href: '/organization', icon: <Building2 className='h-5 w-5' /> },
  { label: 'Game Settings', href: '/game', icon: <Settings2 className='h-5 w-5' /> },
  { label: 'Integrations', href: '/integrations', icon: <Workflow className='h-5 w-5' /> },
  { label: 'Notifications', href: '/notifications', icon: <AlarmClock className='h-5 w-5' /> },
  { label: 'Billing', href: '/billing', icon: <CreditCard className='h-5 w-5' /> },
]
