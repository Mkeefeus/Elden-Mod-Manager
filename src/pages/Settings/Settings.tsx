import { useState } from 'react';
import { Typography, Box, Button, TextField, Stack } from '@mui/material';
import {
  createTheme,
  ThemeProvider,
  Theme,
  useTheme,
} from '@mui/material/styles';
import { FolderCopy } from '@mui/icons-material';
import EldenRingPath from './EldenRingPath';

const customTheme = (outerTheme: Theme) =>
  createTheme({
    palette: {
      mode: outerTheme.palette.mode,
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            '--TextField-brandBorderColor': '#E0E3E7',
            '--TextField-brandBorderHoverColor': '#B2BAC2',
            '--TextField-brandBorderFocusedColor': '#e8f4ff',
            '& label.Mui-focused': {
              color: 'var(--TextField-brandBorderFocusedColor)',
            },
          },
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: {
            '&:before, &:after': {
              borderBottom: '2px solid var(--TextField-brandBorderColor)',
            },
            '&:hover:not(.Mui-disabled, .Mui-error):before': {
              borderBottom: '2px solid var(--TextField-brandBorderHoverColor)',
            },
            '&.Mui-focused:after': {
              borderBottom:
                '2px solid var(--TextField-brandBorderFocusedColor)',
            },
          },
        },
      },
    },
  });

const Settings = () => {
  const outerTheme = useTheme();
  const [exePath, setExePath] = useState<string>('');

  const homeContainerStyle = {
    flexGrow: 1,
    py: 2,
    px: 2,
  };

  async function handleButtonClick() {
    const filePath = await window.electronAPI.getFile();
    if (filePath) {
      setExePath(filePath);
    }
  }

  return (
    <Box sx={homeContainerStyle}>
      <Typography variant={'h4'} sx={{ paddingBottom: '3rem' }}>
        {' '}
        Settings{' '}
      </Typography>
      <ThemeProvider theme={customTheme(outerTheme)}>
        <EldenRingPath exePath={exePath} handleClick={handleButtonClick} />
      </ThemeProvider>
    </Box>
  );
};

export default Settings;
