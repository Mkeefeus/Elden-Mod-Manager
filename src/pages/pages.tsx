import Home from './Home';
import Mods from './Mods';
import About from './About';
import Settings from './Settings';
import ModsProvider from '../providers/ModsProvider';

export type Page = {
  displayName: string;
  route: string;
  element: () => JSX.Element;
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
    element: () => {
      return (
        <ModsProvider>
          <Mods />
        </ModsProvider>
      );
    },
  },
  {
    displayName: 'Settings',
    route: '/settings',
    element: Settings,
  },
  {
    displayName: 'About',
    route: '/about',
    element: About,
  },
];
