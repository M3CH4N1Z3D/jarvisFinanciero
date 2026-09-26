const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env
const envConfig = fs.readFileSync('.env', 'utf8').split('\n');
envConfig.forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
});

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchema() {
  try {
    console.log('1. Inserting test record...');
    const testRecord = {
      fecha: '2023-10-01',
      concepto: 'Prueba de estructura',
      categoria: 'Test',
      monto: 150.50,
      tipo: 'Gasto'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('transactions')
      .insert([testRecord])
      .select();

    if (insertError) {
      console.error('Error inserting record:', insertError);
      return;
    }

    console.log('Insert successful.');
    
    if (!insertData || insertData.length === 0) {
      console.error('No data returned after insert.');
      return;
    }

    const insertedRecord = insertData[0];
    const insertedId = insertedRecord.id;
    
    console.log('2. Reading record...');
    const { data: selectData, error: selectError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', insertedId)
      .single();

    if (selectError) {
      console.error('Error selecting record:', selectError);
    } else {
      console.log('Record retrieved successfully.');
      console.log('Columns returned:');
      const columns = Object.keys(selectData);
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
    }

    console.log('3. Deleting test record...');
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', insertedId);

    if (deleteError) {
      console.error('Error deleting record:', deleteError);
    } else {
      console.log('Test record deleted successfully.');
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testSchema();
