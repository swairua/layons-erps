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

  // Separate D-bars from other items
  const nonDbarItems = items.filter(item => !['D20', 'D16', 'D12', 'D10', 'D8'].includes(item.description));
  const dbarMap = {};
  items.forEach(item => {
    if (item.description === 'D20') dbarMap.D20 = item.id;
    else if (item.description === 'D16') dbarMap.D16 = item.id;
    else if (item.description === 'D12') dbarMap.D12 = item.id;
    else if (item.description === 'D10') dbarMap.D10 = item.id;
    else if (item.description === 'D8') dbarMap.D8 = item.id;
  });

  // Reconstruct with D-bars in correct order
  const dbarOrder = ['D20', 'D16', 'D12', 'D10', 'D8'];
  const orderedItems = [
    ...nonDbarItems.slice(0, 7), // Items before D-bars (Machine Cut Stones through Rock sand)
    ...dbarOrder.map(name => ({ description: name, id: dbarMap[name] })),
    ...nonDbarItems.slice(7), // Items after D-bars (Binding Wire onwards)
  ];

  console.log('Final order for Section B:\n');
  orderedItems.forEach((item, index) => {
    console.log(`  ${index + 1}: ${item.description}`);
  });
  console.log();

  console.log('Generating SQL:\n');
  
  // Generate updates for sort_order
  console.log('-- Fix sort_order:');
  orderedItems.forEach((item, index) => {
    console.log(`UPDATE lcl_template_items SET sort_order = ${index} WHERE id = '${item.id}'; -- ${item.description}`);
  });
  
  console.log();
  console.log('-- Fix item_number:');
  orderedItems.forEach((item, index) => {
    const newItemNumber = (index + 1).toString();
    console.log(`UPDATE lcl_template_items SET item_number = '${newItemNumber}' WHERE id = '${item.id}'; -- ${item.description}`);
  });
  
  console.log('\n✅ SQL generated successfully');
}

fixSectionB().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
