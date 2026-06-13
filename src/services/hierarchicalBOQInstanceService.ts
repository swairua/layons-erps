import { supabase } from '@/integrations/supabase/client';

export interface BOQInstanceData {
  structureId: string;
  number: string;
  boqDate: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectTitle?: string;
  currency?: string;
  taxType?: string;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  notes?: string;
  attachmentUrl?: string;
}

export interface BOQInstanceRecord {
  id: string;
  company_id: string;
  structure_id: string;
  number: string;
  boq_date: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  project_title?: string;
  currency: string;
  subtotal: number;
  discount_type?: string;
  discount_value: number;
  discount_amount: number;
  tax_type: string;
  tax_amount: number;
  total_amount: number;
  approval_status: string;
  approved_by?: string;
  approval_date?: string;
  approval_notes?: string;
  revision_number: number;
  previous_version_id?: string;
  locked_by?: string;
  locked_at?: string;
  created_by?: string;
  created_at: string;
  updated_by?: string;
  updated_at: string;
  notes?: string;
  attachment_url?: string;
}

export interface BOQItemCost {
  id: string;
  boq_instance_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  material_cost?: number;
  labor_cost?: number;
  equipment_cost?: number;
  margin_percentage?: number;
  margin_amount?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

class HierarchicalBOQInstanceService {
  /**
   * Create a new BOQ instance from a structure template
   */
  async createInstance(
    companyId: string,
    userId: string,
    data: BOQInstanceData
  ): Promise<BOQInstanceRecord> {
    const validationResult = this.validateInstanceData(data);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
    }

    const instanceData = {
      company_id: companyId,
      structure_id: data.structureId,
      number: data.number,
      boq_date: data.boqDate,
      client_name: data.clientName || null,
      client_email: data.clientEmail || null,
      client_phone: data.clientPhone || null,
      client_address: data.clientAddress || null,
      project_title: data.projectTitle || null,
      currency: data.currency || 'KES',
      tax_type: data.taxType || 'VAT',
      discount_type: data.discountType || null,
      discount_value: data.discountValue || 0,
      discount_amount: 0,
      approval_status: data.approvalStatus || 'pending',
      subtotal: 0,
      tax_amount: 0,
      total_amount: 0,
      created_by: userId,
      notes: data.notes || null,
      attachment_url: data.attachmentUrl || null,
    };

    const { data: created, error } = await supabase
      .from('boq_hierarchical_instances')
      .insert(instanceData)
      .select()
      .single();

    if (error) throw error;
    return created as BOQInstanceRecord;
  }

  /**
   * Get a BOQ instance by ID
   */
  async getInstance(instanceId: string): Promise<BOQInstanceRecord> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Get all BOQ instances for a structure
   */
  async getInstancesByStructure(structureId: string): Promise<BOQInstanceRecord[]> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .select('*')
      .eq('structure_id', structureId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BOQInstanceRecord[];
  }

