import type { NavItem } from "~/components/Navbar.astro";

export const MAIN_NAV_ITEMS: NavItem[] = [
  { type: 'link',  id: 'home',   url: '/',       text: 'Home' },
  { type: 'group', text: 'About',
    links: [
      { id: 'story',         url: '/story',         text: 'Our Story' },
      { id: 'info',      url: '/info',      text: 'Info' },
      { id: 'wedding-party', url: '/wedding-party', text: 'Wedding Party' },
      { id: 'sponsors',  url: '/sponsors',  text: 'Sponsors' },
    ],
  },
  { type: 'group', text: 'The Day',
    links: [
      { id: 'ceremony', url: '/ceremony', text: 'Program' },
      { id: 'events',   url: '/events',   text: 'Events' },
      { id: 'guestbook', url: '/guestbook', text: 'Guestbook' },
      // { id: 'seating',  url: '/seating',  text: 'Seating' }, // hidden until ~1 week before wedding
    ],
  },
  { type: 'group', text: 'Explore',
    links: [
      { id: 'gallery',   url: '/gallery',   text: 'Gallery' },
      { id: 'partners',   url: '/partners',  text: 'Partners' },
    ],
  },
  { type: 'link',  id: 'invite', url: '/invite', text: 'RSVP' },
]