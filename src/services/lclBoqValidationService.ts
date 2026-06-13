import { supabase } from '@/integrations/supabase/client';

export interface LCLBOQValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface LCLBOQValidationResult {
  valid: boolean;
  errors: LCLBOQValidationError[];
  summary: {
    itemCount: number;
    totalAmount: number;
    hasAllRequiredFields: boolean;
  };
}

interface ItemSnapshot {
  items?: Array<{
    quantity?: number;
    unit_price?: number;
    total?: number;
    description?: string;
    unit?: string;
  }>;
  subtotal?: number;
  tax_amount?: number;
  grand_total?: number;
}

class LCLBOQValidationService {
  /**
   * Validate LCL BOQ items snapshot structure and consistency
   */
  validateItemsSnapshot(itemsSnapshot: any): LCLBOQValidationResult {
    const errors: LCLBOQValidationError[] = [];
    let itemCount = 0;
    let totalAmount = 0;

    // Check if snapshot exists and is an object
    if (!itemsSnapshot) {
      errors.push({
        field: 'items_snapshot',
        message: 'Items snapshot is missing',
        severity: 'error',
      });
      return {
        valid: false,
        errors,
        summary: {
          itemCount: 0,
          totalAmount: 0,
          hasAllRequiredFields: false,
        },
      };
    }

    const snapshot = itemsSnapshot as ItemSnapshot;

    // Check if items array exists
    if (!snapshot.items || !Array.isArray(snapshot.items)) {
      errors.push({
        field: 'items_snapshot.items',
        message: 'Items must be an array',
        severity: 'error',
      });
      return {
        valid: false,
        errors,
        summary: {
          itemCount: 0,
          totalAmount: 0,
          hasAllRequiredFields: false,
        },
      };
    }

    // Check if items array is empty
    if (snapshot.items.length === 0) {
      errors.push({
        field: 'items_snapshot.items',
        message: 'At least one item is required',
        severity: 'error',
      });
    }

    itemCount = snapshot.items.length;

    // Validate each item
    let calculatedSubtotal = 0;
    snapshot.items.forEach((item, index) => {
      const itemPath = `items_snapshot.items[${index}]`;

      if (!item.description || item.description.trim() === '') {
        errors.push({
          field: `${itemPath}.description`,
          message: 'Item description is required',
          severity: 'error',
        });
      }

      if (!item.unit || item.unit.trim() === '') {
        errors.push({
          field: `${itemPath}.unit`,
          message: 'Item unit is required',
          severity: 'error',
        });
      }

      if (item.quantity === undefined || item.quantity === null) {
        errors.push({
          field: `${itemPath}.quantity`,
          message: 'Item quantity is required',
          severity: 'error',
        });
      } else if (item.quantity < 0) {
        errors.push({
          field: `${itemPath}.quantity`,
          message: 'Item quantity cannot be negative',
          severity: 'error',
        });
      }

      if (item.unit_price === undefined || item.unit_price === null) {
        errors.push({
          field: `${itemPath}.unit_price`,
          message: 'Item unit price is required',
          severity: 'error',
        });
      } else if (item.unit_price < 0) {
        errors.push({
          field: `${itemPath}.unit_price`,
          message: 'Item unit price cannot be negative',
          severity: 'error',
        });
      }

      // Validate item total calculation
      if (
        item.quantity !== undefined &&
        item.unit_price !== undefined &&
        item.total !== undefined
      ) {
        const expectedTotal = item.quantity * item.unit_price;
        const tolerance = 0.01; // Allow 0.01 for rounding errors
        if (Math.abs(item.total - expectedTotal) > tolerance) {
          errors.push({
            field: `${itemPath}.total`,
            message: `Item total mismatch: expected ${expectedTotal}, got ${item.total}`,
            severity: 'warning',
          });
        }
        calculatedSubtotal += item.quantity * item.unit_price;
      }
    });

    // Validate snapshot totals
    if (snapshot.subtotal !== undefined && snapshot.subtotal !== null) {
      const tolerance = 0.01;
      if (Math.abs(snapshot.subtotal - calculatedSubtotal) > tolerance) {
        errors.push({
          field: 'items_snapshot.subtotal',
          message: `Subtotal mismatch: expected ${calculatedSubtotal}, got ${snapshot.subtotal}`,
          severity: 'warning',
        });
      }
      totalAmount = snapshot.subtotal;
    } else {
      totalAmount = calculatedSubtotal;
    }

    // Validate tax amount if present
    if (snapshot.tax_amount !== undefined && snapshot.tax_amount !== null) {
      if (snapshot.tax_amount < 0) {
        errors.push({
          field: 'items_snapshot.tax_amount',
          message: 'Tax amount cannot be negative',
          severity: 'error',
        });
      }
    }

    // Validate grand total if present
    if (snapshot.grand_total !== undefined && snapshot.grand_total !== null) {
      const expectedTotal = (snapshot.subtotal || calculatedSubtotal) + (snapshot.tax_amount || 0);
      const tolerance = 0.01;
      if (Math.abs(snapshot.grand_total - expectedTotal) > tolerance) {
        errors.push({
          field: 'items_snapshot.grand_total',
          message: `Grand total mismatch: expected ${expectedTotal}, got ${snapshot.grand_total}`,
          severity: 'warning',
        });
      }
      totalAmount = snapshot.grand_total;
    }

    const hasErrors = errors.some((e) => e.severity === 'error');

    return {
      valid: !hasErrors,
      errors,
      summary: {
        itemCount,
        totalAmount,
        hasAllRequiredFields: !hasErrors,
      },
    };
  }

