import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'coconect: — Make Networking Great Again',
    short_name: 'coconect',
    description: "We find the people you need, in the places you'll love.",
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#e11d48',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
