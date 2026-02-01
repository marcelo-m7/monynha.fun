-- 1. Check if 'nao-classificados' category exists
DO $$
DECLARE
    unclassified_category_id UUID;
BEGIN
    SELECT id INTO unclassified_category_id FROM public.categories WHERE slug = 'nao-classificados';

    -- 2. If 'nao-classificados' category does not exist, create it
    IF unclassified_category_id IS NULL THEN
        INSERT INTO public.categories (name, slug, icon, color)
        VALUES ('Não Classificados', 'nao-classificados', 'HelpCircle', '#9CA3AF')
        RETURNING id INTO unclassified_category_id;
        RAISE NOTICE 'Created new category "Não Classificados" with ID: %', unclassified_category_id;
    ELSE
        RAISE NOTICE 'Category "Não Classificados" already exists with ID: %', unclassified_category_id;
    END IF;

    -- 3. Update videos with NULL category_id to 'nao-classificados'
    UPDATE public.videos
    SET category_id = unclassified_category_id
    WHERE category_id IS NULL;

    RAISE NOTICE 'All uncategorized videos have been assigned to "Não Classificados" category.';
END $$;