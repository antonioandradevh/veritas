const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "VERITAS - Sistema de Estudos",
    backgroundColor: '#08080c',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'public/icon.ico')
  });

  win.setMenuBarVisibility(false);

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

// Pasta de armazenamento local - Se empacotado, usa a pasta ao lado do executável
const isDev = !app.isPackaged;
const storagePath = isDev 
  ? path.join(app.getAppPath(), 'veritas_storage')
  : path.join(path.dirname(app.getPath('exe')), 'veritas_storage');

if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
}

ipcMain.handle('save-to-local', async (event, { fileName, buffer }) => {
  try {
    const filePath = path.join(storagePath, fileName);
    // buffer chega como Uint8Array via IPC
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  } catch (err) {
    console.error('Erro ao salvar arquivo local:', err);
    throw err;
  }
});

ipcMain.handle('get-local-pdf', async (event, fileName) => {
  try {
    const filePath = path.join(storagePath, fileName);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      // Retorna como Buffer (Uint8Array no frontend)
      return data;
    }
    return null;
  } catch (err) {
    console.error('Erro ao ler arquivo local:', err);
    return null;
  }
});

ipcMain.handle('open-storage-folder', () => {
  shell.openPath(storagePath);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
