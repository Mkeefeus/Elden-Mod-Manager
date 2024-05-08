import Home from './Home';
import Mods from './Mods';
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
    displayName: 'About',
    route: '/about',
    element: About,
  },
];
