import React, { useState } from "react";
import { Typography, Box, Button, TextField, Stack } from "@mui/material";
import { createTheme, ThemeProvider, Theme, useTheme, styled } from '@mui/material/styles';
import { FolderCopy } from "@mui/icons-material";
// const { dialog } = require('electron');

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
            borderBottom: '2px solid var(--TextField-brandBorderFocusedColor)',
          },
        },
      },
    },
  },
});

const VisuallyHiddenInput = styled('input')`
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  bottom: 0;
  left: 0;
  white-space: nowrap;
  width: 1px;
`;

const Settings = () => {
  const outerTheme = useTheme();
  const [exePath, setExePath] = useState<any>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("")

  const homeContainerStyle = {
    flexGrow: 1,
    py: 2,
    px: 2,
  };

  function handleInputChange(e: any) {
    console.log(e.target)
    console.log(e.target.value)
    // dialog.showOpenDialog({ properties: ['openFile'] }).then(result => {
    //   if (result.canceled) {
    //     console.log("No file selected!");
    //   } else {
    //     console.log(result.filePaths[0]);
    //     setExePath(result.filePaths[0]);
    //   }
    // })
  }

  return (
    <Box sx={homeContainerStyle}>
      <Typography variant={"h4"} sx={{paddingBottom: '3rem'}}> Settings </Typography>
      <ThemeProvider theme={customTheme(outerTheme)}>
        <Stack 
          spacing={2} 
          direction={"row"}
        >
          <TextField 
            variant="filled" 
            label="Elden Ring Exe Path" 
            color="secondary" 
            sx={{
              flexBasis: 800
            }} 
            focused
          />
          <Button
            component="label"
            variant="contained"
            startIcon={<FolderCopy />}
            // href="#file-upload"
            sx={{flexBasis: 200}}
          >
            Select Path
          <VisuallyHiddenInput onChange={handleInputChange} type="file" accept=".exe"/>
          </Button>
        </Stack>
      </ThemeProvider>
    </Box>
)};

export default Settings;
