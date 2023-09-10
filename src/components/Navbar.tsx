import React from 'react';
import {Tabs, Tab} from '@mui/material';
import { Link } from 'react-router-dom';

type NavbarProps = {
  selectedTab: number;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
};

const Navbar = ({ selectedTab, handleTabChange }: NavbarProps) => {
  return (
    <Tabs
      value={selectedTab}
      onChange={handleTabChange}
      orientation="vertical"
      sx={{ flexShrink: 0 }}
    >
      <Tab label="Home" component={Link} to="/" />
      <Tab label="Profiles" component={Link} to="profiles" />
      <Tab label="Mods" component={Link} to="mods" />
      <Tab label="DLLs" component={Link} to="dlls" />
      <Tab label="Settings" component={Link} to="settings" />
      <Tab label="About" component={Link} to="about" />
    </Tabs>
  );
};
export default Navbar;
