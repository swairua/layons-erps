import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eubrvlzkvzevidivsfha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YnJ2bHprdnpldmlkaXZzZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjA4NTgsImV4cCI6MjA3MzYzNjg1OH0.ni7Ogq-dKLvnCDzi8KvUVG2c1P7s0qY4xdF4AuvKwKk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSectionB() {
  console.log('Fetching Section B Materials items...\n');

  const { data: items, error: fetchError } = await supabase
    .from('lcl_template_items')
    .select('id, description, item_number, sort_order')
    .eq('section_id', 'section_b')
    .eq('subsection_id', 'section_b_materials')
    .order('sort_order', { ascending: true });

  if (fetchError) {
    console.error('Error fetching items:', fetchError.message);
    process.exit(1);
  }

  console.log('Current Section B Materials items (ordered by sort_order):');
  items.forEach((item, index) => {
    console.log(`  ${index}: item_number="${item.item_number}", description="${item.description}", sort_order=${item.sort_order}, id="${item.id}"`);
  });
  console.log();

  // Identify D-bars and their current positions
  const dbarItems = items.filter(item => ['D20', 'D16', 'D12', 'D10', 'D8'].includes(item.description));
  console.log('D-bar items found:', dbarItems.map(d => d.description).join(', '));
  console.log();

  console.log('Generating SQL to fix Section B:\n');
  
  let sqlStatements = [];
  
  // Generate updates for sort_order (sequential 0-n)
  console.log('-- Fix sort_order sequentially:');
  items.forEach((item, index) => {
    sqlStatements.push(`UPDATE lcl_template_items SET sort_order = ${index} WHERE id = '${item.id}'; -- ${item.description}`);
    console.log(`UPDATE lcl_template_items SET sort_order = ${index} WHERE id = '${item.id}'; -- ${item.description}`);
  });
  
  console.log();
  console.log('-- Fix item_number sequentially:');
  items.forEach((item, index) => {
    const newItemNumber = (index + 1).toString();
    sqlStatements.push(`UPDATE lcl_template_items SET item_number = '${newItemNumber}' WHERE id = '${item.id}'; -- ${item.description}`);
    console.log(`UPDATE lcl_template_items SET item_number = '${newItemNumber}' WHERE id = '${item.id}'; -- ${item.description}`);
  });
  
  console.log('\n✅ SQL statements above will fix Section B item numbers and sort_order to be sequential');
}

fixSectionB().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
