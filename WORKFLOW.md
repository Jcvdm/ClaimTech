# Claimtech Workflow Guide

This document explains the complete workflow for processing vehicle damage claims and assessments in Claimtech.

---

## 📊 **Workflow Overview**

Claimtech uses a **phase-based workflow** where each work item moves through distinct phases. Items move forward through the workflow as actions are completed.

```
┌─────────────┐
│  REQUESTS   │  New inspection requests
└──────┬──────┘
       │ [Accept Request]
       ↓
┌─────────────┐
│ INSPECTIONS │  Accepted requests awaiting engineer appointment
└──────┬──────┘
       │ [Appoint Engineer + Schedule Appointment]
       ↓
┌─────────────┐
│APPOINTMENTS │  Scheduled appointments awaiting assessment
└──────┬──────┘
       │ [Start Assessment]
       ↓
┌─────────────┐
│ASSESSMENTS  │  Active vehicle assessments in progress
│(in_progress)│  Status: 'in_progress'
└──────┬──────┘
       │ [Complete All Tabs + Finalize Estimate]
       ↓
┌─────────────┐
│ FINALIZED   │  Estimates finalized and sent to client
│ ASSESSMENTS │  Status: 'submitted'
│(submitted)  │  Can add Additionals and start FRC
└──────┬──────┘
       │ [Complete FRC + Sign Off]
       ↓
┌─────────────┐
│   ARCHIVE   │  Completed work with FRC signed off
│ (archived)  │  Status: 'archived'
└─────────────┘
```

---

## 🎯 **Assessment Status Flow**

Understanding how assessment statuses work:

| **Status** | **Meaning** | **Where It Shows** | **Next Step** |
|-----------|-------------|-------------------|---------------|
| `in_progress` | Assessment is being worked on | Open Assessments | Complete all tabs + Finalize Estimate |
| `submitted` | Estimate finalized and sent to client | Finalized Assessments | Add Additionals / Start FRC |
| `archived` | FRC completed and signed off | Archive | View/Download Reports |

**Note:** The `completed` status is deprecated and should not be used. Assessments go directly from `in_progress` to `submitted` when the estimate is finalized.

### **Key Workflow Points:**

1. **Starting Assessment:** When you click "Start Assessment" on an appointment, the assessment is created with status `in_progress` and appears in Open Assessments.

2. **Completing Estimate:** When you complete the estimate tab, you're redirected to the Finalize tab. The assessment remains `in_progress` until you finalize.

3. **Finalizing Estimate:** When you finalize the estimate, the status changes to `submitted` and the assessment moves to Finalized Assessments list.

4. **Adding Additionals:** Finalized assessments (`submitted` status) can have additional line items added via the Additionals tab.

5. **Starting FRC:** Finalized assessments can have FRC started, which creates an FRC record and shows in the FRC list.

6. **Completing FRC:** When FRC is completed and signed off, the assessment status automatically changes to `archived` and moves to the Archive.

---

## 🔄 **Phase 1: Requests**

**Location:** `/requests`  
**Sidebar:** Requests → All Requests

### **What Appears Here:**
- New inspection requests submitted by clients
- Requests in draft, submitted, or early stages
- Requests not yet accepted for inspection

### **Status Indicators:**
- 📝 **New Request** (gray) - Just submitted
- 🔍 **In Assessment** (blue) - Currently being assessed
- 💰 **Awaiting Quote** (purple) - Waiting for estimate
- ✅ **Awaiting Approval** (green) - Pending final approval

### **Actions Available:**
- **View Details** - Click any request to see full information
- **Accept Request** - Creates inspection and moves to Inspections phase
- **Edit Request** - Modify request details
- **Cancel Request** - Mark as cancelled

### **What Happens When You Accept:**
1. Inspection record is created (INS-YYYY-NNN)
2. Request status changes to `in_progress`
3. Request current_step changes to `assessment`
4. Request **stays in Requests list** (to track overall progress)
5. New inspection appears in **Inspections list**

---

## 🔍 **Phase 2: Inspections**

**Location:** `/work/inspections`  
**Sidebar:** Work → Inspections (with badge showing count)

### **What Appears Here:**
- Accepted requests that need engineer appointment
- Inspections with status: `pending` or `scheduled`
- **Only inspections WITHOUT appointments** (once appointment is created, inspection disappears from this list)

### **Status Indicators:**
- **Pending** (yellow) - Awaiting engineer appointment
- **Scheduled** (blue) - Engineer appointed, awaiting appointment scheduling

