import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://cfblmkzleqtvtfxujikf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmxta3psZXF0dnRmeHVqaWtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyNDY1NCwiZXhwIjoyMDc1MDAwNjU0fQ.kW5a16tOy8-Cn57iPPzvw24DIbnB4p87b6FDQ4C6T_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEngineerAssignments() {
  const engineerEmail = 'vandermerwe.jaco194@gmail.com';

  console.log(`🔍 Investigating assignments for: ${engineerEmail}\n`);

  // 1. Find engineer record
  console.log('1️⃣ Looking up engineer record...');
  const { data: engineer, error: engineerError } = await supabase
    .from('engineers')
    .select('*')
    .eq('email', engineerEmail)
    .single();

  if (engineerError || !engineer) {
    console.log(`   ❌ Engineer not found: ${engineerError?.message}`);
    return;
  }

  console.log(`   ✅ Found engineer: ${engineer.name} (ID: ${engineer.id})`);
  console.log(`   Auth User ID: ${engineer.auth_user_id}`);
  console.log('');

  // 2. Check appointments assigned to this engineer
  console.log('2️⃣ Checking appointments assigned to this engineer...');
  const { data: appointments, error: apptError } = await supabase
    .from('appointments')
    .select('*')
    .eq('engineer_id', engineer.id)
    .order('created_at', { ascending: false });

  console.log(`   Total appointments: ${appointments?.length || 0}`);
  if (appointments && appointments.length > 0) {
    appointments.forEach(appt => {
      console.log(`      - ${appt.appointment_number} (Status: ${appt.status}, Inspection: ${appt.inspection_id})`);
    });
  }
  console.log('');

  // 3. Check inspections assigned to this engineer
  console.log('3️⃣ Checking inspections assigned to this engineer...');
  const { data: inspections, error: inspError } = await supabase
    .from('inspections')
    .select('*')
    .eq('assigned_engineer_id', engineer.id)
    .order('created_at', { ascending: false });

  console.log(`   Total inspections: ${inspections?.length || 0}`);
  if (inspections && inspections.length > 0) {
    inspections.forEach(insp => {
      console.log(`      - ${insp.inspection_number} (Status: ${insp.status}, Request: ${insp.request_id})`);
    });
  }
  console.log('');

  // 4. Check assessments linked to appointments
  console.log('4️⃣ Checking assessments linked to appointments...');
  const appointmentIds = appointments?.map(a => a.id) || [];

  if (appointmentIds.length > 0) {
    const { data: assessmentsByAppointment, error: asmError } = await supabase
      .from('assessments')
      .select('*')
      .in('appointment_id', appointmentIds)
      .order('created_at', { ascending: false });

    console.log(`   Assessments with appointment_id in (${appointmentIds.join(', ')}): ${assessmentsByAppointment?.length || 0}`);
    if (assessmentsByAppointment && assessmentsByAppointment.length > 0) {
      assessmentsByAppointment.forEach(asm => {
        console.log(`      - ${asm.assessment_number} (Stage: ${asm.stage}, Status: ${asm.status}, Appointment: ${asm.appointment_id})`);
      });
    }
  } else {
    console.log('   No appointments to check');
  }
  console.log('');

  // 5. Check requests assigned to this engineer
  console.log('5️⃣ Checking requests assigned to this engineer...');
  const { data: requests, error: reqError } = await supabase
    .from('requests')
    .select('*')
    .eq('assigned_engineer_id', engineer.id)
    .order('created_at', { ascending: false });

  console.log(`   Total requests: ${requests?.length || 0}`);
  if (requests && requests.length > 0) {
    requests.forEach(req => {
      console.log(`      - ${req.request_number} (Status: ${req.status})`);
    });
  }
  console.log('');

  // 6. Check assessments by stage that should show in sidebar
  console.log('6️⃣ Checking sidebar badge counts...');

  // Inspection badge (stage=inspection_scheduled)
  console.log('   🔍 Inspection Badge (stage=inspection_scheduled):');
  const { count: inspectionCount, error: inspCountError } = await supabase
    .from('assessments')
    .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
    .eq('stage', 'inspection_scheduled')
    .eq('appointments.engineer_id', engineer.id);
  console.log(`      Count: ${inspectionCount || 0}`);
  if (inspCountError) {
    console.log(`      Error: ${inspCountError.message}`);
  }

  // Appointment badge (stage=appointment_scheduled)
  console.log('   📅 Appointment Badge (stage=appointment_scheduled):');
  const { count: appointmentCount, error: apptCountError } = await supabase
    .from('assessments')
    .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
    .eq('stage', 'appointment_scheduled')
    .eq('appointments.engineer_id', engineer.id);
  console.log(`      Count: ${appointmentCount || 0}`);
  if (apptCountError) {
    console.log(`      Error: ${apptCountError.message}`);
  }

  // Assessment badge (stage in assessment_in_progress, estimate_review, estimate_sent)
  console.log('   📋 Assessment Badge (stage in assessment_in_progress, estimate_review, estimate_sent):');
  const { count: assessmentCount, error: asmCountError } = await supabase
    .from('assessments')
    .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
    .in('stage', ['assessment_in_progress', 'estimate_review', 'estimate_sent'])
    .eq('appointments.engineer_id', engineer.id);
  console.log(`      Count: ${assessmentCount || 0}`);
  if (asmCountError) {
    console.log(`      Error: ${asmCountError.message}`);
  }

  // Finalized badge (stage=estimate_finalized)
  console.log('   ✅ Finalized Badge (stage=estimate_finalized):');
  const { count: finalizedCount, error: finCountError } = await supabase
    .from('assessments')
    .select('*, appointments!inner(engineer_id)', { count: 'exact', head: true })
    .eq('stage', 'estimate_finalized')
    .eq('appointments.engineer_id', engineer.id);
  console.log(`      Count: ${finalizedCount || 0}`);
  if (finCountError) {
    console.log(`      Error: ${finCountError.message}`);
  }
  console.log('');

  // 7. Deep dive into the specific assessment INS-2025-013 / ASM-2025-016
  console.log('7️⃣ Deep dive into INS-2025-013 / ASM-2025-016...');
  const { data: specificInspection } = await supabase
    .from('inspections')
    .select('*')
    .eq('inspection_number', 'INS-2025-013')
    .single();

  if (specificInspection) {
    console.log(`   Inspection INS-2025-013:`);
    console.log(`      - ID: ${specificInspection.id}`);
    console.log(`      - Status: ${specificInspection.status}`);
    console.log(`      - Assigned Engineer ID: ${specificInspection.assigned_engineer_id}`);
    console.log(`      - Request ID: ${specificInspection.request_id}`);

    // Check for assessment
    const { data: specificAssessments } = await supabase
      .from('assessments')
      .select('*')
      .eq('assessment_number', 'ASM-2025-016')
      .order('created_at', { ascending: false });

    if (specificAssessments && specificAssessments.length > 0) {
      console.log(`   Assessment ASM-2025-016 (${specificAssessments.length} found):`);
      specificAssessments.forEach(asm => {
        console.log(`      - ID: ${asm.id}`);
        console.log(`      - Stage: ${asm.stage}`);
        console.log(`      - Status: ${asm.status}`);
        console.log(`      - Appointment ID: ${asm.appointment_id}`);
        console.log(`      - Inspection ID: ${asm.inspection_id}`);
        console.log(`      - Request ID: ${asm.request_id}`);
      });

      // Check if appointment exists for this assessment
      const assessmentWithAppointment = specificAssessments.find(a => a.appointment_id);
      if (assessmentWithAppointment) {
        const { data: linkedAppointment } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', assessmentWithAppointment.appointment_id)
          .single();

        if (linkedAppointment) {
          console.log(`   Linked Appointment:`);
          console.log(`      - ID: ${linkedAppointment.id}`);
          console.log(`      - Number: ${linkedAppointment.appointment_number}`);
          console.log(`      - Engineer ID: ${linkedAppointment.engineer_id}`);
          console.log(`      - Status: ${linkedAppointment.status}`);
          console.log(`      - Matches our engineer? ${linkedAppointment.engineer_id === engineer.id ? '✅ YES' : '❌ NO'}`);
        }
      }
    } else {
      console.log(`   ❌ Assessment ASM-2025-016 not found`);
    }
  }
  console.log('');

  // 8. Summary
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Engineer: ${engineer.name} (${engineer.email})`);
  console.log(`Engineer ID: ${engineer.id}`);
  console.log(`Appointments: ${appointments?.length || 0}`);
  console.log(`Inspections: ${inspections?.length || 0}`);
  console.log(`Requests: ${requests?.length || 0}`);
  console.log('');
  console.log('Sidebar Badge Counts:');
  console.log(`   Inspections (stage=inspection_scheduled): ${inspectionCount || 0}`);
  console.log(`   Appointments (stage=appointment_scheduled): ${appointmentCount || 0}`);
  console.log(`   Assessments (stage in assessment_in_progress/estimate_review/estimate_sent): ${assessmentCount || 0}`);
  console.log(`   Finalized (stage=estimate_finalized): ${finalizedCount || 0}`);
  console.log('='.repeat(80));
}

checkEngineerAssignments().catch(console.error);
