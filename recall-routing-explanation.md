# How Recall Routing Works: A Simple Explanation

## Overview
When a user enters a recall date, the system needs to decide which path to take them down. Think of it like a smart traffic controller that looks at various factors and decides which route is best.

## The Four Possible Routes

### 🟢 NORMAL Route
**What it means:** Everything looks good - proceed with standard recall process
**User sees:** Standard recall journey continues smoothly

### 🟡 MANUAL_REVIEW_REQUIRED Route  
**What it means:** There are complications that need human review
**User sees:** "Manual case selection required" - they need to make additional choices

### 🔴 NO_SENTENCES_FOR_RECALL Route
**What it means:** No valid sentences found for recall
**User sees:** Error message - cannot proceed with recall

### 🟠 CONFLICTING_ADJUSTMENTS Route
**What it means:** The recall date conflicts with existing adjustments
**User sees:** Error about overlapping dates - must choose different date

---

## How the Decision is Made

### Step 1: Gather Information (API Calls)
The system collects data from multiple sources:

1. **Court Cases & Sentences** (from RaS API)
   - Gets all the prisoner's court cases and sentences
   - Finds which sentences are eligible for recall

2. **Release Date Calculations** (from CRDS API)
   - Calculates when the prisoner should be released
   - Validates if recall dates make sense

3. **Existing Adjustments** (from Adjustments API)
   - Checks for any existing UAL (Unlawfully at Large) periods
   - Ensures new recall doesn't overlap

4. **Current Recalls** (from RaS API)
   - Looks for any existing active recalls
   - Prevents overlapping recall periods

### Step 2: Apply Business Rules

The system then asks these questions in order:

#### ❓ Question 1: Are there any valid sentences?
- **If NO:** → Route to **NO_SENTENCES_FOR_RECALL**
- **If YES:** → Continue to next question

#### ❓ Question 2: Does the date conflict with anything?
- **Check against existing UAL adjustments**
- **Check against existing recalls**
- **If CONFLICTS FOUND:** → Route to **CONFLICTING_ADJUSTMENTS**
- **If NO CONFLICTS:** → Continue to next question

#### ❓ Question 3: Are all sentences "Standard" type?
- **Standard sentences (SDS):** Can be processed automatically
- **Non-standard sentences:** Need manual review
- **If ALL STANDARD:** → Route to **NORMAL**
- **If ANY NON-STANDARD:** → Route to **MANUAL_REVIEW_REQUIRED**

---

## Technical Details (For Developers)

### Key Files and Functions

**Main Controller:** `revocationDateController.ts:89` (successHandler method)
```
1. Gets court case data from session
2. Filters for sentenced, non-draft cases  
3. Summarizes sentence data
4. Checks for non-SDS sentences
5. Calculates invalid recall types
6. Sets routing decision in session
```

**Business Logic Files:**
- `RecallEligiblityCalculator.ts` - Determines valid recall types (14-day vs 28-day)
- `CaseSentenceSummariser.ts` - Processes court case data
- `recallOverlapValidation.ts` - Checks date conflicts
- `crdsValidationUtil.ts` - Handles CRDS validation responses

### API Call Sequence
```
1. RaS API → Get court cases and sentences
2. CRDS API → Get release date calculations  
3. Adjustments API → Get existing adjustments
4. RaS API → Get existing recalls
5. Local Processing → Apply business rules
6. Session Update → Store routing decision
```

### Decision Logic Code
```typescript
// Check for non-SDS sentences
const doesContainNonSDS = summarisedRasCases.some(group =>
  group.sentences.some(s => s.classification !== 'STANDARD')
);

// Set routing flag
if (doesContainNonSDS) {
  req.sessionModel.set('MANUAL_CASE_SELECTION', true);
} else if (getRecallRoute(req) === 'NORMAL') {
  req.sessionModel.set('MANUAL_CASE_SELECTION', false);
}
```

---

## Current Challenges

### For Users
- **Slow Response Times:** Multiple API calls create delays (250-700ms)
- **Complex Error Messages:** Technical validation errors are hard to understand
- **Inconsistent Behavior:** Different paths handle errors differently

### For Developers  
- **Scattered Logic:** Business rules spread across 8+ files
- **Hard to Debug:** Session state management is complex
- **Difficult to Test:** Multiple service dependencies make testing challenging
- **Maintenance Burden:** Changes require updates in multiple places

---

## Proposed Improvement

### New Simplified Approach
Instead of the frontend making multiple API calls and applying business logic:

1. **Single API Call:** Frontend sends recall date to new RaS endpoint
2. **Backend Processing:** RaS API handles all the complexity internally
3. **Simple Response:** Returns clear routing decision with details
4. **Faster Performance:** Reduced from 4-6 API calls to 1

### Benefits
- **🚀 Faster:** Response times improve by 40-60%
- **🔧 Easier to Maintain:** All logic in one place
- **🧪 Better Testing:** Single service to test
- **🔄 Reusable:** Other systems can use the same logic
- **📱 Simpler Frontend:** Less complex code to maintain

---

## Example User Journey

### Current Process (Complex)
```
User enters recall date → 
Multiple API calls (4-6) → 
Complex processing → 
Session updates → 
Routing decision → 
Next page
```

### Proposed Process (Simple)
```
User enters recall date → 
Single API call → 
Clear routing response → 
Next page
```

---

*This explanation covers the current recall routing mechanism and proposed improvements for better performance and maintainability.*