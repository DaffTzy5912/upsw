const multer = require('multer');
const upload = multer();
const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;
const path = require('path');

// Pastikan file database ada
const databasePath = 'database.json';
if (!fs.existsSync(databasePath)) {
  fs.writeFileSync(databasePath, JSON.stringify({
    akun: {},
    status: []
  }, null, 2));
}

let database = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));

app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));

// Route untuk halaman utama - arahkan ke landing.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

app.post('/daftar', (req, res) => {
  const { nama, foto } = req.body;
  const akun = { nama, foto };
  database.akun[nama] = akun;
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
  res.sendStatus(200);
});

app.get('/akun/:nama', (req, res) => {
  const akun = database.akun[req.params.nama];
  res.json(akun || null);
});

// Endpoint untuk upload status
app.post('/upload', (req, res) => {
  const { nama, fotoProfil, caption, file } = req.body;

  const newStatus = {
    nama,
    fotoProfil,
    caption,
    file,
    waktu: Date.now(),
    id: Date.now().toString(), // Tambahkan ID unik untuk status
    dilihatOleh: [] // Tambahkan array untuk menyimpan siapa yang melihat
  };

  database.status.push(newStatus);

  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
  res.json({ success: true });
});

app.get('/status', (req, res) => {
  res.json(database.status.slice(-30)); // Ambil 30 status terakhir
});

// Endpoint baru untuk mencatat pengguna yang melihat status
app.post('/status/view', (req, res) => {
  const { statusId, viewerName, viewerPhoto } = req.body;
  
  // Cari status dengan ID yang sesuai
  const statusIndex = database.status.findIndex(s => s.id === statusId);
  
  if (statusIndex !== -1) {
    // Periksa apakah pengguna sudah melihat status ini sebelumnya
    const alreadyViewed = database.status[statusIndex].dilihatOleh.some(
      viewer => viewer.nama === viewerName
    );
    
    // Jika belum melihat, tambahkan ke daftar
    if (!alreadyViewed && database.status[statusIndex].nama !== viewerName) {
      database.status[statusIndex].dilihatOleh.push({
        nama: viewerName,
        fotoProfil: viewerPhoto,
        waktuDilihat: Date.now()
      });
      
      fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
    }
    
    res.json({ success: true });
  } else {
    res.json({ success: false, message: "Status tidak ditemukan" });
  }
});

// Endpoint untuk mendapatkan status berdasarkan ID
app.get('/status/:id', (req, res) => {
  const status = database.status.find(s => s.id === req.params.id);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ message: "Status tidak ditemukan" });
  }
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