  /**
   * Get all BOQ instances for a company
   */
  async getInstancesByCompany(companyId: string): Promise<BOQInstanceRecord[]> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BOQInstanceRecord[];
  }

  /**
   * Update BOQ instance
   */
  async updateInstance(
    instanceId: string,
    userId: string,
    updates: Partial<BOQInstanceData>
  ): Promise<BOQInstanceRecord> {
    const instance = await this.getInstance(instanceId);
    if (instance.locked_by && instance.locked_at) {
      throw new Error('BOQ is currently locked and cannot be edited');
    }

    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
    if (updates.projectTitle !== undefined) updateData.project_title = updates.projectTitle;
    if (updates.taxType !== undefined) updateData.tax_type = updates.taxType;
    if (updates.discountType !== undefined) updateData.discount_type = updates.discountType;
    if (updates.discountValue !== undefined) updateData.discount_value = updates.discountValue;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .update(updateData)
      .eq('id', instanceId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Add item cost to BOQ instance with optional cost breakdown
   */
  async addItemCost(
    companyId: string,
    instanceId: string,
    itemId: string,
    quantity: number,
    unitPrice: number,
    costBreakdown?: {
      materialCost?: number;
      laborCost?: number;
      equipmentCost?: number;
      marginPercentage?: number;
    }
  ): Promise<BOQItemCost> {
    // Validate quantities and prices
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }

    const totalAmount = quantity * unitPrice;
    let marginAmount = 0;
    if (costBreakdown?.marginPercentage) {
      marginAmount = totalAmount * (costBreakdown.marginPercentage / 100);
    }

    const costData = {
      company_id: companyId,
      boq_instance_id: instanceId,
      item_id: itemId,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      material_cost: costBreakdown?.materialCost,
      labor_cost: costBreakdown?.laborCost,
      equipment_cost: costBreakdown?.equipmentCost,
      margin_percentage: costBreakdown?.marginPercentage,
      margin_amount: marginAmount,
    };

    const { data, error } = await supabase
      .from('boq_hierarchical_item_costs')
      .insert(costData)
      .select()
      .single();

    if (error) throw error;
    return data as BOQItemCost;
  }

  /**
   * Update item cost in instance
   */
  async updateItemCost(
    costId: string,
    updates: Partial<{
      quantity: number;
      unitPrice: number;
      materialCost?: number;
      laborCost?: number;
      equipmentCost?: number;
      marginPercentage?: number;
    }>
  ): Promise<BOQItemCost> {
    const cost = await supabase
      .from('boq_hierarchical_item_costs')
      .select('*')
      .eq('id', costId)
      .single()
      .then((r) => r.data);

    const quantity = updates.quantity ?? cost.quantity;
    const unitPrice = updates.unitPrice ?? cost.unit_price;
    const totalAmount = quantity * unitPrice;
    let marginAmount = cost.margin_amount;

    if (updates.marginPercentage !== undefined) {
      marginAmount = totalAmount * (updates.marginPercentage / 100);
    }

    const updateData: any = {
      total_amount: totalAmount,
      ...updates,
      margin_amount: marginAmount,
    };

    const { data, error } = await supabase
      .from('boq_hierarchical_item_costs')
      .update(updateData)
      .eq('id', costId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQItemCost;
  }

  /**
   * Get item costs for a BOQ instance
   */
  async getInstanceItemCosts(instanceId: string): Promise<BOQItemCost[]> {
    const { data, error } = await supabase
      .from('boq_hierarchical_item_costs')
      .select('*')
      .eq('boq_instance_id', instanceId);

    if (error) throw error;
    return (data || []) as BOQItemCost[];
  }

  /**
   * Recalculate instance totals based on item costs
   */
  async recalculateTotals(instanceId: string, userId: string): Promise<void> {
    const itemCosts = await this.getInstanceItemCosts(instanceId);
    const subtotal = itemCosts.reduce((sum, cost) => sum + cost.total_amount, 0);

    const instance = await this.getInstance(instanceId);
    let discountAmount = 0;
    if (instance.discount_type === 'percentage') {
      discountAmount = subtotal * (instance.discount_value / 100);
    } else if (instance.discount_type === 'fixed') {
      discountAmount = instance.discount_value;
    }

    const subtotalAfterDiscount = subtotal - discountAmount;
    let taxAmount = 0;
    if (instance.tax_type !== 'None') {
      // Assuming standard tax rate - can be made configurable
      const taxRate = 0.16; // VAT is typically 16%
      taxAmount = subtotalAfterDiscount * taxRate;
    }

    const totalAmount = subtotalAfterDiscount + taxAmount;

    const { error } = await supabase
      .from('boq_hierarchical_instances')
      .update({
        subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId);

    if (error) throw error;
  }

  /**
   * Approve a BOQ instance
   */
  async approveInstance(
    instanceId: string,
    approverUserId: string,
    notes?: string
  ): Promise<BOQInstanceRecord> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .update({
        approval_status: 'approved',
        approved_by: approverUserId,
        approval_date: new Date().toISOString(),
        approval_notes: notes || null,
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Reject a BOQ instance
   */
  async rejectInstance(
    instanceId: string,
    rejectedBy: string,
    notes: string
  ): Promise<BOQInstanceRecord> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .update({
        approval_status: 'rejected',
        approved_by: rejectedBy,
        approval_date: new Date().toISOString(),
        approval_notes: notes,
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Lock a BOQ instance to prevent editing
   */
  async lockInstance(
    instanceId: string,
    userId: string,
    expiresIn: number = 3600000 // 1 hour in milliseconds
  ): Promise<BOQInstanceRecord> {
    const lockExpiresAt = new Date(Date.now() + expiresIn).toISOString();

    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .update({
        locked_by: userId,
        locked_at: new Date().toISOString(),
        lock_expires_at: lockExpiresAt,
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Unlock a BOQ instance
   */
  async unlockInstance(instanceId: string): Promise<BOQInstanceRecord> {
    const { data, error } = await supabase
      .from('boq_hierarchical_instances')
      .update({
        locked_by: null,
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (error) throw error;
    return data as BOQInstanceRecord;
  }

  /**
   * Validate BOQ instance data before creation
   */
  private validateInstanceData(data: BOQInstanceData): ValidationResult {
    const errors: string[] = [];

    if (!data.number || data.number.trim() === '') {
      errors.push('BOQ number is required');
    }

    if (!data.structureId || data.structureId.trim() === '') {
      errors.push('Structure ID is required');
    }

    if (!data.boqDate) {
      errors.push('BOQ date is required');
    }

    if (data.discountValue && data.discountValue < 0) {
      errors.push('Discount value cannot be negative');
    }

    if (data.discountType === 'percentage' && data.discountValue && data.discountValue > 100) {
      errors.push('Discount percentage cannot exceed 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const hierarchicalBOQInstanceService = new HierarchicalBOQInstanceService();
