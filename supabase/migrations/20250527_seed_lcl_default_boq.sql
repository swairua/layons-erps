-- =========================================================
-- SEED LCL DEFAULT BOQ STRUCTURE
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- CREATE DEFAULT STRUCTURES PER COMPANY
-- =========================================================

INSERT INTO lcl_template_structures (
    company_id,
    name,
    description,
    structure_data,
    is_active,
    created_at,
    updated_at
)
SELECT
    c.id,
    'LCL Default BOQ',
    'Default BOQ structure for Layons Construction projects (BOQ-085: Proposed Residential Maisonette)',
    
    jsonb_build_object(
        'sections',
        jsonb_build_array(

            jsonb_build_object(
                'id', 'section_a',
                'name', 'Section A: Foundation',
                'subsections', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'section_a_materials',
                        'name', 'Materials'
                    ),
                    jsonb_build_object(
                        'id', 'section_a_labor',
                        'name', 'Labor'
                    )
                )
            ),

            jsonb_build_object(
                'id', 'section_b',
                'name', 'Section B: Ground Floor Walling',
                'subsections', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'section_b_materials',
                        'name', 'Materials'
                    ),
                    jsonb_build_object(
                        'id', 'section_b_labor',
                        'name', 'Labor'
                    )
                )
            ),

            jsonb_build_object(
                'id', 'section_c',
                'name', 'Section C: Ground Floor Suspended Slab',
                'subsections', jsonb_build_array(
                    jsonb_build_object(
                        'id', 'section_c_materials',
                        'name', 'Materials'
                    ),
                    jsonb_build_object(
                        'id', 'section_c_labor',
                        'name', 'Labor'
                    )
                )
            )

        )
    ),

    true,
    NOW(),
    NOW()

FROM companies c

WHERE NOT EXISTS (
    SELECT 1
    FROM lcl_template_structures lts
    WHERE lts.company_id = c.id
      AND lts.name = 'LCL Default BOQ'
);

-- =========================================================
-- INSERT TEMPLATE ITEMS
-- =========================================================

WITH lcl_structures AS (
    SELECT
        id,
        company_id
    FROM lcl_template_structures
    WHERE name = 'LCL Default BOQ'
)

INSERT INTO lcl_template_items (
    company_id,
    structure_id,
    section_id,
    subsection_id,
    item_number,
    description,
    unit,
    default_qty,
    default_rate,
    sort_order,
    created_at,
    updated_at
)

SELECT
    s.company_id,
    s.id,
    item.section_id,
    item.subsection_id,
    item.item_number,
    item.description,
    item.unit,
    item.qty,
    item.rate,
    item.sort_order,
    NOW(),
    NOW()

FROM lcl_structures s

CROSS JOIN LATERAL (

    VALUES

    -- =====================================================
    -- SECTION A MATERIALS
    -- =====================================================

    ('section_a', 'section_a_materials', '1', 'Ballast', 'Trucks', 7, 30000, 0),
    ('section_a', 'section_a_materials', '2', 'Sand', 'Trucks', 8, 30000, 1),
    ('section_a', 'section_a_materials', '3', 'Cement', 'Bags', 230, 850, 2),
    ('section_a', 'section_a_materials', '4', 'Quarry Dust', 'Trucks', 20, 2180, 3),
    ('section_a', 'section_a_materials', '5', 'Rock Sand', 'Trucks', 2, 30000, 4),
    ('section_a', 'section_a_materials', '6', 'D20', 'Pcs', 5, 2700, 5),
    ('section_a', 'section_a_materials', '7', 'D12', 'Pcs', 30, 1190, 6),
    ('section_a', 'section_a_materials', '8', 'D10', 'Pcs', 62, 825, 7),
    ('section_a', 'section_a_materials', '9', 'D8', 'Pcs', 80, 530, 8),

    -- =====================================================
    -- SECTION A LABOR
    -- =====================================================

    ('section_a', 'section_a_labor', '1', 'Setting Out', 'Item', 1, 6000, 0),
    ('section_a', 'section_a_labor', '2', 'Bar Bending', 'Item', 1, 14000, 1),
    ('section_a', 'section_a_labor', '3', 'Excavation & Levelling', 'Item', 1, 40000, 2),
    ('section_a', 'section_a_labor', '4', 'Bases & Trenches Concreting', 'Item', 1, 24000, 3),

    -- =====================================================
    -- SECTION B MATERIALS
    -- =====================================================

    ('section_b', 'section_b_materials', '1', 'Machine Cut Stones 6 by 9', 'Pcs', 2800, 60, 0),
    ('section_b', 'section_b_materials', '2', 'Machine-cut 6x9', 'Pcs', 100, 60, 1),
    ('section_b', 'section_b_materials', '3', 'Quarry Dust', 'Trucks', 1, 30000, 2),
    ('section_b', 'section_b_materials', '4', 'Rock Sand', 'Trucks', 2, 30000, 3),
    ('section_b', 'section_b_materials', '5', 'Sand', 'Trucks', 2, 30000, 4),

    -- =====================================================
    -- SECTION B LABOR
    -- =====================================================

    ('section_b', 'section_b_labor', '1', 'Setting & Levelling', 'Item', 1, 12000, 0),
    ('section_b', 'section_b_labor', '2', 'Bar Bending', 'Item', 1, 14000, 1),

    -- =====================================================
    -- SECTION C MATERIALS
    -- =====================================================

    ('section_c', 'section_c_materials', '1', 'Quarry Dust', 'Trucks', 1, 30000, 0),
    ('section_c', 'section_c_materials', '2', 'Rock Sand', 'Trucks', 2, 30000, 1),
    ('section_c', 'section_c_materials', '3', 'Timber 3x2', 'Ft', 2000, 25, 2),
    ('section_c', 'section_c_materials', '4', 'Timber 6x1', 'Ft', 1500, 25, 3),

    -- =====================================================
    -- SECTION C LABOR
    -- =====================================================

    ('section_c', 'section_c_labor', '1', 'Formwork', 'Item', 1, 70000, 0),
    ('section_c', 'section_c_labor', '2', 'Bar Bending', 'Item', 1, 60000, 1)

) AS item(
    section_id,
    subsection_id,
    item_number,
    description,
    unit,
    qty,
    rate,
    sort_order
)

WHERE NOT EXISTS (
    SELECT 1
    FROM lcl_template_items li
    WHERE li.structure_id = s.id
      AND li.section_id = item.section_id
      AND li.subsection_id = item.subsection_id
      AND li.item_number = item.item_number
);