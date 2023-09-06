import {
  Unstable_Grid2 as Grid,
  Paper,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ProfileOptionsMenu from "./ProfileOptionsMenu";
import {useState} from 'react'

const ProfileGrid = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isOpen = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <Grid
      container
      spacing={{ xs: 2, md: 3 }}
      columns={{ xs: 4, sm: 8, md: 12 }}
    >
      {Array.from(Array(6)).map((_, index) => (
        <Grid xs={2} sm={4} md={4} key={index}>
          <Paper
            elevation={12}
            sx={{
              display: "flex",
              p: 2,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Button variant="contained">{"Play"}</Button>
            <Typography>{"Profile " + index}</Typography>
            <IconButton id="profile-options-menu" onClick={handleClick}>
              <MoreVertIcon />
            </IconButton>
            <ProfileOptionsMenu isOpen={isOpen} handleClose={handleClose} anchorEl={anchorEl}/>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default ProfileGrid;
