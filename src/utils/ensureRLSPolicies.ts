import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures that basic RLS policies exist for accessing tables
 * This is run at app startup to guarantee tables are accessible
 */
export async function ensureRLSPolicies(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔒 Ensuring RLS policies are configured...');

    // Try a simple test query to see if we can access invoices
    const { error: testError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);

    // If we got a specific "no policies" error, create them
    if (testError?.message?.includes('row level security') || 
        testError?.message?.includes('policy') ||
        testError?.code === 'PGRST116') {
      
      console.log('Creating RLS policies for authenticated users...');
      
      // Try to create basic permissive RLS policies for all tables
      const policies = [
        {
          table: 'invoices',
          policy: 'invoices_authenticated_access'
        },
        {
          table: 'invoice_items',
          policy: 'invoice_items_authenticated_access'
        },
        {
          table: 'quotations',
          policy: 'quotations_authenticated_access'
        },
        {
          table: 'quotation_items',
          policy: 'quotation_items_authenticated_access'
        },
        {
          table: 'proforma_invoices',
          policy: 'proforma_invoices_authenticated_access'
        },
        {
          table: 'proforma_items',
          policy: 'proforma_items_authenticated_access'
        },
        {
          table: 'delivery_notes',
          policy: 'delivery_notes_authenticated_access'
        },
        {
          table: 'delivery_note_items',
          policy: 'delivery_note_items_authenticated_access'
        },
        {
          table: 'payments',
          policy: 'payments_authenticated_access'
        },
        {
          table: 'payment_allocations',
          policy: 'payment_allocations_authenticated_access'
        },
        {
          table: 'remittance_advice',
          policy: 'remittance_advice_authenticated_access'
        },
        {
          table: 'remittance_advice_items',
          policy: 'remittance_advice_items_authenticated_access'
        },
        {
          table: 'stock_movements',
          policy: 'stock_movements_authenticated_access'
        }
      ];

      // Try to create all policies using the exec RPC function
      const allPoliciesSql = policies.map(({ table, policy }) => `
        CREATE POLICY IF NOT EXISTS "${policy}" ON ${table}
        FOR ALL USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
      `).join('\n');

      try {
        const { error } = await supabase.rpc('exec', { sql: allPoliciesSql }) as any;

        if (error) {
          console.warn('Could not create RLS policies via RPC:', error.message);
          return {
            success: false,
            message: `Could not create policies: ${error.message}`
          };
        }

        console.log('✅ RLS policies created for all tables');
      } catch (rpcError) {
        console.warn('RPC not available, policies may need manual creation');
        return {
          success: false,
          message: 'RPC not available - manual policy creation required'
        };
      }

      return { 
        success: true, 
        message: 'RLS policies ensured for authenticated users' 
      };
    }

    // If no error, policies already exist or no RLS is enabled
    if (!testError) {
      console.log('✅ RLS policies already configured - invoices table is accessible');
      return { 
        success: true, 
        message: 'RLS policies already exist' 
      };
    }

    // Other error - log it but continue
    console.warn('⚠️ Could not verify RLS policies:', testError.message);
    return { 
      success: false, 
      message: testError.message || 'Could not verify RLS policies' 
    };

  } catch (error) {
    console.error('Error ensuring RLS policies:', {
      message: error instanceof Error ? error.message : String(error),
      error
    });
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Alternative approach: Create RLS policies using raw SQL
 * Call this if the RPC approach doesn't work
 */
export async function ensureRLSPoliciesViaSQL(): Promise<{ success: boolean; sql: string }> {
  const sql = `
-- Create RLS policies for authenticated users to access invoices and related tables
CREATE POLICY IF NOT EXISTS "invoices_authenticated_access" ON invoices
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "invoice_items_authenticated_access" ON invoice_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "quotations_authenticated_access" ON quotations
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "quotation_items_authenticated_access" ON quotation_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "proforma_invoices_authenticated_access" ON proforma_invoices
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "proforma_items_authenticated_access" ON proforma_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "delivery_notes_authenticated_access" ON delivery_notes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "delivery_note_items_authenticated_access" ON delivery_note_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "payments_authenticated_access" ON payments
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "payment_allocations_authenticated_access" ON payment_allocations
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "remittance_advice_authenticated_access" ON remittance_advice
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "remittance_advice_items_authenticated_access" ON remittance_advice_items
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "stock_movements_authenticated_access" ON stock_movements
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
  `;

  return { 
    success: true, 
    sql 
  };
}
