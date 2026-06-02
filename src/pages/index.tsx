import React from 'react';
import Home from './Home';
import Mods from './Mods';
import About from './About';
import Settings from './Settings';
import Tools from './Tools';

export type Page = {
  displayName: string;
  route: string;
  element: () => React.JSX.Element;
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
    displayName: 'Tools',
    route: '/tools',
    element: Tools,
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
