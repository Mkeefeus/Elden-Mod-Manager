import Home from './Home';
import Mods from './Mods';
import Settings from './Settings';
import About from './About';

export type Page = {
  displayName: string;
  route: string;
  element: () => JSX.Element;
  hidden?: boolean;
};

export const pages: Page[] = [
  {
    displayName: 'Home',
    route: '/',
    element: Home,
  },
  {
    displayName: 'Mods',
    route: '/mods',
    element: Mods,
  },
  {
    displayName: 'Settings',
    route: '/settings',
    element: Settings,
    hidden: true,
  },
  {
    displayName: 'About',
    route: '/about',
    element: About,
  },
];
