import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Recently Played',
  description: 'View recently played music and listening history.',
}

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return children
}
