/**
 * Import Existing Songs from Uploads Folder
 * Importă melodiile existente din folderul uploads fără a șterge nimic
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.db');
const UPLOADS_PATH = path.join(__dirname, '..', 'uploads', 'songs');

console.log('🎵 Importing existing songs from uploads folder...');
console.log('📁 Database path:', DB_PATH);
console.log('📁 Uploads path:', UPLOADS_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Check existing songs
const existingSongs = db.prepare('SELECT COUNT(*) as count FROM songs').get();
console.log(`📊 Current songs in database: ${existingSongs.count}`);

if (!fs.existsSync(UPLOADS_PATH)) {
  console.log('❌ Uploads folder not found!');
  process.exit(1);
}

// Get all song folders
const songFolders = fs.readdirSync(UPLOADS_PATH, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`📂 Found ${songFolders.length} song folders in uploads`);

// Prepare SQL statements
const insertSong = db.prepare(`
  INSERT OR IGNORE INTO songs (
    title, 
    artist, 
    key_signature, 
    tempo, 
    time_signature, 
    lyrics, 
    chords, 
    tags, 
    created_by, 
    created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertSongFile = db.prepare(`
  INSERT OR IGNORE INTO song_files (
    song_id, 
    file_type, 
    filename, 
    file_path, 
    file_size, 
    uploaded_by,
    uploaded_at,
    original_name
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

let importedCount = 0;
let skippedCount = 0;

// Get admin user for created_by
const adminUser = db.prepare('SELECT id FROM users WHERE username = ? OR username = ?').get('admin', 'Filip');
const createdBy = adminUser ? adminUser.id : 1;

for (const folderName of songFolders) {
  try {
    // Parse folder name to extract song info
    // Format: song_ID_Title or just Title
    let songTitle = folderName;
    let songId = null;
    
    if (folderName.startsWith('song_')) {
      const parts = folderName.split('_');
      songId = parseInt(parts[1]);
      songTitle = parts.slice(2).join('_').replace(/_/g, ' ');
    }
    
    // Clean up title
    songTitle = songTitle.replace(/\\/g, '').trim();
    
    // Check if song already exists by title
    const existingSong = db.prepare('SELECT id FROM songs WHERE title = ?').get(songTitle);
    if (existingSong) {
      console.log(`⏭️  Skipping "${songTitle}" - already exists`);
      skippedCount++;
      continue;
    }
    
    // Get files in folder
    const folderPath = path.join(UPLOADS_PATH, folderName);
    const files = fs.readdirSync(folderPath);
    
    // Extract key from files (look for key in filename)
    let keySignature = 'C';
    const keyMatch = files.find(f => f.match(/[A-G][#b]?m?\.pdf$/i));
    if (keyMatch) {
      const match = keyMatch.match(/([A-G][#b]?m?)\./i);
      if (match) keySignature = match[1];
    }
    
    // Insert song
    const result = insertSong.run(
      songTitle,
      '', // artist - empty for now
      keySignature,
      120, // default tempo
      '4/4', // default time signature
      '', // lyrics - empty for now
      '', // chords - empty for now
      `imported,worship,folder:${folderName}`, // tags
      createdBy,
      new Date().toISOString()
    );
    
    if (result.changes > 0) {
      const newSongId = result.lastInsertRowid;
      console.log(`✅ Imported "${songTitle}" (ID: ${newSongId})`);
      
      // Import files
      for (const fileName of files) {
        const filePath = path.join(folderPath, fileName);
        const stats = fs.statSync(filePath);
        
        // Determine file type
        let fileType = 'other';
        if (fileName.toLowerCase().includes('lyrics')) fileType = 'lyrics';
        else if (fileName.endsWith('.pdf')) fileType = 'chord_chart';
        else if (fileName.endsWith('.mp3')) fileType = 'audio';
        
        // Insert file record
        insertSongFile.run(
          newSongId,
          fileType,
          fileName,
          `uploads/songs/${folderName}/${fileName}`,
          stats.size,
          createdBy,
          new Date().toISOString(),
          fileName
        );
      }
      
      importedCount++;
    } else {
      skippedCount++;
    }
    
  } catch (error) {
    console.error(`❌ Error importing ${folderName}:`, error.message);
    skippedCount++;
  }
}

console.log('\n🎉 Import completed!');
console.log(`✅ Imported: ${importedCount} songs`);
console.log(`⏭️  Skipped: ${skippedCount} songs`);

// Final count
const finalCount = db.prepare('SELECT COUNT(*) as count FROM songs').get();
console.log(`📊 Total songs in database: ${finalCount.count}`);

db.close();