  /**
   * Validate complete LCL BOQ data
   */
  validateLCLBOQ(boq: any): LCLBOQValidationResult {
    const errors: LCLBOQValidationError[] = [];

    // Validate required fields
    if (!boq.number || boq.number.trim() === '') {
      errors.push({
        field: 'number',
        message: 'BOQ number is required',
        severity: 'error',
      });
    }

    if (!boq.boq_date) {
      errors.push({
        field: 'boq_date',
        message: 'BOQ date is required',
        severity: 'error',
      });
    }

    // Validate items snapshot
    if (!boq.items_snapshot) {
      errors.push({
        field: 'items_snapshot',
        message: 'Items snapshot is required',
        severity: 'error',
      });
    } else {
      const snapshotValidation = this.validateItemsSnapshot(boq.items_snapshot);
      errors.push(...snapshotValidation.errors);
    }

    // Validate financial fields
    if (boq.discount_type) {
      if (!['percentage', 'fixed'].includes(boq.discount_type)) {
        errors.push({
          field: 'discount_type',
          message: 'Discount type must be either percentage or fixed',
          severity: 'error',
        });
      }

      if (boq.discount_type === 'percentage' && boq.discount_value > 100) {
        errors.push({
          field: 'discount_value',
          message: 'Discount percentage cannot exceed 100',
          severity: 'error',
        });
      }
    }

    if (boq.tax_type) {
      const validTaxTypes = ['VAT', 'GST', 'Sales Tax', 'Other', 'None'];
      if (!validTaxTypes.includes(boq.tax_type)) {
        errors.push({
          field: 'tax_type',
          message: `Tax type must be one of: ${validTaxTypes.join(', ')}`,
          severity: 'error',
        });
      }
    }

    const hasErrors = errors.some((e) => e.severity === 'error');
    const snapshot = boq.items_snapshot as ItemSnapshot | undefined;
    const itemCount = snapshot?.items?.length || 0;
    const totalAmount = snapshot?.grand_total || snapshot?.subtotal || 0;

    return {
      valid: !hasErrors,
      errors,
      summary: {
        itemCount,
        totalAmount,
        hasAllRequiredFields: !hasErrors,
      },
    };
  }

  /**
   * Approve an LCL BOQ
   */
  async approveLCLBOQ(
    boqId: string,
    approverUserId: string,
    approvalNotes?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('lcl_boqs')
      .update({
        approval_status: 'approved',
        approved_by: approverUserId,
        approval_date: new Date().toISOString(),
        approval_notes: approvalNotes || null,
      })
      .eq('id', boqId);

    if (error) throw error;
  }

