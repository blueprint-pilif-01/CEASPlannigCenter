/**
 * Fix Song Titles - Corectează titlurile melodiilor cu diacritice
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database.db');

console.log('🔧 Fixing song titles with correct diacritics...');
console.log('📁 Database path:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Mapping of incorrect titles to correct titles
const titleCorrections = {
  "Risen  Domnul Tr ie te": "Risen (Domnul Trăiește)",
  "Adonai": "Adonai",
  "Aduce i ca Jertf": "Aduceți ca Jertfă",
  "Agnus Dei": "Agnus Dei",
  "Atotputernic": "Atotputernic",
  "Auzi Corul  ngeresc  Hark  The Herald Angels Sing": "Auzi Corul Îngeresc (Hark! The Herald Angels Sing)",
  "Binecuv ntat  Blessed Be the Name of the Lord": "Binecuvântat (Blessed Be the Name of the Lord)",
  "Bun tatea Ta  Goodness of God": "Bunătatea Ta (Goodness of God)",
  "C nt Aleluia  Light of the World": "Cânt Aleluia (Light of the World)",
  "C nta i cu to ii Isus domne te n veci  Christmas Day": "Cântați cu toții Isus domnește-n veci (Christmas Day)",
  "C nta i to i de bucurie  Joy to the world": "Cântați toți de bucurie (Joy to the world)",
  "Ce Dar M re  e Isus Salvatorul": "Ce Dar Măreț e Isus Salvatorul",
  "Ce Dar Nemeritat  This is Amazing Grace": "Ce Dar Nemeritat (This is Amazing Grace)",
  "Ce Mare Este Dragostea Ta  How Great is Your Love": "Ce Mare Este Dragostea Ta (How Great is Your Love)",
  "Ce mare e ti Tu  Splendoare de  mp rat": "Ce mare ești Tu (Splendoare de Împărat)",
  "Celui ce  ade pe Tron": "Celui ce Șade pe Tron",
  "Centrul Vie ii": "Centrul Vieții",
  "Chem m Numele T u": "Chemăm Numele Tău",
  "Cine e ca El  Who is like the Lord": "Cine e ca El (Who is like the Lord)",
  "Cine e vrednic   Who Else": "Cine e vrednic? (Who Else)",
  "Cinste  Onoare": "Cinste, Onoare",
  "Credin a Mea eu o Zidesc  Cornerstone": "Credința Mea eu o Zidesc (Cornerstone)",
  "Crezul  The Creed": "Crezul (The Creed)",
  "Cristos a  nviat din Mor i  Cu Moartea pe Moarte C lc nd": "Cristos a Înviat din Morți (Cu Moartea pe Moarte Călcând)",
  "Cristos din mor i a  nviat  Christ is risen": "Cristos din morți a înviat (Christ is risen)",
  "De Ziua Ta": "De Ziua Ta",
  "Doamne E ti Bun": "Doamne Ești Bun",
  "Doamne  Tu salvezi": "Doamne, Tu salvezi",
  "Doar prin Tine": "Doar prin Tine",
  "Doar Un Aleluia  Gratitude": "Doar Un Aleluia (Gratitude)",
  "Domn al Slavei": "Domn al Slavei",
  "Domne ti  n veci  Reign Above It All": "Domnești în veci (Reign Above It All)",
  "Domnul Este Bun": "Domnul Este Bun",
  "Domnul Miracolelor": "Domnul Miracolelor",
  "Dragostea Dint i": "Dragostea Dintâi",
  "E Cr ciunul  Christmas Morning": "E Crăciunul (Christmas Morning)",
  "Egipt  Egypt": "Egipt (Egypt)",
  "El Va Domni  He Shall Reign Forevermore": "El Va Domni (He Shall Reign Forevermore)",
  "E ti Dumnezeu Nem rginit": "Ești Dumnezeu Nemărginit",
  "Eu C nt Azi Aleluia  Raise A Hallelujah": "Eu Cânt Azi Aleluia (Raise A Hallelujah)",
  "Eu de Tine am Nevoie": "Eu de Tine am Nevoie",
  "Face of God  Cerul Nop ii  nstelat": "Face of God (Cerul Nopții Înstelat)",
  "Fii  ntronat  Be Enthroned": "Fii Întronat (Be Enthroned)",
  "Glorificat": "Glorificat",
  "Hai Deschide Inima Ta": "Hai Deschide Inima Ta",
  "Hain  de Laud": "Haină de Laudă",
  "Happy Day  Oh ai  nviat": "Happy Day (Oh ai înviat)",
  "Holy Forever  Sf nt Din Ve nicie": "Holy Forever (Sfânt Din Veșnicie)",
  "Hymn Of Heaven  Imn al vesniciei": "Hymn Of Heaven(Imn al vesniciei)",
  "Il vreau pe Isus  Give me Jesus": "Il vreau pe Isus (Give me Jesus)",
  "ngerii din ceruri c nt     i vom c nta": "Îngerii din ceruri cântă + Îi vom cânta",
  "ngerii  i Sfin ii  Worthy Of It All": "Îngerii și Sfinții (Worthy Of It All)",
  "Isus e Rege": "Isus e Rege",
  "Isus e ti Domnul Domnilor": "Isus ești Domnul Domnilor",
  "i Dau Toat  Via a": "Îți Dau Toată Viața",
  "i Mul umesc  Grateful": "Îți Mulțumesc (Grateful)",
  "Iubirea Ta": "Iubirea Ta",
  "King Of Kings  Rege al Regilor": "King Of Kings (Rege al Regilor)",
  "King Of My Heart  Fie Regele Meu": "King Of My Heart (Fie Regele Meu)",
  "Laud Numele Tau  Isus  What A Beautiful Name": "Laud Numele Tau, Isus (What A Beautiful Name)",
  "Laudat s  fii doar Tu": "Laudat să fii doar Tu",
  "Leu  i Miel  The Lion And The Lamb": "Leu și Miel (The Lion And The Lamb)",
  "Living Hope  Isus Cristos  speran a mea": "Living Hope (Isus Cristos, speranța mea)",
  "Lupta e doar a Ta  Battle Belongs": "Lupta e doar a Ta (Battle Belongs)",
  "M  ntorc la Inima  nchin rii  Muzica ncetat   The Heart Of Worship": "Mă-ntorc la Inima Închinării (Muzica-ncetat) (The Heart Of Worship)",
  "M ini c tre cer": "Mâini către cer",
  "Mare Dumnezeu  Doar Prin Tine": "Mare Dumnezeu (Doar Prin Tine)",
  "M re  Salvator  Doamne  Tu ce mi ti chiar mun ii   Mighty To Save": "Măreț Salvator (Doamne, Tu ce miști chiar munții) (Mighty To Save)",
  "M re ul Har": "Mărețul Har",
  "Mii De Laude": "Mii De Laude",
  "Mul umesc  Isus  Thank You Jesus For The Blood": "Mulțumesc, Isus (Thank You Jesus For The Blood)",
  "Mul umesc  Isus  pentru tot ce ai facut": "Mulțumesc, Isus, pentru tot ce ai facut",
  "Nimeni nu este ca El  Te ncoron m cu laude   No One Like The Lord": "Nimeni nu este ca El (Te-ncoronăm cu laude) (No One Like The Lord)",
  "Nimeni Nu i Ca Tine  Isus": "Nimeni Nu-i Ca Tine, Isus",
  "Numele T u Este Mare": "Numele Tău Este Mare",
  "o ce veste minunata": "o ce veste minunata",
  "O  Noapte Sf nt   O Holy Night": "O, Noapte Sfântă (O Holy Night)",
  "Om al durerii  Man Of Sorrows": "Om al durerii (Man Of Sorrows)",
  "Osana": "Osana",
  "Praise": "Praise",
  "Primul Noel  The First Noel": "Primul Noel (The First Noel)",
  "Privi i  El a venit  Behold": "Priviți, El a venit (Behold)",
  "Regele Suprem  There Is A King": "Regele Suprem (There Is A King)",
  "Singurul Vrednic": "Singurul Vrednic",
  "Slava e a Ta": "Slava e a Ta",
  "Sl vit E Azi Numele Isus  O Praise The Name": "Slăvit E Azi Numele Isus (O Praise The Name)",
  "tiind C  i Viu  Because He Lives": "Știind Că-i Viu (Because He Lives)",
  "Tat l Nostru  Our Father": "Tatăl Nostru (Our Father)",
  "Te am chemat": "Te-am chemat",
  "The Blessing  C ntecul Binecuv nt rii": "The Blessing (Cântecul Binecuvântării)",
  "Tie ma predau": "Tie ma predau",
  "ie  i Dau Inima  Aceasta Mi e Dorin a   This is my desire": "Ție-ți Dau Inima (Aceasta Mi-e Dorința) (This is my desire)",
  "Toat   nchinarea  Lumina Lumii": "Toată Închinarea (Lumina Lumii)",
  "Tu Domne ti": "Tu Domnești",
  "Tu E ti Credincios": "Tu Ești Credincios",
  "Tu  mi Dai Curaj  You Make Me Brave": "Tu Îmi Dai Curaj (You Make Me Brave)",
  "Unde": "Unde",
  "Vrednic": "Vrednic",
  "Vrednic de  nchinare  None Like You": "Vrednic de Închinare (None Like You)",
  "Way Maker": "Way Maker",
  "Worthy  Vrednic E ti Doar Tu": "Worthy (Vrednic Ești Doar Tu)",
  "Zideste In Mine": "Zideste In Mine"
};

const updateSong = db.prepare('UPDATE songs SET title = ? WHERE title = ?');

let correctedCount = 0;
let notFoundCount = 0;

console.log('\n🔄 Starting title corrections...');

for (const [incorrectTitle, correctTitle] of Object.entries(titleCorrections)) {
  try {
    const result = updateSong.run(correctTitle, incorrectTitle);
    
    if (result.changes > 0) {
      console.log(`✅ "${incorrectTitle}" → "${correctTitle}"`);
      correctedCount++;
    } else {
      console.log(`⚠️  Not found: "${incorrectTitle}"`);
      notFoundCount++;
    }
  } catch (error) {
    console.error(`❌ Error updating "${incorrectTitle}":`, error.message);
  }
}

console.log('\n🎉 Title correction completed!');
console.log(`✅ Corrected: ${correctedCount} titles`);
console.log(`⚠️  Not found: ${notFoundCount} titles`);

// Show final count
const finalCount = db.prepare('SELECT COUNT(*) as count FROM songs').get();
console.log(`📊 Total songs in database: ${finalCount.count}`);

db.close();
