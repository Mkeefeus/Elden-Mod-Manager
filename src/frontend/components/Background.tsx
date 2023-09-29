import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import home from '@assets/images/Background_Home.png';
import profiles from '@assets/images/Background_Profiles.png';
import mods from '@assets/images/Background_Mods.png';
import dlls from '@assets/images/Background_DLLs.png';
import settings from '@assets/images/Background_Settings.png';

type BackgroundProps = {
  children: React.ReactNode;
};

const Background = ({ children }: BackgroundProps) => {
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const location = useLocation();
  useEffect(() => {
    switch (location.pathname) {
      case '/':
        setBackgroundImage(home);
        break;
      case '/profiles':
        setBackgroundImage(profiles);
        break;
      case '/mods':
        setBackgroundImage(mods);
        break;
      case '/dlls':
        setBackgroundImage(dlls);
        break;
      case '/settings':
        setBackgroundImage(settings);
        break;
      default:
        setBackgroundImage('');
        break;
    }
  }, [location]);
  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        flexGrow: 1,
        height: '100vh',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(to top, transparent, black)',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default Background;
