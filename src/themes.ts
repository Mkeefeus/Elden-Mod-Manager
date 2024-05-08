import { createTheme, Button, MantineThemeOverride } from '@mantine/core';

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
