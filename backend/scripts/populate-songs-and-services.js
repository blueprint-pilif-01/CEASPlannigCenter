/**
 * Populate Songs and Generate Services
 * Adaugă toate melodiile și generează servicii pentru fiecare Duminică și Luni
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'database.db');
const UPLOADS_PATH = path.join(__dirname, '..', 'uploads', 'songs');

console.log('🎵 Populating songs and generating services...');
console.log('📁 Database path:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Create uploads/songs directory if it doesn't exist
if (!fs.existsSync(UPLOADS_PATH)) {
  fs.mkdirSync(UPLOADS_PATH, { recursive: true });
  console.log('✅ Created uploads/songs directory');
}

// Get Filip (admin) ID for created_by
const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('Filip');
if (!admin) {
  console.error('❌ Filip user not found! Run db:reset-users first.');
  process.exit(1);
}

// ============================================
// 1. SONGS DATA
// ============================================
const songs = [
  { title: 'Risen (Domnul Trăiește)', bpm: 132, keys: ['E'], artist: 'Vertical Worship' },
  { title: 'Adonai', bpm: 108, keys: ['Am'], artist: 'Hillsong' },
  { title: 'Aduceți ca Jertfă', bpm: 128, keys: ['E', 'G'], artist: 'Vertical Worship' },
  { title: 'Agnus Dei', bpm: 68, keys: ['A', 'Bb', 'F', 'F#', 'G'], artist: 'Michael W. Smith' },
  { title: 'Atotputernic', bpm: 75, keys: ['E'], artist: 'Hillsong' },
  { title: 'Auzi Corul Îngeresc (Hark! The Herald Angels Sing)', bpm: 94, keys: ['B', 'C', 'C#'], artist: 'Traditional' },
  { title: 'Binecuvântat (Blessed Be the Name of the Lord)', bpm: 117, keys: ['A', 'F', 'F#', 'G'], artist: 'Matt Redman' },
  { title: 'Bunătatea Ta (Goodness of God)', bpm: 63, keys: ['A', 'C', 'G'], artist: 'Bethel Music' },
  { title: 'Cânt Aleluia (Light of the World)', bpm: 108, keys: ['C#', 'D'], artist: 'Hillsong' },
  { title: 'Cântați cu toții Isus domnește-n veci (Christmas Day)', bpm: 90, keys: ['C', 'C#'], artist: 'Hillsong' },
  { title: 'Cântați toți de bucurie (Joy to the world)', bpm: 148, keys: ['A', 'B', 'G'], artist: 'Traditional' },
  { title: 'Ce Dar Măreț e Isus Salvatorul', bpm: 73, keys: ['C', 'D'], artist: 'Vertical Worship' },
  { title: 'Ce Dar Nemeritat (This is Amazing Grace)', bpm: 98, keys: ['A', 'D', 'E', 'G'], artist: 'Phil Wickham' },
  { title: 'Ce Mare Este Dragostea Ta (How Great is Your Love)', bpm: 74, keys: ['C', 'F', 'G'], artist: 'Hillsong' },
  { title: 'Ce mare ești Tu (Splendoare de Împărat)', bpm: 76, keys: ['Db', 'G'], artist: 'Vertical Worship' },
  { title: 'Celui ce Șade pe Tron', bpm: 67, keys: ['C', 'F', 'F#', 'G'], artist: 'Hillsong' },
  { title: 'Centrul Vieții', bpm: 70, keys: ['F', 'F#', 'G', 'G#'], artist: 'Vertical Worship' },
  { title: 'Chemăm Numele Tău', bpm: 84, keys: ['F', 'F#', 'G'], artist: 'Vertical Worship' },
  { title: 'Cine e ca El (Who is like the Lord)', bpm: 88, keys: ['C', 'E', 'F', 'G'], artist: 'Hillsong' },
  { title: 'Cine e vrednic? (Who Else)', bpm: 68, keys: ['Ab', 'G'], artist: 'Vertical Worship' },
  { title: 'Cinste, Onoare', bpm: 95, keys: ['C'], artist: 'Hillsong' },
  { title: 'Credința Mea eu o Zidesc (Cornerstone)', bpm: 71, keys: ['C', 'D'], artist: 'Hillsong' },
  { title: 'Crezul (The Creed)', bpm: 140, keys: ['G'], artist: 'Hillsong' },
  { title: 'Cristos a Înviat din Morți (Cu Moartea pe Moarte Călcând)', bpm: 85, keys: ['C', 'C#'], artist: 'Traditional' },
  { title: 'Cristos din morți a înviat (Christ is risen)', bpm: 70, keys: ['G'], artist: 'Hillsong' },
  { title: 'De Ziua Ta', bpm: 68, keys: ['C', 'D'], artist: 'Vertical Worship' },
  { title: 'Doamne Ești Bun', bpm: 130, keys: ['A'], artist: 'Bethel Music' },
  { title: 'Doamne, Tu salvezi', bpm: 130, keys: ['F'], artist: 'Hillsong' },
  { title: 'Doar prin Tine', bpm: 120, keys: ['E'], artist: 'Vertical Worship' },
  { title: 'Doar Un Aleluia (Gratitude)', bpm: 78, keys: ['Bb', 'C', 'D', 'D#', 'E', 'Eb', 'F'], artist: 'Brandon Lake' },
  { title: 'Domn al Slavei', bpm: 90, keys: ['E', 'F', 'G'], artist: 'Hillsong' },
  { title: 'Domnești în veci (Reign Above It All)', bpm: 75, keys: ['D', 'E', 'F'], artist: 'Bethel Music' },
  { title: 'Domnul Este Bun', bpm: 130, keys: ['A', 'G'], artist: 'Hillsong' },
  { title: 'Domnul Miracolelor', bpm: 71, keys: ['A', 'Bb', 'F#', 'G'], artist: 'Vertical Worship' },
  { title: 'Dragostea Dintâi', bpm: 94, keys: ['E'], artist: 'Hillsong' },
  { title: 'E Crăciunul (Christmas Morning)', bpm: 136, keys: ['G'], artist: 'Vertical Worship' },
  { title: 'Egipt (Egypt)', bpm: 75, keys: ['C', 'D'], artist: 'Bethel Music' },
  { title: 'El Va Domni (He Shall Reign Forevermore)', bpm: 122, keys: ['C#', 'D', 'Eb'], artist: 'Chris Tomlin' },
  { title: 'Ești Dumnezeu Nemărginit', bpm: 132, keys: ['E', 'Eb', 'F'], artist: 'Hillsong' },
  { title: 'Eu Cânt Azi Aleluia (Raise A Hallelujah)', bpm: 82, keys: ['C', 'D', 'E'], artist: 'Bethel Music' },
  { title: 'Eu de Tine am Nevoie', bpm: 75, keys: ['C'], artist: 'Hillsong' },
  { title: 'Face of God (Cerul Nopții Înstelat)', bpm: 71, keys: ['G'], artist: 'Phil Wickham' },
  { title: 'Fii Întronat (Be Enthroned)', bpm: 71, keys: ['C', 'F', 'F#', 'G'], artist: 'Vertical Worship' },
  { title: 'Glorificat', bpm: 118, keys: ['C'], artist: 'Vertical Worship' },
  { title: 'Hai Deschide Inima Ta', bpm: 84, keys: ['E', 'G'], artist: 'Traditional' },
  { title: 'Haină de Laudă', bpm: 136, keys: ['A', 'Bb', 'F'], artist: 'Vertical Worship' },
  { title: 'Happy Day (Oh ai înviat)', bpm: 132, keys: ['F', 'G'], artist: 'Tim Hughes' },
  { title: 'Holy Forever (Sfânt Din Veșnicie)', bpm: 72, keys: ['Bb', 'F', 'G'], artist: 'Chris Tomlin' },
  { title: 'Hymn Of Heaven (Imn al vesniciei)', bpm: 71, keys: ['A', 'C', 'G'], artist: 'Phil Wickham' },
  { title: 'Il vreau pe Isus (Give me Jesus)', bpm: 69, keys: ['G'], artist: 'Vertical Worship' },
  { title: 'Îngerii din ceruri cântă + Îi vom cânta', bpm: 113, keys: ['D'], artist: 'Traditional' },
  { title: 'Îngerii și Sfinții (Worthy Of It All)', bpm: 68, keys: ['C', 'D', 'Eb'], artist: 'David Brymer' },
  { title: 'Isus e Rege', bpm: 75, keys: ['C', 'D'], artist: 'Vertical Worship' },
  { title: 'Isus ești Domnul Domnilor', bpm: 66, keys: ['C', 'G'], artist: 'Hillsong' },
  { title: 'Îți Dau Toată Viața', bpm: 154, keys: ['F', 'F#'], artist: 'Vertical Worship' },
  { title: 'Îți Mulțumesc (Grateful)', bpm: 96, keys: ['C', 'G'], artist: 'Elevation Worship' },
  { title: 'Iubirea Ta', bpm: 128, keys: ['C', 'E', 'F', 'G'], artist: 'Hillsong' },
  { title: 'King Of Kings (Rege al Regilor)', bpm: 68, keys: ['C', 'D'], artist: 'Hillsong' },
  { title: 'King Of My Heart (Fie Regele Meu)', bpm: 136, keys: ['A', 'G'], artist: 'Bethel Music' },
  { title: 'Laud Numele Tau, Isus (What A Beautiful Name)', bpm: 68, keys: ['D', 'E', 'Eb'], artist: 'Hillsong' },
  { title: 'Laudat să fii doar Tu', bpm: 82, keys: ['D', 'E', 'Eb'], artist: 'Vertical Worship' },
  { title: 'Leu și Miel (The Lion And The Lamb)', bpm: 90, keys: ['D', 'E'], artist: 'Bethel Music' },
  { title: 'Living Hope (Isus Cristos, speranța mea)', bpm: 72, keys: ['A'], artist: 'Phil Wickham' },
  { title: 'Lupta e doar a Ta (Battle Belongs)', bpm: 81, keys: ['A', 'C', 'D', 'Db', 'E', 'F', 'F#', 'G'], artist: 'Phil Wickham' },
  { title: 'Mă-ntorc la Inima Închinării (Muzica-ncetat) (The Heart Of Worship)', bpm: 68, keys: ['C', 'G'], artist: 'Matt Redman' },
  { title: 'Mâini către cer', bpm: 120, keys: ['A', 'G'], artist: 'Vertical Worship' },
  { title: 'Mare Dumnezeu (Doar Prin Tine)', bpm: 120, keys: ['E'], artist: 'Hillsong' },
  { title: 'Măreț Salvator (Doamne, Tu ce miști chiar munții) (Mighty To Save)', bpm: 75, keys: ['A', 'G'], artist: 'Hillsong' },
  { title: 'Mărețul Har', bpm: 123, keys: ['D', 'E', 'F', 'G'], artist: 'Traditional' },
  { title: 'Mii De Laude', bpm: 130, keys: ['Bb', 'C', 'D', 'E', 'G'], artist: 'Brandon Lake' },
  { title: 'Mulțumesc, Isus (Thank You Jesus For The Blood)', bpm: 61, keys: ['Bb', 'C'], artist: 'Charity Gayle' },
  { title: 'Mulțumesc, Isus, pentru tot ce ai facut', bpm: 86, keys: ['C', 'D#'], artist: 'Vertical Worship' },
  { title: 'Nimeni nu este ca El (Te-ncoronăm cu laude) (No One Like The Lord)', bpm: 72, keys: ['D', 'E'], artist: 'Vertical Worship' },
  { title: 'Nimeni Nu-i Ca Tine, Isus', bpm: 81, keys: ['A', 'G'], artist: 'Hillsong' },
  { title: 'Numele Tău Este Mare', bpm: 128, keys: ['A', 'Bb', 'D'], artist: 'Vertical Worship' },
  { title: 'o ce veste minunata', bpm: 100, keys: ['D'], artist: 'Traditional' },
  { title: 'O, Noapte Sfântă (O Holy Night)', bpm: 90, keys: ['C', 'C#', 'D'], artist: 'Traditional' },
  { title: 'Om al durerii (Man Of Sorrows)', bpm: 72, keys: ['D', 'F'], artist: 'Hillsong' },
  { title: 'Osana', bpm: 65, keys: ['F', 'F#', 'G'], artist: 'Hillsong' },
  { title: 'Praise', bpm: 127, keys: ['A', 'C', 'F', 'G'], artist: 'Elevation Worship' },
  { title: 'Primul Noel (The First Noel)', bpm: 113, keys: ['G'], artist: 'Traditional' },
  { title: 'Priviți, El a venit (Behold)', bpm: 73, keys: ['B'], artist: 'Hillsong' },
  { title: 'Regele Suprem (There Is A King)', bpm: 64, keys: ['A', 'Bb', 'C'], artist: 'Elevation Worship' },
  { title: 'Singurul Vrednic', bpm: 75, keys: ['E', 'G'], artist: 'Hillsong' },
  { title: 'Slava e a Ta', bpm: 70, keys: ['F'], artist: 'Vertical Worship' },
  { title: 'Slăvit E Azi Numele Isus (O Praise The Name)', bpm: 72, keys: ['Bb', 'C'], artist: 'Hillsong' },
  { title: 'Știind Că-i Viu (Because He Lives)', bpm: 62, keys: ['C', 'D'], artist: 'Bill Gaither' },
  { title: 'Tatăl Nostru (Our Father)', bpm: 70, keys: ['C'], artist: 'Bethel Music' },
  { title: 'Te-am chemat', bpm: 80, keys: ['E', 'F'], artist: 'Vertical Worship' },
  { title: 'The Blessing (Cântecul Binecuvântării)', bpm: 70, keys: ['A', 'G'], artist: 'Elevation Worship' },
  { title: 'Tie ma predau', bpm: 70, keys: ['F'], artist: 'Hillsong' },
  { title: 'Ție-ți Dau Inima (Aceasta Mi-e Dorința) (This is my desire)', bpm: 76, keys: ['D', 'E'], artist: 'Hillsong' },
  { title: 'Toată Închinarea (Lumina Lumii)', bpm: 69, keys: ['C', 'D', 'Eb', 'F', 'G'], artist: 'Tim Hughes' },
  { title: 'Tu Domnești', bpm: 67, keys: ['C', 'E', 'Eb', 'F', 'F#'], artist: 'Hillsong' },
  { title: 'Tu Ești Credincios', bpm: 120, keys: ['C', 'D'], artist: 'Vertical Worship' },
  { title: 'Tu Îmi Dai Curaj (You Make Me Brave)', bpm: 69, keys: ['D'], artist: 'Bethel Music' },
  { title: 'Unde', bpm: 64, keys: ['C'], artist: 'Vertical Worship' },
  { title: 'Vrednic', bpm: 75, keys: ['D', 'F', 'G'], artist: 'Elevation Worship' },
  { title: 'Vrednic de Închinare (None Like You)', bpm: 76, keys: ['A', 'Bb', 'C', 'F', 'G'], artist: 'Hillsong' },
  { title: 'Way Maker', bpm: 68, keys: ['D', 'G'], artist: 'Sinach' }
];

console.log(`\n🎵 Inserting ${songs.length} songs...`);

// Insert songs and create their key variants
for (const song of songs) {
  // Insert song
  const insertSong = db.prepare(`
    INSERT INTO songs (title, artist, tempo, language, created_by, created_at, updated_at)
    VALUES (?, ?, ?, 'ro', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  
  const result = insertSong.run(song.title, song.artist, song.bpm, admin.id);
  const songId = result.lastInsertRowid;
  
  // Create folder for this song
  const songFolder = path.join(UPLOADS_PATH, `song_${songId}_${song.title.replace(/[^a-z0-9]/gi, '_')}`);
  if (!fs.existsSync(songFolder)) {
    fs.mkdirSync(songFolder, { recursive: true });
  }
  
  // Insert keys for this song
  const insertKey = db.prepare(`
    INSERT INTO song_keys (song_id, key_signature, is_original, created_by, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  song.keys.forEach((key, index) => {
    insertKey.run(songId, key, index === 0 ? 1 : 0, admin.id);
  });
  
  console.log(`✅ Added: ${song.title} (${song.keys.length} keys) - Folder: ${songFolder}`);
}

console.log(`\n✅ Inserted ${songs.length} songs with folders`);

// ============================================
// 2. GENERATE SERVICES
// ============================================
console.log('\n📅 Generating services...');

// Function to get all Sundays and Mondays for the next 6 months
function generateServiceDates() {
  const dates = [];
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);
  
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    
    // Sunday (0) at 10:00
    if (dayOfWeek === 0) {
      dates.push({
        type: 'biserica_duminica',
        title: 'Serviciu Biserică',
        date: current.toISOString().split('T')[0],
        time: '10:00',
        location: 'CEAS'
      });
    }
    
    // Monday (1) at 19:00
    if (dayOfWeek === 1) {
      dates.push({
        type: 'tineret_luni',
        title: 'Tineret UNITED',
        date: current.toISOString().split('T')[0],
        time: '19:00',
        location: 'Sala Tineret'
      });
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

const serviceDates = generateServiceDates();

const insertService = db.prepare(`
  INSERT INTO services (title, service_type, date, time, location, status, created_by, created_at)
  VALUES (?, ?, ?, ?, ?, 'draft', ?, CURRENT_TIMESTAMP)
`);

for (const service of serviceDates) {
  insertService.run(
    service.title,
    service.type,
    service.date,
    service.time,
    service.location,
    admin.id
  );
}

console.log(`✅ Generated ${serviceDates.length} services (Sundays + Mondays for next 6 months)`);

// ============================================
// 3. SUMMARY
// ============================================
db.close();

console.log('\n🎉 Database populated successfully!');
console.log('\n📊 Summary:');
console.log(`   - ${songs.length} Songs with all keys`);
console.log(`   - ${serviceDates.length} Services (Sundays 10:00 + Mondays 19:00)`);
console.log(`   - Song folders created in: ${UPLOADS_PATH}`);
console.log('\n✅ Ready to use!');
console.log('   Command: npm start');

