import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generatePDF } from '$lib/utils/pdf-generator';
import { generateAdditionalsLetterHTML } from '$lib/templates/additionals-letter-template';
import { createStreamingResponse } from '$lib/utils/streaming-response';
import { getClientByRequestId, getRepairerForEstimate } from '$lib/utils/supabase-query-helpers';
import type { Assessment } from '$lib/types/assessment';
import { normalizeEstimate, normalizeCompanySettings } from '$lib/utils/type-normalizers';
import { getBrandLogoBase64 } from '$lib/utils/branding';

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = await request.json();
  const assessmentId = body.assessmentId;
  const requestId = Math.random().toString(36).substring(7);

  if (!assessmentId) {
    throw error(400, 'Assessment ID is required');
  }

  return createStreamingResponse(async function* () {
    try {
      yield { status: 'processing', progress: 5, message: 'Fetching assessment data...' };

      const { data: assessment, error: assessmentError } = await locals.supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError || !assessment) {
        yield { status: 'error', progress: 0, error: 'Assessment not found' };
        return;
      }

      yield { status: 'processing', progress: 15, message: 'Loading Additionals...' };

      const [
        { data: additionals },
        { data: companySettings },
        { data: requestData },
        { data: estimate },
        { data: vehicleIdentification },
        { data: appointment },
        { data: allNotes }
      ] = await Promise.all([
        locals.supabase.from('assessment_additionals').select('*').eq('assessment_id', assessmentId).single(),
        locals.supabase.from('company_settings').select('*').single(),
        locals.supabase.from('requests').select('*').eq('id', assessment.request_id).single(),
        locals.supabase.from('assessment_estimates').select('*').eq('assessment_id', assessmentId).single(),
        locals.supabase.from('assessment_vehicle_identification').select('*').eq('assessment_id', assessmentId).single(),
        assessment.appointment_id
          ? locals.supabase.from('appointments').select('*').eq('id', assessment.appointment_id).single()
          : Promise.resolve({ data: null, error: null }),
        locals.supabase.from('assessment_notes').select('*').eq('assessment_id', assessmentId).order('created_at', { ascending: true })
      ]);

      // Filter for additionals-specific notes only
      const additionalsNotes = (allNotes || []).filter(
        (note: any) => note.source_tab === 'additionals'
      );

      yield { status: 'processing', progress: 35, message: 'Loading repairer...' };

      // Fetch engineer/assessor info if appointment exists
      let engineer = null;
      if (appointment?.engineer_id) {
        const { data: engineerData } = await locals.supabase
          .from('engineers')
          .select('id, name, email, phone, company_name, specialization')
          .eq('id', appointment.engineer_id)
          .single();
        engineer = engineerData;
      }

      // Fetch client and repairer sequentially
      const { data: client } = await getClientByRequestId(
        assessment.request_id,
        locals.supabase
      );

      const normalizedEstimate = normalizeEstimate(estimate);
      const normalizedCompanySettings = normalizeCompanySettings(companySettings);

      const { data: repairer } = await getRepairerForEstimate(
        normalizedEstimate,
        locals.supabase
      );

      yield { status: 'processing', progress: 45, message: 'Generating HTML template...' };

      // Terms resolution: client override → company settings → empty
      const terms = (client as any)?.additionals_terms_and_conditions || normalizedCompanySettings?.additionals_terms_and_conditions || null;

      const html = generateAdditionalsLetterHTML({
        assessment: (assessment || {}) as any,
        additionals: (additionals || {}) as any,
        vehicleIdentification: (vehicleIdentification || {}) as any,
        companySettings: normalizedCompanySettings ? { ...normalizedCompanySettings, additionals_terms_and_conditions: terms } as any : normalizedCompanySettings,
        request: (requestData || {}) as any,
        client: (client || {}) as any,
        repairer: (repairer || {}) as any,
        engineer: (engineer || {}) as any,
        logoBase64: getBrandLogoBase64(),
        additionalsNotes: additionalsNotes
      });

      yield { status: 'processing', progress: 60, message: 'Rendering PDF...' };

      let pdfBuffer: Buffer;
      const pdfPromise = generatePDF(html, { format: 'A4', margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' } });
      let currentProgress = 62;
      const startTime = Date.now();
      while (true) {
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await Promise.race([pdfPromise, timeoutPromise]);
        if (result instanceof Buffer) { pdfBuffer = result; break; }
        currentProgress = Math.min(currentProgress + 2, 80);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        yield { status: 'processing', progress: currentProgress, message: `Rendering PDF... (${elapsed}s)` };
      }

      yield { status: 'processing', progress: 85, message: 'Uploading PDF to storage...' };

      // Remove previous file if exists
      const { data: existingAdditionals } = await locals.supabase
        .from('assessment_additionals')
        .select('id, additionals_letter_url')
        .eq('assessment_id', assessmentId)
        .single();

      if (existingAdditionals?.additionals_letter_url) {
        const parts = existingAdditionals.additionals_letter_url.split('/documents/');
        if (parts.length > 1) {
          await locals.supabase.storage.from('documents').remove([parts[1]]);
        }
      }

      const timestamp = new Date().getTime();
      const fileName = `${assessment.assessment_number}_Additionals_Letter_${timestamp}.pdf`;
      const filePath = `assessments/${assessmentId}/additionals/${fileName}`;

      {
        let ok = false;
        let lastErr: any = null;
        for (let i = 0; i < 3; i++) {
          const { error: uploadError } = await locals.supabase.storage
            .from('documents')
            .upload(filePath, pdfBuffer, { contentType: 'application/pdf', upsert: true });
          if (!uploadError) { ok = true; break; }
          lastErr = uploadError; await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)));
        }
        if (!ok) {
          yield { status: 'error', progress: 0, error: 'Failed to upload PDF to storage' };
          return;
        }
      }

      const proxyUrl = `/api/document/${filePath}`;

      const { error: updateError } = await locals.supabase
        .from('assessment_additionals')
        .update({ additionals_letter_url: proxyUrl })
        .eq('assessment_id', assessmentId);

      if (updateError) {
        yield { status: 'error', progress: 0, error: 'Failed to update additionals record' };
        return;
      }

      yield { status: 'complete', progress: 100, message: 'Additionals letter generated successfully!', url: proxyUrl };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error generating additionals letter';
      yield { status: 'error', progress: 0, error: msg };
    }
  });
};
