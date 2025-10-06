# Claimtech Workflow Guide

This document explains the complete workflow for processing vehicle damage claims and assessments in Claimtech.

---

## 📊 **Workflow Overview**

Claimtech uses a **phase-based workflow** where each work item moves through distinct phases. Each item appears in **only ONE list at a time**, making it easy to find and manage work.

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
│ ASSESSMENTS │  Active vehicle assessments in progress
└──────┬──────┘
       │ [Complete Assessment]
       ↓
┌─────────────┐
│    QUOTE    │  Awaiting quote/estimate
└─────────────┘
```

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
- Scheduled appointments awaiting assessment
- **Only appointments with status: `scheduled`**
- Appointments that haven't been started yet

### **Status Indicators:**
- **Scheduled** (blue) - Ready to start assessment

### **Actions Available:**
- **View Details** - Click appointment to see full information
- **Start Assessment** - Begin vehicle assessment
- **Reschedule** - Change appointment date/time
- **Cancel Appointment** - Cancel and revert to inspection

### **What Happens When You Start Assessment:**
1. Assessment record is created (ASM-YYYY-NNN)
2. Appointment status changes to `in_progress`
3. Appointment **disappears from Appointments list**
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

## 💰 **Phase 5: Quote/Approval**

**Location:** `/work/frc` (Final Report Costing)  
**Sidebar:** Work → FRC

### **What Appears Here:**
- Completed assessments awaiting quote
- Quotes awaiting client approval

### **Actions Available:**
- Generate quote/estimate
- Submit for approval
- Track approval status

---

## 🎯 **Key Benefits of Phase-Based Workflow**

### **1. Clear Separation**
- Each item appears in only ONE list at a time
- No confusion about where to find work
- Easy to see what needs action

### **2. Focused Work Lists**
- **Inspections** - Only shows items needing engineer appointment
- **Appointments** - Only shows scheduled appointments ready to start
- **Assessments** - Only shows active assessments in progress

### **3. Visual Progress Tracking**
- Sidebar badges show counts of pending items
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
| Generate quotes | Work → FRC |

---

## 🔔 **Sidebar Badge Indicators**

- **Inspections Badge** - Shows count of inspections awaiting engineer appointment (status: pending)
- **Open Assessments Badge** - Shows count of assessments in progress (status: in_progress)

---

## ⚠️ **Important Notes**

1. **Requests Stay Visible** - Requests remain in the Requests list throughout the entire workflow for tracking purposes. Use the "Current Phase" column to see where each request is in the process.

2. **One-Way Flow** - Items generally move forward through phases. To move backward (e.g., cancel an inspection), use the Cancel button which will revert the item to the previous phase.

3. **Auto-Save** - Assessments auto-save every 30 seconds. You don't need to manually save your work.

4. **Engineer Filtering** - When appointing engineers, the system automatically filters by province to show only relevant engineers.

5. **Audit Trail** - All status changes are logged in the activity timeline for each request/inspection/appointment.

---

## 🚀 **Getting Started**

1. **New Request Arrives** → Go to Requests
2. **Accept Request** → Creates inspection in Inspections list
3. **Appoint Engineer** → Inspection moves to scheduled status
4. **Schedule Appointment** → Creates appointment in Appointments list
5. **Start Assessment** → Opens assessment page, appears in Open Assessments
6. **Complete Assessment** → Ready for quote generation

---

**Last Updated:** 2025-01-15