### **Actions Available:**
- **View Details** - Click inspection to see full information
- **Appoint Engineer** - Assign engineer (filters by province)
- **Schedule Appointment** - Create appointment for assessment
- **Cancel Inspection** - Reverts request back to submitted status

### **What Happens When You Schedule Appointment:**
1. Appointment record is created (APT-YYYY-NNN)
2. Inspection status changes to `scheduled`
3. Inspection **disappears from Inspections list**
4. New appointment appears in **Appointments list**

---

## 📅 **Phase 3: Appointments**

**Location:** `/work/appointments`
**Sidebar:** Work → Appointments

### **What Appears Here:**
- All appointments (scheduled, in progress, completed, cancelled)
- Filter tabs available: All, Scheduled, Confirmed, In Progress, Completed, Cancelled
- Type filters: All, In-Person, Digital

### **Status Indicators:**
- **Scheduled** (blue) - Ready to start assessment
- **Confirmed** (green) - Appointment confirmed
- **In Progress** (yellow) - Assessment in progress
- **Completed** (gray) - Assessment completed
- **Cancelled** (red) - Appointment cancelled
- **Rescheduled** (purple) - Appointment rescheduled

### **Actions Available:**
- **View Details** - Click appointment to see full information
- **Start Assessment** - Begin vehicle assessment
- **Reschedule** - Change appointment date/time
- **Cancel Appointment** - Cancel and revert to inspection

### **What Happens When You Start Assessment:**
1. Assessment record is created (ASM-YYYY-NNN)
2. Appointment status changes to `in_progress`
3. Appointment **remains visible** in Appointments list (filter to "In Progress")
4. New assessment appears in **Open Assessments list**
5. User is navigated to assessment page

---

## 📋 **Phase 4: Open Assessments**

**Location:** `/work/assessments`  
**Sidebar:** Work → Open Assessments (with badge showing count)

### **What Appears Here:**
- Active assessments currently in progress
- **Only assessments with status: `in_progress`**
- Assessments that haven't been completed yet

### **Information Displayed:**
- **Assessment #** - Unique assessment number
- **Request #** - Original request number
- **Vehicle** - Make, model, year
- **Registration** - Vehicle registration number
- **Engineer** - Assigned engineer name
- **Progress** - Completion percentage with colored badge:
  - 0-30%: Gray
  - 30-60%: Yellow
  - 60-100%: Blue
  - 100%: Green
- **Last Updated** - Most recent activity timestamp

### **Actions Available:**
- **Continue Assessment** - Click to resume assessment work
- Assessment includes 5 tabs:
  1. **Vehicle ID** - Registration, VIN, engine number, photos
  2. **360° Exterior** - 12 exterior photos, overall condition
  3. **Interior & Mechanical** - Interior photos, systems check
  4. **Tyres** - 5 tyre positions with 3 photos each
  5. **Damage ID** - Damage records with photos

### **Auto-Save Features:**
- Saves every 30 seconds automatically
- Saves when switching tabs
- Shows "Last saved" timestamp
- Global notes system visible on all tabs

### **What Happens When You Complete Assessment:**
1. Assessment status changes to `completed`
2. Assessment **disappears from Open Assessments list**
3. Request moves to next phase (Quote)
4. Ready for estimate/quote generation

---

## 💰 **Phase 5: Finalized Assessments**

**Location:** `/work/finalized-assessments`
**Sidebar:** Work → Finalized Assessments (with badge showing count)

### **What Appears Here:**
- Assessments where estimates have been finalized and sent to clients
- Assessments ready for additionals or FRC

### **Actions Available:**
- View assessment details
- Add additional line items (Additionals tab)
- Start FRC process (FRC tab)

---

## ➕ **Phase 6: Additionals**

**Location:** `/work/additionals`
**Sidebar:** Work → Additionals (with badge showing pending count)

### **What Appears Here:**
- All assessments with additional line items
- Filter tabs: All, Pending Items, Approved Items, Declined Items

### **Information Displayed:**
- Assessment and Request numbers
- Client name and vehicle details
- Pending, Approved, and Declined item counts
- Total approved amount

### **Actions Available:**
- Click to open assessment with Additionals tab active
- Review and approve/decline pending items
- Add new additional line items

---

## 💼 **Phase 7: Final Repair Costing (FRC)**

