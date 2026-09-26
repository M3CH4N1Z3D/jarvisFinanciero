const { Client } = require('pg');
const fs = require('fs');

const envConfig = fs.readFileSync('.env', 'utf8').split('\n');
envConfig.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const projectRef = process.env.EXPO_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
const password = process.env.DATABASE_PASSWORD;

const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

const client = new Client({
  connectionString,
});

async function testSchema() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    console.log('1. Inserting test record...');
    const insertQuery = `
      INSERT INTO transactions (fecha, concepto, categoria, monto, tipo)
      VALUES ('2023-10-01', 'Prueba de estructura', 'Test', 150.50, 'Gasto')
      RETURNING *;
    `;
    
    const res = await client.query(insertQuery);
    const insertedRecord = res.rows[0];
    console.log('Insert successful.');
    
    console.log('2. Reading record...');
    const columns = Object.keys(insertedRecord);
    console.log('Columns returned:');
    console.log(columns);
    
    const requiredColumns = ['id', 'created_at', 'fecha', 'concepto', 'categoria', 'monto', 'tipo'];
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    const extraColumns = columns.filter(col => !requiredColumns.includes(col));
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('✅ Structure matches exactly!');
    } else {
      if (missingColumns.length > 0) console.log('❌ Missing columns:', missingColumns);
      if (extraColumns.length > 0) console.log('⚠️ Extra columns:', extraColumns);
    }

    console.log('3. Deleting test record...');
    await client.query('DELETE FROM transactions WHERE id = $1', [insertedRecord.id]);
    console.log('Test record deleted successfully.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

testSchema();
