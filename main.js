import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow () {
  const win = new BrowserWindow({
    minWidthwidth: 1200,
    minHeight: 800,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load your app's main HTML file (adjust path as needed)
  win.loadURL('http://localhost:3000')?.then(() => {
    console.log('Window loaded successfully');
  }).catch((err) => {
    win.loadFile(path.join(__dirname, 'servererr.html'))
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});