const bcrypt = require('bcrypt');

// ✏️ CHANGE THESE TWO LINES to your desired credentials
const email = 'sasgroups@gmail.com';
const password = 'Sasgroups@2012';

async function generate() {
  const hash = await bcrypt.hash(password, 10);
  
  console.log('\n========== COPY THIS INTO YOUR KIOSK DB ==========');
  console.log(`Email: ${email}`);
  console.log(`Hashed Password: ${hash}`);
  console.log('\n✅ SQL Insert Statement:');
  console.log(`INSERT INTO admins (email, password) VALUES ('${email}', '${hash}');`);
  console.log('==================================================\n');
}

generate();