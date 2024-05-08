import { createTheme, Button, MantineThemeOverride, AppShell, Checkbox, Table } from '@mantine/core';

export const theme: MantineThemeOverride = createTheme({
  fontFamily: 'Montserrat, sans-serif',
  primaryColor: 'orange',
  primaryShade: 3,
  components: {
    AppShell: AppShell.extend({
      defaultProps: {
        padding: 'md',
        c: 'orange.3',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        variant: 'outline',
        color: 'orange.3',
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
  },
});