**Location:** `/work/frc`
**Sidebar:** Work → FRC (with badge showing in-progress count)

### **What Appears Here:**
- All FRC records (assessments with FRC started)
- Filter tabs: All, Not Started, In Progress, Completed

### **Information Displayed:**
- Assessment and Request numbers
- Client name and vehicle details
- FRC status
- Line item count
- Started and completed dates

### **Actions Available:**
- Click to open assessment with FRC tab active
- Review quoted vs actual costs
- Agree or adjust line items
- Upload invoices and documents
- Mark FRC as completed

---

## 📦 **Archive**

**Location:** `/work/archive`
**Sidebar:** Work → Archive

### **What Appears Here:**
- All completed requests, inspections, assessments, and FRC records
- Unified search across all completed work

### **Filter Options:**
- **Type Tabs:** All, Requests, Inspections, Assessments, FRC
- **Search:** By number, client, vehicle, or registration

### **Information Displayed:**
- Type badge (color-coded)
- Number (clickable to view details)
- Client name and type
- Vehicle and registration
- Status and completion date

### **Actions Available:**
- Search for past work
- View completed item details
- Download reports (if generated)

---

## 🎯 **Key Benefits of Phase-Based Workflow**

### **1. Clear Separation**
- Items move through distinct phases
- Filter tabs show all statuses within each phase
- Easy to see what needs action

### **2. Focused Work Lists**
- **Inspections** - Items needing engineer appointment
- **Appointments** - All appointments with status filters
- **Assessments** - Active assessments in progress
- **Finalized Assessments** - Completed assessments ready for additionals/FRC
- **Additionals** - Additional line items requiring approval
- **FRC** - Final repair costing in progress
- **Archive** - All completed work searchable in one place

### **3. Visual Progress Tracking**
- Sidebar badges show counts of pending/active items
- Color-coded status indicators
- Progress percentages for assessments
- Phase icons in requests list

### **4. Logical Flow**
- Natural progression through phases
- Clear handoff points between phases
- Automatic transitions when actions are taken

---

## 📝 **Quick Reference: Where Is My Work?**

| **If you want to...** | **Go to...** |
|----------------------|-------------|
| Accept new requests | Requests → All Requests |
| Appoint engineers | Work → Inspections |
| Schedule appointments | Work → Inspections (after appointing engineer) |
| Start assessments | Work → Appointments |
| Continue assessments | Work → Open Assessments |
| Finalize assessments | Work → Open Assessments (complete all tabs) |
| Add additional items | Work → Additionals |
| Start FRC process | Work → FRC |
| Search past work | Work → Archive |

---

## 🔔 **Sidebar Badge Indicators**

- **Inspections Badge** - Count of inspections awaiting engineer appointment (status: pending)
- **Open Assessments Badge** - Count of assessments in progress (status: in_progress)
- **Finalized Assessments Badge** - Count of finalized assessments (status: submitted)
- **FRC Badge** - Count of FRC records in progress (status: in_progress)
- **Additionals Badge** - Count of assessments with pending additional items

---

## ⚠️ **Important Notes**

1. **Requests Stay Visible** - Requests remain in the Requests list throughout the entire workflow for tracking purposes. Use the "Current Phase" column to see where each request is in the process.

2. **One-Way Flow** - Items generally move forward through phases. To move backward (e.g., cancel an inspection), use the Cancel button which will revert the item to the previous phase.

3. **Auto-Save** - Assessments auto-save every 30 seconds. You don't need to manually save your work.

4. **Engineer Filtering** - When appointing engineers, the system automatically filters by province to show only relevant engineers.

5. **Audit Trail** - All status changes are logged in the activity timeline for each request/inspection/appointment.

---

## 🚀 **Getting Started - Complete Workflow**

1. **New Request Arrives** → Go to Requests
2. **Accept Request** → Creates inspection in Inspections list
3. **Appoint Engineer** → Inspection moves to scheduled status
4. **Schedule Appointment** → Creates appointment in Appointments list
5. **Start Assessment** → Opens assessment page, appears in Open Assessments (status: in_progress)
6. **Complete All Tabs + Finalize Estimate** → Moves to Finalized Assessments (status: submitted)
7. **Add Additionals (if needed)** → Appears in Additionals list
8. **Start FRC** → Appears in FRC list
9. **Complete FRC + Sign Off** → Assessment status changes to 'archived', moves to Archive
10. **Search Past Work** → Use Archive page

---

**Last Updated:** 2025-01-15