  /**
   * Reject an LCL BOQ
   */
  async rejectLCLBOQ(
    boqId: string,
    rejectedByUserId: string,
    rejectionNotes: string
  ): Promise<void> {
    const { error } = await supabase
      .from('lcl_boqs')
      .update({
        approval_status: 'rejected',
        approved_by: rejectedByUserId,
        approval_date: new Date().toISOString(),
        approval_notes: rejectionNotes,
      })
      .eq('id', boqId);

    if (error) throw error;
  }

  /**
   * Request revision for an LCL BOQ
   */
  async requestRevisionLCLBOQ(
    boqId: string,
    requesterUserId: string,
    revisionNotes: string
  ): Promise<void> {
    const { error } = await supabase
      .from('lcl_boqs')
      .update({
        approval_status: 'needs_revision',
        approved_by: requesterUserId,
        approval_notes: revisionNotes,
      })
      .eq('id', boqId);

    if (error) throw error;
  }

  /**
   * Lock an LCL BOQ to prevent editing
   */
  async lockLCLBOQ(
    boqId: string,
    userId: string,
    expiresIn: number = 3600000 // 1 hour default
  ): Promise<void> {
    const lockExpiresAt = new Date(Date.now() + expiresIn).toISOString();

    const { error } = await supabase
      .from('lcl_boqs')
      .update({
        locked_by: userId,
        locked_at: new Date().toISOString(),
        lock_expires_at: lockExpiresAt,
      })
      .eq('id', boqId);

    if (error) throw error;
  }

  /**
   * Unlock an LCL BOQ
   */
  async unlockLCLBOQ(boqId: string): Promise<void> {
    const { error } = await supabase
      .from('lcl_boqs')
      .update({
        locked_by: null,
        locked_at: null,
        lock_expires_at: null,
      })
      .eq('id', boqId);

    if (error) throw error;
  }

  /**
   * Create a revision of an LCL BOQ
   */
  async createRevision(
    boqId: string,
    userId: string,
    updates: any
  ): Promise<string> {
    // Get current BOQ
    const { data: currentBOQ, error: fetchError } = await supabase
      .from('lcl_boqs')
      .select('*')
      .eq('id', boqId)
      .single();

    if (fetchError) throw fetchError;

    // Create new BOQ with incremented revision number
    const newRevisionNumber = (currentBOQ.revision_number || 1) + 1;
    const newNumber = `${currentBOQ.number}-R${newRevisionNumber}`;

    const { data: newBOQ, error: createError } = await supabase
      .from('lcl_boqs')
      .insert({
        company_id: currentBOQ.company_id,
        number: newNumber,
        customer_id: currentBOQ.customer_id,
        project_title: currentBOQ.project_title,
        boq_date: currentBOQ.boq_date,
        items_snapshot: updates.items_snapshot || currentBOQ.items_snapshot,
        notes: updates.notes || currentBOQ.notes,
        status: 'draft',
        approval_status: 'pending',
        revision_number: newRevisionNumber,
        previous_version_id: boqId,
        created_by: userId,
      })
      .select('id')
      .single();

    if (createError) throw createError;

    return newBOQ.id;
  }

  /**
   * Calculate financial totals for an LCL BOQ
   */
  calculateTotals(
    itemsSnapshot: ItemSnapshot,
    discountType?: string,
    discountValue?: number,
    taxRate: number = 0.16 // Default 16% VAT
  ): {
    subtotal: number;
    discountAmount: number;
    subtotalAfterDiscount: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = itemsSnapshot.subtotal || itemsSnapshot.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;

    let discountAmount = 0;
    if (discountType === 'percentage' && discountValue) {
      discountAmount = subtotal * (discountValue / 100);
    } else if (discountType === 'fixed' && discountValue) {
      discountAmount = discountValue;
    }

    const subtotalAfterDiscount = Math.max(subtotal - discountAmount, 0);
    const taxAmount = subtotalAfterDiscount * taxRate;
    const totalAmount = subtotalAfterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      subtotalAfterDiscount,
      taxAmount,
      totalAmount,
    };
  }
}

export const lclBOQValidationService = new LCLBOQValidationService();
