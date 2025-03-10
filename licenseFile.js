import fs from 'fs';

const prdLicense = JSON.parse(fs.readFileSync('./prd_licenses.json', 'utf8'));
const devLicense = JSON.parse(fs.readFileSync('./dev_licenses.json', 'utf8'));

const combinedLicense = {
  ModEngine2: {
    licenses: 'MIT',
    repository: 'https://github.com/soulsmods/ModEngine2',
    licenseURL: 'https://raw.githubusercontent.com/soulsmods/ModEngine2/main/LICENSE-MIT',
    parents: 'elden-mod-manager',
  },
  ...prdLicense,
  ...devLicense,
};

const licensesJSON = JSON.stringify(combinedLicense, null, 2);

fs.writeFile('./public/licenses.json', licensesJSON, (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('licenses.json file has been created successfully.');
});

fs.unlink('./prd_licenses.json', (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('prd_licenses.json file has been deleted successfully.');
});

fs.unlink('./dev_licenses.json', (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('dev_licenses.json file has been deleted successfully.');
});
