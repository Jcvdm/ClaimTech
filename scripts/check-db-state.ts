import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://cfblmkzleqtvtfxujikf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmYmxta3psZXF0dnRmeHVqaWtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTQyNDY1NCwiZXhwIjoyMDc1MDAwNjU0fQ.kW5a16tOy8-Cn57iPPzvw24DIbnB4p87b6FDQ4C6T_k';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseState() {
  console.log('🔍 Checking database state for assessment-centric refactor...\n');

  // 1. Check requests without assessments
  console.log('1️⃣ Checking for requests without assessments...');
  
  const { data: allRequests } = await supabase
    .from('requests')
    .select('id, request_number, status, created_at')
    .order('created_at', { ascending: false });

  const { data: allAssessments } = await supabase
    .from('assessments')
    .select('id, assessment_number, request_id, stage, appointment_id, inspection_id, status');

  const requestIds = new Set(allRequests?.map(r => r.id) || []);
  const assessmentRequestIds = new Set(allAssessments?.map(a => a.request_id) || []);
  
  const orphanedRequests = allRequests?.filter(r => !assessmentRequestIds.has(r.id)) || [];
  
  console.log(`   Total requests: ${allRequests?.length || 0}`);
  console.log(`   Total assessments: ${allAssessments?.length || 0}`);
  console.log(`   ⚠️  Requests without assessments: ${orphanedRequests.length}`);
  
  if (orphanedRequests.length > 0) {
    console.log('   First 5 orphaned requests:');
    orphanedRequests.slice(0, 5).forEach(r => {
      console.log(`      - ${r.request_number} (${r.status}) - ${r.created_at}`);
    });
  }
  console.log('');

  // 2. Check assessments without appointment_id (should be ok - nullable now)
  console.log('2️⃣ Checking assessments without appointment_id...');
  const assessmentsWithoutAppointment = allAssessments?.filter(a => !a.appointment_id) || [];
  console.log(`   Assessments without appointment_id: ${assessmentsWithoutAppointment.length}`);
  if (assessmentsWithoutAppointment.length > 0) {
    console.log('   First 5:');
    assessmentsWithoutAppointment.slice(0, 5).forEach(a => {
      console.log(`      - ${a.assessment_number} (stage: ${a.stage || 'NULL'}, status: ${a.status})`);
    });
  }
  console.log('');

  // 3. Check if stage field exists and is populated
  console.log('3️⃣ Checking stage field population...');
  const assessmentsWithoutStage = allAssessments?.filter(a => !a.stage) || [];
  console.log(`   ⚠️  Assessments without stage: ${assessmentsWithoutStage.length}`);
  if (assessmentsWithoutStage.length > 0) {
    console.log('   First 5:');
    assessmentsWithoutStage.slice(0, 5).forEach(a => {
      console.log(`      - ${a.assessment_number} (status: ${a.status})`);
    });
  }
  
  // Stage distribution
  const stageDistribution: Record<string, number> = {};
  allAssessments?.forEach(a => {
    const stage = a.stage || 'NULL';
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
  });
  console.log('   Stage distribution:');
  Object.entries(stageDistribution).forEach(([stage, count]) => {
    console.log(`      - ${stage}: ${count}`);
  });
  console.log('');

  // 4. Check for duplicate request_id in assessments (violates unique constraint)
  console.log('4️⃣ Checking for duplicate request_id in assessments...');
  const requestIdCounts: Record<string, number> = {};
  allAssessments?.forEach(a => {
    if (a.request_id) {
      requestIdCounts[a.request_id] = (requestIdCounts[a.request_id] || 0) + 1;
    }
  });
  const duplicates = Object.entries(requestIdCounts).filter(([_, count]) => count > 1);
  console.log(`   ⚠️  Duplicate request_ids: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('   Duplicates:');
    duplicates.forEach(([requestId, count]) => {
      const assessments = allAssessments?.filter(a => a.request_id === requestId);
      console.log(`      - Request ${requestId}: ${count} assessments`);
      assessments?.forEach(a => {
        console.log(`         * ${a.assessment_number} (stage: ${a.stage}, status: ${a.status})`);
      });
    });
  }
  console.log('');

  // 5. Check child records that might cause issues
  console.log('5️⃣ Checking child records for potential duplicates...');
  
  // Check tyres
  const { data: tyres } = await supabase
    .from('assessment_tyres')
    .select('assessment_id, position');
  
  const tyresByAssessment: Record<string, number> = {};
  tyres?.forEach(t => {
    const key = `${t.assessment_id}-${t.position}`;
    tyresByAssessment[key] = (tyresByAssessment[key] || 0) + 1;
  });
  const duplicateTyres = Object.entries(tyresByAssessment).filter(([_, count]) => count > 1);
  console.log(`   ⚠️  Duplicate tyres (assessment_id + position): ${duplicateTyres.length}`);
  
  // Check damage records
  const { data: damage } = await supabase
    .from('assessment_damage')
    .select('assessment_id');
  
  const damageByAssessment: Record<string, number> = {};
  damage?.forEach(d => {
    damageByAssessment[d.assessment_id] = (damageByAssessment[d.assessment_id] || 0) + 1;
  });
  const duplicateDamage = Object.entries(damageByAssessment).filter(([_, count]) => count > 1);
  console.log(`   ⚠️  Duplicate damage records per assessment: ${duplicateDamage.length}`);
  
  // Check estimates
  const { data: estimates } = await supabase
    .from('assessment_estimates')
    .select('assessment_id');
  
  const estimatesByAssessment: Record<string, number> = {};
  estimates?.forEach(e => {
    estimatesByAssessment[e.assessment_id] = (estimatesByAssessment[e.assessment_id] || 0) + 1;
  });
  const duplicateEstimates = Object.entries(estimatesByAssessment).filter(([_, count]) => count > 1);
  console.log(`   ⚠️  Duplicate estimates per assessment: ${duplicateEstimates.length}`);
  
  // Check vehicle values
  const { data: vehicleValues } = await supabase
    .from('assessment_vehicle_values')
    .select('assessment_id');
  
  const vehicleValuesByAssessment: Record<string, number> = {};
  vehicleValues?.forEach(v => {
    vehicleValuesByAssessment[v.assessment_id] = (vehicleValuesByAssessment[v.assessment_id] || 0) + 1;
  });
  const duplicateVehicleValues = Object.entries(vehicleValuesByAssessment).filter(([_, count]) => count > 1);
  console.log(`   ⚠️  Duplicate vehicle values per assessment: ${duplicateVehicleValues.length}`);
  
  console.log('');

  // 6. Summary
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  
  const issues: string[] = [];
  
  if (orphanedRequests.length > 0) {
    issues.push(`❌ ${orphanedRequests.length} requests without assessments - WILL BREAK NEW MODEL`);
  }
  
  if (assessmentsWithoutStage.length > 0) {
    issues.push(`⚠️  ${assessmentsWithoutStage.length} assessments without stage field - migration may not have run`);
  }
  
  if (duplicates.length > 0) {
    issues.push(`❌ ${duplicates.length} duplicate request_ids in assessments - VIOLATES UNIQUE CONSTRAINT`);
  }
  
  if (duplicateTyres.length > 0) {
    issues.push(`⚠️  ${duplicateTyres.length} duplicate tyres - will cause issues with idempotent creation`);
  }
  
  if (duplicateDamage.length > 0) {
    issues.push(`⚠️  ${duplicateDamage.length} duplicate damage records - violates unique constraint`);
  }
  
  if (duplicateEstimates.length > 0) {
    issues.push(`⚠️  ${duplicateEstimates.length} duplicate estimates - violates unique constraint`);
  }
  
  if (duplicateVehicleValues.length > 0) {
    issues.push(`⚠️  ${duplicateVehicleValues.length} duplicate vehicle values - may cause issues`);
  }
  
  if (issues.length === 0) {
    console.log('✅ No critical issues found!');
    console.log(`✅ ${assessmentsWithoutAppointment.length} assessments without appointment_id (OK - nullable)`);
  } else {
    console.log('Issues found:');
    issues.forEach(issue => console.log(`   ${issue}`));
  }
  
  console.log('='.repeat(60));

  // 7. FRC & Additionals schema and sample checks
  console.log('\n🧩 FRC & Additionals Schema Checks');
  console.log('='.repeat(60));

  // Additionals
  const { data: additionalsSample, error: additionalsErr } = await supabase
    .from('assessment_additionals')
    .select('id, assessment_id, labour_rate, paint_rate, vat_percentage, oem_markup_percentage, alt_markup_percentage, second_hand_markup_percentage, outwork_markup_percentage, line_items, excluded_line_item_ids, subtotal_approved, vat_amount_approved, total_approved')
    .limit(1);

  if (additionalsErr) {
    console.log(`❌ assessment_additionals query error: ${additionalsErr.message}`);
  } else {
    const sample = additionalsSample?.[0];
    console.log(`✅ assessment_additionals reachable. Columns:`);
    console.log(`   - excluded_line_item_ids present: ${sample && Object.prototype.hasOwnProperty.call(sample, 'excluded_line_item_ids') ? 'YES' : 'NO'}`);
    console.log(`   - line_items type: ${Array.isArray(sample?.line_items) ? 'array' : typeof sample?.line_items}`);
    console.log(`   - subtotal_approved: ${sample?.subtotal_approved ?? 'N/A'} | total_approved: ${sample?.total_approved ?? 'N/A'}`);
  }

  // FRC
  const { data: frcSample, error: frcErr } = await supabase
    .from('assessment_frc')
    .select('id, assessment_id, status, line_items, vat_percentage, quoted_total, actual_total')
    .limit(1);

  if (frcErr) {
    console.log(`❌ assessment_frc query error: ${frcErr.message}`);
  } else {
    const sample = frcSample?.[0];
    console.log(`✅ assessment_frc reachable. Columns:`);
    console.log(`   - status: ${sample?.status ?? 'N/A'}`);
    console.log(`   - line_items type: ${Array.isArray(sample?.line_items) ? 'array' : typeof sample?.line_items}`);
    console.log(`   - quoted_total: ${sample?.quoted_total ?? 'N/A'} | actual_total: ${sample?.actual_total ?? 'N/A'}`);
  }

  console.log('='.repeat(60));
}

checkDatabaseState().catch(console.error);

