# Product Catalog Test Plan

## Application Overview

This test plan covers the PRODUCT CATALOG area of the Practice Software Testing - Toolshop storefront (https://practicesoftwaretesting.com/) for a fresh, unauthenticated visitor. In scope: browsing the product grid on the homepage/category listing, keyword search, sorting, the price-range slider filter, and the category/brand (and adjacent eco-friendly) checkbox filters, plus pagination as it interacts with all of the above.

Explicitly OUT of scope: checkout, cart, and authentication flows (covered by separate plans).

Key environment facts discovered during exploration, which shape the test design:
- The site is a shared public demo whose database is reseeded periodically. Product names, prices, IDs, and the exact number of products/pages WILL change over time. No test may assert a hardcoded product name, price, or count; instead tests must assert relative/structural facts (e.g., "all displayed prices are ascending", "every visible price falls within the selected range", "the result count text is consistent with the number of cards rendered").
- Interactive elements expose stable `data-test` attributes. Category and brand checkboxes and product cards embed a ULID in their `data-test` value (e.g. `category-01H...`, `brand-01H...`, `product-01H...`) that changes on reseed, so tests must discover these dynamically (e.g. by accessible name/label text or by reading the attribute at runtime) rather than hardcoding a ULID. Stable, reseed-independent test ids include: `sort`, `search-query`, `search-submit`, `search-reset`, `eco-friendly-filter`, `product-name`, `product-price`, `out-of-stock`, `co2-rating-badge`, `compare-btn`, `pagination-prev`, `pagination-next`.
- The main catalog page ("/") sidebar has 5 sections in this order: Sort, Price Range (a dual-handle ngx-slider, default bounds observed as 0–200 with initial selection 1–100, but these bounds are derived from seeded product prices and may differ after reseed), Search, By category (checkbox tree with parent categories - e.g. Hand Tools, Power Tools, Other - each expandable into subcategories), By brand (checkbox list), and Sustainability (single "Show only eco-friendly products" checkbox).
- Checking a parent category checkbox auto-checks all of its subcategory checkboxes and filters the grid to the union of those subcategories. Unchecking a single subcategory removes it from the filter criteria immediately (grid updates) even though the parent checkbox's own checked state is not visually revoked.
- Selecting a brand or category filters the grid instantly (no "Apply" button); there is no visible "Clear all filters" button, so filters must be cleared individually.
- Submitting a Search replaces the grid with a distinct header ("Searched for: <term>") and a result-count sentence ("N products found for '<term>'"); a search with zero matches shows "There are no products found." instead of product cards. Clicking the "X" button next to the search box clears the term and restores the unfiltered/filtered-by-other-criteria grid.
- The Sort dropdown offers Name (A-Z/Z-A), Price (High-Low/Low-High), and CO2 Rating (A-E/E-A); the chosen sort persists across filter, search, and pagination changes.
- Filters, search, and sort state are held in client-side app state only and are NOT reflected in the URL query string on the homepage, so a full page reload/reset returns to the unfiltered default view.
- Pagination shows numbered page buttons plus Previous («) and Next (») controls; Previous is disabled (has a "disabled" class) on page 1. Applying any new filter, search, or sort while on page 2+ resets the view back to page 1. The pagination control disappears entirely when all matching results fit on a single page.
- Product cards show: image, name, a CO2 rating indicator (A-E), a "Compare" checkbox/button, price, and conditionally an "Out of stock" badge or an "ECO" badge.
- The top navigation "Categories" menu links to separate, human-readable category landing pages (e.g. /category/hand-tools, /category/power-tools, /category/other, /category/special-tools) which use a stable URL slug (not a ULID). These landing pages show a "Category: <Name>" heading and a reduced sidebar (Sort, Filters, By category, By brand, Sustainability) WITHOUT the Price Range slider or the Search box, and the corresponding category checkbox is not necessarily pre-checked even though the grid is pre-filtered.

## Test Scenarios

### 1. Product Grid Browsing & Pagination

**Seed:** `tests/seed.spec.ts`

#### 1.1. Homepage loads with a populated product grid and pagination controls

**File:** `tests/product-catalog/grid-browsing.spec.ts`

**Steps:**
  1. Navigate to the storefront homepage ('/') as a fresh, unauthenticated visitor.
    - expect: The page loads without errors
    - expect: A grid of product cards is visible in the main content area
    - expect: Each visible product card shows an image, a name (data-test=product-name), a price (data-test=product-price), and a CO2 rating indicator
  2. Count the number of product cards rendered on the first page.
    - expect: The count is greater than 0 and does not exceed a reasonable page-size (e.g. <= 12), regardless of the exact number seeded
  3. Inspect the pagination control at the bottom of the grid.
    - expect: If more results exist than fit on one page, numbered page buttons plus Previous («) and Next (») controls are shown
    - expect: The Previous control is disabled while on page 1

#### 1.2. Navigating between pages updates the product set without duplicates

**File:** `tests/product-catalog/grid-browsing.spec.ts`

**Steps:**
  1. On the homepage, if more than one page exists, record the set of product names (data-test=product-name) shown on page 1.
    - expect: A non-empty list of product names is captured
  2. Click the 'Page-2' pagination button.
    - expect: The grid updates to show a different set of product names than page 1 (no overlap)
    - expect: The URL / visible state indicates page 2 is now active (e.g. the Page-2 button appears active/selected)
  3. Click the Next (») button.
    - expect: The grid advances to page 3's products, distinct from page 2's set
  4. Click the Previous («) button.
    - expect: The grid returns to page 2's exact product set as captured earlier
  5. Navigate back to page 1 using the 'Page-1' button.
    - expect: The original page 1 product set is restored
    - expect: The Previous control becomes disabled again

#### 1.3. Out-of-stock and eco-friendly badges render correctly when present

**File:** `tests/product-catalog/grid-browsing.spec.ts`

**Steps:**
  1. Browse the default homepage grid across a few pages looking for any product card containing an 'Out of stock' badge (data-test=out-of-stock).
    - expect: If such a card exists, the badge text reads 'Out of stock' and is displayed near the price, without asserting which specific product carries it
  2. Browse the grid looking for any product card containing an 'ECO' badge.
    - expect: If such a card exists, the badge is clearly visible on the product image without asserting which specific product carries it
  3. Click on a product card whose badge state was inspected.
    - expect: The browser navigates to a product detail URL matching the pattern /product/<id>
    - expect: The detail page loads (basic smoke check only; detailed PDP behavior is out of scope for this plan)

#### 1.4. Category top-navigation links show a scoped, reduced-filter catalog view

**File:** `tests/product-catalog/grid-browsing.spec.ts`

**Steps:**
  1. From the homepage, open the 'Categories' item in the main menu.
    - expect: A dropdown appears listing top-level categories (e.g. Hand Tools, Power Tools, Other, Special Tools) plus a Rentals link
  2. Click one of the top-level category links (e.g. 'Hand Tools').
    - expect: The browser navigates to a human-readable URL such as /category/hand-tools
    - expect: A heading reading 'Category: <Category Name>' is displayed
    - expect: Every product card shown belongs to that category (spot-check a few cards, without asserting specific product names)
  3. Inspect the sidebar on this category landing page.
    - expect: Sort, Filters/category tree, brand list, and Sustainability sections are present
    - expect: The Price Range slider and the Search box are NOT present on this page (they exist only on the main '/' catalog view)

### 2. Search

**Seed:** `tests/seed.spec.ts`

#### 2.1. Searching with a common keyword returns matching, relevant results

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. On the homepage, type a generic tool-related keyword (e.g. 'Hammer') into the Search textbox (data-test=search-query).
    - expect: The textbox reflects the typed value
  2. Click the Search button (data-test=search-submit).
    - expect: A heading such as 'Searched for: Hammer' appears above the grid
    - expect: A sentence such as 'N products found for \'Hammer\'' is shown, where N matches the number of product cards actually rendered across all result pages
    - expect: Every visible product name (data-test=product-name) contains the search keyword, case-insensitively
  3. If more than one page of results exists, paginate through them.
    - expect: Pagination works the same as on the unfiltered grid and every product across all pages still matches the keyword

#### 2.2. Search is case-insensitive and tolerant of leading/trailing whitespace

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. Search for a keyword in an unusual case, e.g. 'hAmMeR'.
    - expect: Results returned are identical in count and content to searching the same keyword in standard case
  2. Clear the search box and search again with the same keyword surrounded by extra spaces, e.g. '  Hammer  '.
    - expect: The search still executes and returns the same result set as the trimmed keyword (or, if the app does not trim, this behavior should be explicitly noted as a defect rather than assumed)

#### 2.3. Searching for a term with no matches shows an explicit empty state

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. Type a nonsense keyword guaranteed not to match any product, e.g. 'zzzznoresultsxyz123', into the search box and submit.
    - expect: The heading reflects the searched term
    - expect: The message 'There are no products found.' (or equivalent empty-state copy) is shown
    - expect: No product cards are rendered
    - expect: No pagination controls are shown

#### 2.4. Resetting the search restores the unfiltered/base grid

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. Perform a keyword search that narrows the grid (e.g. 'Hammer') and confirm the filtered heading/result count appear.
    - expect: The grid is filtered as described in the happy-path search test
  2. Click the 'X' reset button (data-test=search-reset) next to the search box.
    - expect: The search textbox is cleared
    - expect: The 'Searched for' heading disappears
    - expect: The grid returns to showing the full, unfiltered product catalog (same page count as a fresh homepage load with no filters)

#### 2.5. Submitting an empty search behaves the same as no search

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. On a fresh homepage load, leave the Search textbox empty and click the Search button.
    - expect: No error is shown
    - expect: The grid continues to display the full, unfiltered catalog (or is unchanged if a search heading never appears for an empty query)

#### 2.6. Search combines with an active category or brand filter

**File:** `tests/product-catalog/search.spec.ts`

**Steps:**
  1. Select one category checkbox (e.g. any subcategory under 'Hand Tools') so the grid is filtered.
    - expect: The grid narrows to that category's products
  2. With the category filter still active, enter a keyword into Search and submit that keyword.
    - expect: Every resulting product name matches the keyword AND belongs to the previously selected category (spot-check by comparing against the unfiltered category product list), i.e. search and category filter combine rather than one overriding the other -- or, if the app design intentionally has search override category filtering, that behavior is captured as the actual/expected result rather than assumed

### 3. Sorting

**Seed:** `tests/seed.spec.ts`

#### 3.1. Sorting by Name (A-Z) and (Z-A) orders products alphabetically

**File:** `tests/product-catalog/sorting.spec.ts`

**Steps:**
  1. On the homepage, open the Sort dropdown (data-test=sort) and select 'Name (A - Z)'.
    - expect: The list of visible product names (data-test=product-name), read top-to-bottom/left-to-right in card order, is in ascending alphabetical order on every page of results
  2. Change the Sort dropdown to 'Name (Z - A)'.
    - expect: The list of visible product names is in descending alphabetical order
    - expect: The result differs from the A-Z ordering (unless there is only one product)

#### 3.2. Sorting by Price (Low-High) and (High-Low) orders products numerically

**File:** `tests/product-catalog/sorting.spec.ts`

**Steps:**
  1. Select 'Price (Low - High)' from the Sort dropdown.
    - expect: The list of visible prices (data-test=product-price), parsed as numbers, is non-decreasing across the page
  2. Select 'Price (High - Low)' from the Sort dropdown.
    - expect: The list of visible prices is non-increasing across the page
    - expect: The first product shown now has the highest price among visible items, opposite of the Low-High case

#### 3.3. Sorting by CO2 Rating orders products by environmental impact

**File:** `tests/product-catalog/sorting.spec.ts`

**Steps:**
  1. Select 'CO₂ Rating (A - E)' from the Sort dropdown.
    - expect: No errors occur and the grid re-renders
    - expect: The order of products changes relative to the default/name sort (spot-check that the highlighted/active CO2 letter per card is non-decreasing in the A→E sense across the page, where feasible to detect from the UI)
  2. Select 'CO₂ Rating (E - A)' from the Sort dropdown.
    - expect: The order reverses relative to the A-E sort

#### 3.4. Selected sort order persists across pagination and filter changes

**File:** `tests/product-catalog/sorting.spec.ts`

**Steps:**
  1. Select 'Price (Low - High)' from the Sort dropdown, then navigate to page 2 via pagination.
    - expect: Page 2's prices continue the ascending order from page 1 (i.e. every price on page 2 is >= the last price on page 1)
  2. With the same sort still selected, check one brand filter checkbox.
    - expect: The filtered grid remains sorted by price ascending

### 4. Price Range Filter

**Seed:** `tests/seed.spec.ts`

#### 4.1. Default price range includes the full product catalog

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. On a fresh homepage load, read the min and max labels of the Price Range slider (the two boundary labels, e.g. showing the overall floor/ceiling) and the two current-selection labels.
    - expect: The current-selection min equals (or is very close to) the overall floor and the current-selection max equals (or is very close to) the overall ceiling, i.e. by default no products are excluded by price
  2. Compare the total pagination page count at default range against the count captured in the grid-browsing smoke test.
    - expect: The counts match, confirming the default range excludes nothing

#### 4.2. Raising the minimum price handle excludes cheaper products

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. Focus the minimum price slider handle (keyboard: Tab/click to focus) and use the End key (or drag) to move it substantially higher, noting the new min value shown in the slider's label.
    - expect: The label reflecting the current minimum updates to the new value
  2. Inspect every visible product price in the grid after the change.
    - expect: Every visible price is greater than or equal to the new minimum value
    - expect: The total result/page count is less than or equal to the unfiltered count

#### 4.3. Lowering the maximum price handle excludes more expensive products

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. Reset the price range to default (reload the page), then focus the maximum price slider handle and use the Home key (or drag) to move it substantially lower, noting the new max value shown.
    - expect: The label reflecting the current maximum updates to the new value
  2. Inspect every visible product price in the grid after the change.
    - expect: Every visible price is less than or equal to the new maximum value

#### 4.4. Narrowing both handles to a tight band filters to only matching-price products

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. Move the minimum handle up and the maximum handle down so they form a narrow band somewhere in the middle of the overall range.
    - expect: Both current-selection labels reflect the narrowed band
  2. Inspect all visible product prices across any resulting pages.
    - expect: Every price falls within the narrowed [min, max] band, inclusive
    - expect: If no products fall within the band, the 'no products found' empty state (or equivalent) is shown instead of stale results

#### 4.5. The minimum handle cannot be dragged past the maximum handle

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. Reset to default range, then attempt to drag/move the minimum handle far beyond the current maximum handle's position.
    - expect: The minimum value never exceeds the maximum value: either the minimum stops at the maximum's position, or the maximum is pushed upward to remain >= the minimum, but the two values never invert (min > max is never observed)

#### 4.6. Price range filter combines with category/brand filters and search

**File:** `tests/product-catalog/price-range.spec.ts`

**Steps:**
  1. Apply a narrowed price band, then additionally check one category checkbox.
    - expect: The resulting grid satisfies BOTH constraints: every product belongs to the selected category AND every visible price is within the selected band

### 5. Category & Brand Filters

**Seed:** `tests/seed.spec.ts`

#### 5.1. Selecting a single subcategory filters the grid to that subcategory only

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. On the homepage sidebar, expand/locate the 'By category:' tree and check one leaf subcategory checkbox (e.g. a child under 'Hand Tools').
    - expect: The checkbox becomes checked
    - expect: The grid updates immediately (no separate 'Apply' action needed) to a subset of products
    - expect: The resulting page/result count is less than or equal to the unfiltered total
  2. Uncheck the same subcategory checkbox.
    - expect: The grid returns to showing the full, unfiltered catalog (same count as before the filter was applied)

#### 5.2. Checking a parent category auto-selects all of its subcategories

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. Check a top-level parent category checkbox (e.g. 'Hand Tools').
    - expect: All of its nested subcategory checkboxes become checked automatically
    - expect: The grid filters to the union of products across all of those subcategories
  2. Uncheck exactly one of the now-checked subcategory checkboxes, leaving the rest checked.
    - expect: The grid immediately excludes products that belong ONLY to the unchecked subcategory
    - expect: Products belonging to the remaining checked subcategories are still shown
  3. Uncheck the parent category checkbox.
    - expect: All of its subcategory checkboxes become unchecked
    - expect: The grid returns to the full, unfiltered catalog

#### 5.3. Selecting multiple categories across different parents combines results (OR logic)

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. Check one subcategory under 'Hand Tools' and, separately, one subcategory under 'Power Tools'.
    - expect: The grid shows products from BOTH selected subcategories combined
    - expect: The total result count is greater than or equal to selecting either subcategory alone

#### 5.4. Selecting a brand filters the grid to that brand's products

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. On a fresh, unfiltered homepage, check one brand checkbox under 'By brand:'.
    - expect: The grid narrows to a subset of products
    - expect: The resulting page/result count is less than or equal to the unfiltered total
  2. Additionally check a second brand checkbox (if more than one brand exists).
    - expect: The grid expands to include products from both selected brands (OR logic), with a count greater than or equal to a single-brand selection
  3. Uncheck both brand checkboxes.
    - expect: The grid returns to the full, unfiltered catalog

#### 5.5. Combining a category filter and a brand filter narrows results with AND logic

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. Check one category checkbox, note the resulting count, then additionally check one brand checkbox.
    - expect: The resulting count after both filters are applied is less than or equal to the category-only count (i.e. the brand filter narrows further rather than replacing the category filter)
  2. Uncheck the category filter, leaving only the brand filter active.
    - expect: The grid now shows all products of that brand regardless of category

#### 5.6. The eco-friendly checkbox filters to only eco-labeled products

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. On a fresh, unfiltered homepage, check 'Show only eco-friendly products' (data-test=eco-friendly-filter).
    - expect: The grid narrows
    - expect: Every visible product card in the filtered grid displays an 'ECO' badge
  2. Uncheck the eco-friendly checkbox.
    - expect: The grid returns to the full, unfiltered catalog, including non-eco products

#### 5.7. A filter combination with zero matches shows the empty state, not stale cards

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. Select an implausible combination likely to yield no results, e.g. a narrow price band combined with a specific category and a specific brand that don't overlap (determine an actual non-overlapping combination by first checking category/brand alone and comparing price ranges observed).
    - expect: The grid shows an explicit 'no products found' empty state
    - expect: No leftover product cards from a previous filter state remain visible
    - expect: No pagination controls are shown

#### 5.8. Applying a filter while viewing page 2+ resets pagination to page 1

**File:** `tests/product-catalog/category-brand-filters.spec.ts`

**Steps:**
  1. On the unfiltered homepage, navigate to page 2 (requires at least 2 pages of results).
    - expect: Page 2's product set is displayed
  2. While still on page 2, check a brand (or category) checkbox to apply a new filter.
    - expect: The view resets to page 1 of the newly filtered result set
    - expect: The Previous pagination control becomes disabled again (consistent with being on page 1)
