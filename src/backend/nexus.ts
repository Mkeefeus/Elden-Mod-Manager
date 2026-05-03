import { version } from '../../package.json';
import { logger } from '../utils/mainLogger';
import { NexusUser } from 'types';

const { debug } = logger;
const NEXUS_API_BASE_URL = 'https://api.nexusmods.com/v1';

export const validateNexusApiKey = async (apiKey: string): Promise<NexusUser> => {
  debug('Validating Nexus API key');
  const headers = {
    apikey: apiKey,
    'Content-Type': 'application/json',
    'Application-Version': version,
    'Application-Name': 'Elden Mod Manager',
  };
  const res = await fetch(`${NEXUS_API_BASE_URL}/users/validate.json`, { headers });
  if (res.status === 401) {
    throw new Error('Invalid API key');
  }
  if (!res.ok) {
    throw new Error(`Nexus API request failed with status ${res.status}`);
  }
  const data = (await res.json()) as {
    user_id: number;
    name: string;
    is_premium: boolean;
    is_supporter: boolean;
    email: string;
    profile_url: string;
  };
  debug(`Nexus API key validated for user: ${data.name}`);
  return {
    userId: data.user_id,
    name: data.name,
    premium: data.is_premium,
    supporter: data.is_supporter,
    email: data.email,
    profileUrl: data.profile_url,
  };
};
