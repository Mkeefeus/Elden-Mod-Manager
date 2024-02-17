import ViteDemo from './ViteDemo';
import Home from './Home';
import Mods from './Mods';
import Profiles from './Profiles';
import Settings from './Settings';
import About from './About';

export type Page = {
  DisplayName: string;
  Route: string;
  Element: () => JSX.Element;
};

export const pages: Page[] = [
  {
    DisplayName: 'Home',
    Route: '/',
    Element: ViteDemo,
    // Element: Home
  },
  {
    DisplayName: 'Mods',
    Route: '/mods',
    Element: Mods,
  },
  {
    DisplayName: 'Profiles',
    Route: '/profiles',
    Element: Profiles,
  },
  {
    DisplayName: 'Settings',
    Route: '/settings',
    Element: Settings,
  },
  {
    DisplayName: 'About',
    Route: '/about',
    Element: About,
  },
];
