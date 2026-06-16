/**
 * Generate Sunday and Monday services until end of 2027
 * Does NOT modify users or songs tables
 */

const { initDatabaseAsync, getDatabase } = require('../config/database');

async function generateServices() {
  console.log('🚀 Generating services for Sundays and Mondays until 2027...');
  
  await initDatabaseAsync();
  const db = getDatabase();
  
  // Get existing services to avoid duplicates
  const existingServices = db.prepare(`
    SELECT date, service_type FROM services
  `).all();
  
  const existingDates = new Set(
    existingServices.map(s => `${s.date}_${s.service_type}`)
  );
  
  console.log(`📊 Found ${existingServices.length} existing services`);
  
  // Generate dates from today until end of 2027
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date('2027-12-31');
  
  const servicesToCreate = [];
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    // Use local date to avoid timezone issues
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    
    // Sunday (0) - Biserica Duminica
    if (dayOfWeek === 0) {
      const key = `${dateStr}_biserica_duminica`;
      if (!existingDates.has(key)) {
        servicesToCreate.push({
          title: 'Serviciu Biserică',
          service_type: 'biserica_duminica',
          date: dateStr,
          time: '10:00',
          location: 'CEAS',
          status: 'draft',
          dayName: dayNames[dayOfWeek]
        });
      }
    }
    
    // Monday (1) - Tineret UNITED
    if (dayOfWeek === 1) {
      const key = `${dateStr}_tineret_luni`;
      if (!existingDates.has(key)) {
        servicesToCreate.push({
          title: 'Tineret UNITED',
          service_type: 'tineret_luni',
          date: dateStr,
          time: '19:00',
          location: 'CEAS',
          status: 'draft',
          dayName: dayNames[dayOfWeek]
        });
      }
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Verify days are correct before creating
  console.log('\\n📅 Primele 10 servicii de creat:');
  servicesToCreate.slice(0, 10).forEach(s => {
    console.log(`  ${s.date} (${s.dayName}) - ${s.title}`);
  });
  
  console.log(`📝 Will create ${servicesToCreate.length} new services`);
  
  if (servicesToCreate.length === 0) {
    console.log('✅ No new services to create - all dates already have services');
    return;
  }
  
  // Insert services
  const insertService = db.prepare(`
    INSERT INTO services (title, service_type, date, time, location, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  let created = 0;
  let errors = 0;
  
  for (const service of servicesToCreate) {
    try {
      insertService.run(
        service.title,
        service.service_type,
        service.date,
        service.time,
        service.location,
        service.status
      );
      created++;
      
      // Log progress every 50 services
      if (created % 50 === 0) {
        console.log(`  → Created ${created}/${servicesToCreate.length} services...`);
      }
    } catch (error) {
      errors++;
      console.error(`  ❌ Error creating service for ${service.date}: ${error.message}`);
    }
  }
  
  // Save database
  const { saveDatabase } = require('../config/database');
  saveDatabase();
  
  console.log('');
  console.log('✅ Services generation complete!');
  console.log(`   Created: ${created} services`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Sundays (Biserica): ${servicesToCreate.filter(s => s.service_type === 'biserica_duminica').length}`);
  console.log(`   Mondays (Tineret): ${servicesToCreate.filter(s => s.service_type === 'tineret_luni').length}`);
  console.log('');
  console.log('⚠️  NOTE: Users and songs were NOT modified.');
}

generateServices().catch(console.error);

