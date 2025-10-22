# How the Automatic Year Detection Works

## Before Refactoring
```
User Interface
├── Manual Year Selector (2025, 2026, 2027...)
├── Date Selector
└── Backend Request: /works?year=MANUALLY_SELECTED_YEAR
```

**Problem**: User had to remember to change year selector when browsing different dates

## After Refactoring
```
User Interface
├── Date Selector ONLY
└── Backend Request: /works?year=AUTOMATICALLY_EXTRACTED_FROM_DATE
```

**Solution**: Year is automatically extracted from the selected date

---

## Usage Examples

### Example 1: Maintenance Works Page
**User Action**: Select date December 25, 2025

**What Happens**:
1. Date formatted as: `2025-12-25`
2. Service extracts year: `2025`
3. Backend request: `GET /works?year=2025`
4. Data from `dataWorks_2025.json` is loaded

**User Action**: Change date to January 5, 2026

**What Happens**:
1. Date formatted as: `2026-01-05`
2. Service extracts year: `2026`
3. Backend request: `GET /works?year=2026`
4. Data from `dataWorks_2026.json` is loaded
5. **Seamless transition - no manual intervention needed!**

---

### Example 2: Summary Page - Single Year Range
**User Action**:
- Start Date: October 1, 2025
- End Date: December 31, 2025

**What Happens**:
1. Both dates in same year (2025)
2. Single backend request: `GET /works?year=2025`
3. Data from `dataWorks_2025.json` is loaded and filtered

---

### Example 3: Summary Page - Multi-Year Range
**User Action**:
- Start Date: October 1, 2025
- End Date: January 31, 2026

**What Happens**:
1. Date range spans multiple years (2025 → 2026)
2. First backend request: `GET /works?year=2025`
3. Second backend request: `GET /works?year=2026`
4. Data from both files merged:
   - `dataWorks_2025.json` (Oct-Dec 2025)
   - `dataWorks_2026.json` (Jan 2026)
5. Combined results displayed in UI
6. **Multi-year reporting works automatically!**

---

### Example 4: Auto-fill Historical Data
**User Action**: Enter work number "W-123" on date January 15, 2026

**What Happens**:
1. System searches for "W-123" across multiple years:
   - 2026 (current year from selected date)
   - 2025 (previous year)
   - 2024 (two years ago)
2. If found in any year, auto-fills the data
3. **Historical work data accessible even in new year!**

---

## Technical Implementation

### Service Layer (travauxService.ts)
```typescript
// Automatic year extraction
function extractYearFromDate(dateString: string): number {
  const year = new Date(dateString).getFullYear();
  return isNaN(year) ? new Date().getFullYear() : year;
}

// Functions now determine year automatically
export async function getWorksByDate(date: string): Promise<WorkItem[]> {
  const year = extractYearFromDate(date);  // Automatic!
  const allWorks = await getAllWorksByYear(year);
  return allWorks[date] || [];
}

// Multi-year support for date ranges
export async function getAllWorksByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Record<string, WorkItem[]>> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return getAllWorksByYear(startYear);  // Single year
  }

  return getAllWorksByYearRange(startYear, endYear);  // Multi-year
}
```

### Component Layer
```typescript
// Index.tsx - Maintenance Works Page
const loadWorkItems = async () => {
  const dateKey = format(selectedDate, 'yyyy-MM-dd');
  const works = await travauxService.getWorksByDate(dateKey);
  // Year automatically determined from dateKey!
};

// WorkSummary.tsx - Summary Page
const loadAllWorks = async () => {
  if (startDate && endDate) {
    // Automatically handles single or multi-year
    worksByDate = await travauxService.getAllWorksByDateRange(
      startDate,
      endDate
    );
  }
};
```

---

## Benefits

### For Users
✅ No manual year switching required
✅ Seamless browsing across different dates
✅ Multi-year reports work automatically
✅ Cleaner, more intuitive interface
✅ Historical data always accessible

### For Developers
✅ Reduced state management complexity
✅ Year logic centralized in service layer
✅ Easier to maintain and extend
✅ Better separation of concerns
✅ Automatic multi-year support

### For Business
✅ More professional user experience
✅ Fewer user errors
✅ More efficient workflow
✅ Cross-year reporting capability
✅ Future-proof architecture

---

## File Structure
```
src/
├── services/
│   └── travauxService.ts          (Year auto-detection logic)
├── pages/
│   ├── Index.tsx                  (Maintenance - no year selector)
│   ├── WorkSummary.tsx            (Summary - multi-year support)
│   └── Home.tsx                   (Dashboard - updated info)
└── ...

backend/
├── server.js                      (Unchanged - still uses ?year=YYYY)
├── dataWorks_2025.json           (2025 data)
├── dataWorks_2026.json           (2026 data)
├── dataWorks_2027.json           (2027 data)
└── ...
```

---

## Migration Notes

### What Changed
- ❌ Removed manual year selector from UI
- ❌ Removed `selectedYear` state variable
- ❌ Removed `?year=` from navigation URLs
- ✅ Added automatic year extraction
- ✅ Added multi-year date range support
- ✅ Added historical search across years

### What Stayed the Same
- ✅ Backend API endpoints unchanged
- ✅ Data file structure unchanged
- ✅ All existing functionality preserved
- ✅ No data migration required

### Backward Compatibility
The system remains fully compatible with the existing backend. The backend still accepts `?year=YYYY` parameter - the frontend just now determines it automatically.

---

## Testing Scenarios

### Scenario 1: Same Year Browsing
1. Open maintenance page
2. Select various dates in 2025
3. Verify correct data loads each time
4. ✅ Should work seamlessly

### Scenario 2: Year Transition
1. Open maintenance page
2. Select December 31, 2025
3. Change to January 1, 2026
4. Verify data switches to 2026 file
5. ✅ Should transition automatically

### Scenario 3: Multi-Year Summary
1. Open summary page
2. Set date range: Oct 1, 2025 → Jan 31, 2026
3. Verify data from both years appears
4. Export PDF and verify completeness
5. ✅ Should merge data correctly

### Scenario 4: Historical Auto-fill
1. Open maintenance page (e.g., Jan 2026)
2. Enter a work number from 2025
3. Verify auto-fill finds the data
4. ✅ Should search previous years
