-- Migration: Convert excluded_line_item_ids to negative "removed" line items
-- This migration transforms the old exclusion system into the new negative line item approach
-- where removed original estimate lines are represented as negative additionals with action='removed'

-- Step 1: Add a temporary function to process each assessment_additionals record
CREATE OR REPLACE FUNCTION migrate_exclusions_to_removed_lines()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    additionals_record RECORD;
    estimate_record RECORD;
    excluded_id TEXT;
    original_line JSONB;
    removed_line JSONB;
    new_line_items JSONB;
    approved_items JSONB[];
    subtotal DECIMAL(10,2);
    vat_amount DECIMAL(10,2);
    total DECIMAL(10,2);
BEGIN
    -- Loop through all assessment_additionals records that have exclusions
    FOR additionals_record IN 
        SELECT * FROM assessment_additionals 
        WHERE excluded_line_item_ids IS NOT NULL 
        AND jsonb_array_length(excluded_line_item_ids) > 0
    LOOP
        -- Get the corresponding estimate
        SELECT * INTO estimate_record 
        FROM assessment_estimates 
        WHERE assessment_id = additionals_record.assessment_id;
        
        IF estimate_record IS NULL THEN
            CONTINUE; -- Skip if no estimate found
        END IF;
        
        -- Start with existing line items
        new_line_items := additionals_record.line_items;
        
        -- Process each excluded line item ID
        FOR excluded_id IN 
            SELECT jsonb_array_elements_text(additionals_record.excluded_line_item_ids)
        LOOP
            -- Find the original line item in the estimate
            SELECT line_item INTO original_line
            FROM jsonb_array_elements(estimate_record.line_items) AS line_item
            WHERE line_item->>'id' = excluded_id;
            
            IF original_line IS NOT NULL THEN
                -- Create a negative "removed" line item
                removed_line := jsonb_build_object(
                    'id', gen_random_uuid()::text,
                    'process_type', original_line->>'process_type',
                    'description', original_line->>'description',
                    'part_number', original_line->>'part_number',
                    'part_type', original_line->>'part_type',
                    'part_price_nett', CASE 
                        WHEN original_line->>'part_price_nett' IS NOT NULL 
                        THEN -(original_line->>'part_price_nett')::numeric 
                        ELSE NULL 
                    END,
                    'part_price', CASE 
                        WHEN original_line->>'part_price' IS NOT NULL 
                        THEN -(original_line->>'part_price')::numeric 
                        ELSE NULL 
                    END,
                    'strip_assemble_hours', original_line->>'strip_assemble_hours',
                    'strip_assemble', CASE 
                        WHEN original_line->>'strip_assemble' IS NOT NULL 
                        THEN -(original_line->>'strip_assemble')::numeric 
                        ELSE NULL 
                    END,
                    'labour_hours', original_line->>'labour_hours',
                    'labour_cost', CASE 
                        WHEN original_line->>'labour_cost' IS NOT NULL 
                        THEN -(original_line->>'labour_cost')::numeric 
                        ELSE 0 
                    END,
                    'paint_panels', original_line->>'paint_panels',
                    'paint_cost', CASE 
                        WHEN original_line->>'paint_cost' IS NOT NULL 
                        THEN -(original_line->>'paint_cost')::numeric 
                        ELSE 0 
                    END,
                    'outwork_charge_nett', CASE 
                        WHEN original_line->>'outwork_charge_nett' IS NOT NULL 
                        THEN -(original_line->>'outwork_charge_nett')::numeric 
                        ELSE NULL 
                    END,
                    'outwork_charge', CASE 
                        WHEN original_line->>'outwork_charge' IS NOT NULL 
                        THEN -(original_line->>'outwork_charge')::numeric 
                        ELSE NULL 
                    END,
                    'total', CASE 
                        WHEN original_line->>'total' IS NOT NULL 
                        THEN -(original_line->>'total')::numeric 
                        ELSE 0 
                    END,
                    'status', 'approved',
                    'action', 'removed',
                    'original_line_id', excluded_id,
                    'approved_at', NOW()::text,
                    'decline_reason', NULL,
                    'declined_at', NULL,
                    'approved_by', NULL
                );
                
                -- Append to line items array
                new_line_items := new_line_items || removed_line;
            END IF;
        END LOOP;
        
        -- Recalculate approved totals
        SELECT COALESCE(array_agg(item), ARRAY[]::jsonb[]) INTO approved_items
        FROM jsonb_array_elements(new_line_items) AS item
        WHERE item->>'status' = 'approved';
        
        subtotal := 0;
        FOR i IN 1..array_length(approved_items, 1) LOOP
            subtotal := subtotal + COALESCE((approved_items[i]->>'total')::numeric, 0);
        END LOOP;
        
        vat_amount := subtotal * (additionals_record.vat_percentage / 100);
        total := subtotal + vat_amount;
        
        -- Update the record with new line items, cleared exclusions, and recalculated totals
        UPDATE assessment_additionals
        SET 
            line_items = new_line_items,
            excluded_line_item_ids = '[]'::jsonb,
            subtotal_approved = ROUND(subtotal, 2),
            vat_amount_approved = ROUND(vat_amount, 2),
            total_approved = ROUND(total, 2),
            updated_at = NOW()
        WHERE id = additionals_record.id;
        
        RAISE NOTICE 'Migrated % exclusions for assessment %', 
            jsonb_array_length(additionals_record.excluded_line_item_ids),
            additionals_record.assessment_id;
    END LOOP;
END;
$$;

-- Step 2: Execute the migration
SELECT migrate_exclusions_to_removed_lines();

-- Step 3: Drop the temporary function
DROP FUNCTION migrate_exclusions_to_removed_lines();

-- Step 4: Update column comment to mark as deprecated
COMMENT ON COLUMN assessment_additionals.excluded_line_item_ids IS 
'DEPRECATED: Use action=''removed'' line items instead. Kept for backward compatibility. Should always be empty array after migration 037.';

-- Step 5: Log completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 037 completed: Exclusions converted to negative removed line items';
END $$;

