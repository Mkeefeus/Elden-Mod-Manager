import {
  createTheme,
  Button,
  Badge,
  MantineThemeOverride,
  CSSVariablesResolver,
  MantineColorScheme,
  MantineColorSchemeManager,
} from '@mantine/core';

interface MantineProviderProps {
  /** Theme override object */
  theme?: MantineThemeOverride;

  /** Used to retrieve/set color scheme value in external storage, by default uses `window.localStorage` */
  colorSchemeManager?: MantineColorSchemeManager;

  /** Default color scheme value used when `colorSchemeManager` cannot retrieve value from external storage, `light` by default */
  defaultColorScheme?: MantineColorScheme;

  /** Forces color scheme value, if set, MantineProvider ignores `colorSchemeManager` and `defaultColorScheme` */
  forceColorScheme?: 'light' | 'dark';

  /** CSS selector to which CSS variables should be added, `:root` by default */
  cssVariablesSelector?: string;

  /** Determines whether theme CSS variables should be added to given `cssVariablesSelector`, `true` by default */
  withCssVariables?: boolean;

  /** Determines whether CSS variables should be deduplicated: if CSS variable has the same value as in default theme, it is not added in the runtime. `true` by default. */
  deduplicateCssVariables?: boolean;

  /** Function to resolve root element to set `data-mantine-color-scheme` attribute, must return undefined on server, `() => document.documentElement` by default */
  getRootElement?: () => HTMLElement | undefined;

  /** A prefix for components static classes (for example {selector}-Text-root), `mantine` by default */
  classNamesPrefix?: string;

  /** Function to generate nonce attribute added to all generated `<style />` tags */
  getStyleNonce?: () => string;

  /** Function to generate CSS variables based on theme object */
  cssVariablesResolver?: CSSVariablesResolver;

  /** Determines whether components should have static classes, for example, `mantine-Button-root`. `true` by default */
  withStaticClasses?: boolean;

  /** Determines whether global classes should be added with `<style />` tag. Global classes are required for `hiddenFrom`/`visibleFrom` and `lightHidden`/`darkHidden` props to work. `true` by default. */
  withGlobalClasses?: boolean;

  /** Your application */
  children?: React.ReactNode;
}

export const theme: MantineThemeOverride = createTheme({
  fontFamily: 'Montserrat, sans-serif',
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
    '6xl': '60px',
  },
  primaryColor: 'dark',
  colors: {
    orange: [
      '#ffebe5',
      '#ffd5cd',
      '#ffab9b',
      '#ff7d63',
      '#ff5636',
      '#ff3e18',
      '#ff2f07',
      '#e42100',
      '#cc1a00',
      '#b20c00',
    ],
  },
  components: {
    Button: Button.extend({
      defaultProps: {
        variant: 'outline',
        color: 'orange.3',
        c: 'orange.1',
      },
    }),
    Badge: {
      defaultProps: {
        color: 'orange',
        gradient: { from: 'orange.4', to: 'orange.5', deg: 45 },
      },
    },
    Text: {
      defaultProps: {
        color: 'orange.1',
      },
    },
    Title: {
      defaultProps: {
        order: 1,
        style: { color: 'orange.4' },
      },
    },
  },
});
