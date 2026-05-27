import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eubrvlzkvzevidivsfha.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1YnJ2bHprdnpldmlkaXZzZmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjA4NTgsImV4cCI6MjA3MzYzNjg1OH0.ni7Ogq-dKLvnCDzi8KvUVG2c1P7s0qY4xdF4AuvKwKk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixSectionAOrder() {
  console.log('Fetching Section A items from lcl_template_items...\n');

  // Step 1: Query all items in the Section A
  const { data: items, error: fetchError } = await supabase
    .from('lcl_template_items')
    .select('id, description, section_id, subsection_id, sort_order')
    .eq('section_id', 'section_a')
    .order('sort_order', { ascending: true });

  if (fetchError) {
    console.error('Error fetching items:', fetchError.message);
    process.exit(1);
  }

  console.log('Current Section A items:');
  items.forEach((item) => {
    console.log(`  ID: ${item.id}, Name: ${item.description}, Current sort_order: ${item.sort_order}`);
  });
  console.log();

  // Step 2: Define the correct mapping
  const correctOrder = {
    'Sand': 0,
    'Cement': 1,
    'Quarry Dust': 2,
    'Rock Sand': 3,
    'D20': 4,
    'D16': 5,
    'D12': 6,
    'D10': 7,
    'D8': 8,
  };

  // Step 3: Build update statements
  const updates = [];
  for (const [itemName, newSortOrder] of Object.entries(correctOrder)) {
    const item = items.find((i) => i.description === itemName);
    if (item) {
      updates.push({
        id: item.id,
        description: itemName,
        old_sort_order: item.sort_order,
        new_sort_order: newSortOrder,
      });
    } else {
      console.warn(`⚠️ Warning: Item "${itemName}" not found in database`);
    }
  }

  console.log('Planned updates:');
  updates.forEach((update) => {
    console.log(
      `  ${update.description}: ${update.old_sort_order} → ${update.new_sort_order}`
    );
  });
  console.log();

  // Step 4: Execute updates
  console.log('Applying updates to Supabase...\n');
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('lcl_template_items')
      .update({ sort_order: update.new_sort_order })
      .eq('id', update.id);

    if (updateError) {
      console.error(
        `Error updating ${update.description}:`,
        updateError.message
      );
      process.exit(1);
    } else {
      console.log(`✓ Updated ${update.description} (ID: ${update.id})`);
    }
  }

  console.log('\n✅ All updates completed successfully!');
  console.log('\nVerifying updates...\n');

  // Step 5: Verify updates
  const { data: updatedItems, error: verifyError } = await supabase
    .from('lcl_template_items')
    .select('description, sort_order')
    .eq('section_id', 'section_a')
    .order('sort_order', { ascending: true });

  if (verifyError) {
    console.error('Error verifying updates:', verifyError.message);
    process.exit(1);
  }

  console.log('Updated Section A items (sorted by sort_order):');
  updatedItems.forEach((item) => {
    console.log(`  ${item.sort_order}: ${item.description}`);
  });

  console.log('\n✅ Verification complete! The order should now be:');
  console.log('  0: Sand');
  console.log('  1: Cement');
  console.log('  2: Quarry Dust');
  console.log('  3: Rock Sand');
  console.log('  4: D20');
  console.log('  5: D16');
  console.log('  6: D12');
  console.log('  7: D10');
  console.log('  8: D8');
}

fixSectionAOrder().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
