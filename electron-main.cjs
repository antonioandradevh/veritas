const { app, BrowserWindow } = require('electron');
const path = require('path');

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
    // Icone opcional (se tiver um .ico na pasta public)
    // icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Remove o menu padrão (Arquivo, Editar, etc) para parecer um app profissional
  win.setMenuBarVisibility(false);

  // Se estivermos em desenvolvimento, carrega do servidor do Vite
  // Se for build final, carrega o arquivo index.html da pasta dist
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
