import fs from 'fs';

const allLicenses = JSON.parse(fs.readFileSync('./all_licenses.json', 'utf8'));

const licenses = {
  me3: {
    licenses: 'Apache-2.0',
    repository: 'https://github.com/garyttierney/me3',
    licenseURL: 'https://raw.githubusercontent.com/garyttierney/me3/refs/heads/main/LICENSE-APACHE',
    parents: 'elden-mod-manager',
  },
  ...allLicenses,
};

fs.writeFileSync('./public/licenses.json', JSON.stringify(licenses, null, 2));
fs.unlinkSync('./all_licenses.json');
console.log('licenses.json created successfully.');
