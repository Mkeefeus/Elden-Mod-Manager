import { Menu, MenuItem } from '@mui/material'

type ProfileOptionsMenuProps = {
    anchorEl: HTMLElement | null
    handleClose: () => void
    isOpen: boolean
}

const ProfileOptionsMenu = ({anchorEl, handleClose, isOpen}: ProfileOptionsMenuProps) => {
  return (
    <Menu
        id="profile-options-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={handleClose}>Play</MenuItem>
        <MenuItem onClick={handleClose}>Edit</MenuItem>
        <MenuItem onClick={handleClose}>Duplicate</MenuItem>
        <MenuItem onClick={handleClose} sx={{color: 'red'}}>Delete</MenuItem>
      </Menu>
  )
}

export default ProfileOptionsMenu