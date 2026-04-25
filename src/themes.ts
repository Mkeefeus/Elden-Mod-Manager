import {
  createTheme,
  Button,
  MantineThemeOverride,
  AppShell,
  Checkbox,
  Table,
  Modal,
  NavLink,
  MantineColorsTuple,
} from '@mantine/core';

const gold: MantineColorsTuple = [
  '#fdf6ec',
  '#f5e4c3',
  '#e8cc94',
  '#d9b468',
  '#c89b4a',
  '#9E7B3A',
  '#7d6030',
  '#5e4724',
  '#42311a',
  '#291e0d',
];

export const theme: MantineThemeOverride = createTheme({
  fontFamily: 'Montserrat, sans-serif',
  primaryColor: 'gold',
  primaryShade: 5,
  colors: { gold },
  headings: {
    fontFamily: 'Cinzel, serif',
  },
  components: {
    AppShell: AppShell.extend({
      defaultProps: {
        padding: 'md',
        c: 'gold.3',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        variant: 'outline',
        color: 'gold.5',
      },
    }),
    Checkbox: Checkbox.extend({
      defaultProps: {
        color: 'green.9',
      },
    }),
    TableTd: Table.Td.extend({
      defaultProps: {
        style: { textAlign: 'center' },
      },
    }),
    TableTh: Table.Td.extend({
      defaultProps: {
        style: { textAlign: 'center' },
      },
    }),
    Modal: Modal.extend({
      defaultProps: {
        overlayProps: { opacity: 0.65, blur: 2 },
      },
      styles: {
        title: {
          fontFamily: 'Cinzel, serif',
          letterSpacing: '0.06em',
          fontSize: 'var(--mantine-font-size-lg)',
        },
        header: {
          borderBottom: '1px solid var(--mantine-color-gold-7)',
          marginBottom: 'var(--mantine-spacing-sm)',
        },
      },
    }),
    NavLink: NavLink.extend({
      styles: {
        label: {
          fontFamily: 'Cinzel, serif',
          letterSpacing: '0.05em',
          fontSize: 'var(--mantine-font-size-sm)',
        },
      },
    }),
  },
});
