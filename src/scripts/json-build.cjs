const path = require('path');
const fs = require('fs');
const jsonc = require('jsonc-parser');

const dirSrcAssets = path.join(__dirname, '../assets');
const dirOutAssets = path.join(__dirname, '../../assets');
const guids = new Set();

const everything = {};

// Clean output directory
if (fs.existsSync(dirOutAssets)) {
  fs.readdirSync(dirOutAssets).forEach(file => {
    fs.unlinkSync(path.join(dirOutAssets, file));
  });
} else {
  fs.mkdirSync(dirOutAssets);
}

fs.readdirSync(dirSrcAssets).forEach(folderName => {
  const dirAsset = path.join(dirSrcAssets, folderName);
  if (!fs.statSync(dirAsset).isDirectory()) { return; }

  const items = [];

  // Read all JSONC files in the folder
  const readFolder = (dirCurrent) => {
    fs.readdirSync(dirCurrent).forEach(file => {
      // Support subfolders recursively.
      if (fs.statSync(path.join(dirCurrent, file)).isDirectory()) {
        readFolder(path.join(dirCurrent, file));
        return;
      }

      // Only jsonc files.
      if (!file.endsWith('.jsonc')) {
        console.warn('Skipping non-jsonc file:', file);
        return;
      }

      // Parse file.
      const filePath = path.join(dirCurrent, file);
      const jsoncContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = jsonc.parse(jsoncContent);
      
      // Check format.
      if (!Array.isArray(jsonData)) {
        console.error('Expected an array in file:', filePath);
        process.exit(1);
      }
  
      // Add items.
      jsonData.forEach(item => {
        if (item.guid) { 
          if (guids.has(item.guid)) {
            console.error('Duplicate GUID found:', item.guid, 'in file:', filePath);
            process.exit(1);
          }
          guids.add(item.guid);
        }

        items.push(item);
      });
    });
  };

  readFolder(dirAsset);  

  // Write data
  const data = { items };  
  const camelCaseFolderName = folderName.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  everything[camelCaseFolderName] = data;
  console.log('Writing', items.length, 'items to', `${folderName}.json`);
  fs.writeFileSync(path.join(dirOutAssets, `${folderName}.json`), JSON.stringify(data));
});

// Write everything.json
console.log('Writing everything.json');
fs.writeFileSync(path.join(dirOutAssets, `everything.json`), JSON.stringify(everything));