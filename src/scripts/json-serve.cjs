const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Define the directory to watch
const watchDir = path.resolve(__dirname, '../assets');

// Initialize the watcher
const watcher = chokidar.watch(watchDir, {
  ignored: /(^|[\/\\])\../, // Ignore dotfiles
  persistent: true,
});

// Log when the watcher is ready
watcher.on('ready', () => {
  console.log(`Watching for changes in: ${watchDir}`);
});

const handle = (event, filePath) => {
  console.log(`Detected ${event} in file: ${filePath}`);
  exec(`node ${path.resolve(__dirname, 'json-build.cjs')}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing json-build.cjs: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error output: ${stderr}`);
      return;
    }
    console.log(`json-build.cjs output: ${stdout}`);
  });
};

let timeout;
watcher.on('all', (event, filePath) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => handle(event, filePath), 300);
});

const notFound = (res) => {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
};

// Create the server
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url !== '/everything.json') {    
    return notFound(res);
  }

  fs.readFile(path.resolve(__dirname, '../../assets/everything.json'), 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error reading file');
      console.error(`Error reading file: ${err.message}`);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(data);
  });
});

// Start the server
server.listen(4201, () => {
  console.log('Server is running on http://localhost:4201');
});