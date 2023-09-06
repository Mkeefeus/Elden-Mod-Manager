import { Button, Typography, Box, Stack } from "@mui/material";
import ProfileGrid from "./ProfileGrid";

const Home = () => {
  const homeContainerStyle = {
    flexGrow: 1,
    py: 2,
    px: 2,
  };

  return (
    <Box sx={homeContainerStyle}>
      <Stack spacing={2}>
        <Typography variant="h4">Recent Profiles</Typography>
        <ProfileGrid />
      </Stack>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Quick Actions
      </Typography>
      <Stack spacing={5} direction={"column"} justifyContent={"space-between"} alignItems={'flex-start'}>
        <Button variant="contained">Play Unmodded</Button>
        <Button variant="contained">Create a Profile</Button>
        <Button variant="contained">Add a File Mod</Button>
        <Button variant="contained">Add a DLL Mod</Button>
      </Stack>
    </Box>
  );
};

export default Home;
