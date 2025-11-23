import type { Assessment, CompanySettings, VehicleIdentification } from '$lib/types/assessment';
import { formatDateNumeric } from '$lib/utils/formatters';
import { escapeHtmlWithLineBreaks } from '$lib/utils/sanitize';

interface PhotoSection {
	title: string;
	photos: Array<{
		url: string;
		caption?: string;
	}>;
}

interface PhotosData {
	assessment: Assessment;
	vehicleIdentification: VehicleIdentification | null;
	companySettings: CompanySettings | null;
	sections: PhotoSection[];
	logoBase64?: string | null;
}

export function generatePhotosHTML(data: PhotosData): string {
	const { assessment, vehicleIdentification, companySettings, sections, logoBase64 } = data;

	// Calculate total photos for summary
	const totalPhotos = sections.reduce((acc, section) => acc + section.photos.length, 0);

	const companyName = companySettings?.company_name || 'Claimtech';
	const logoTextFallback = companySettings?.company_name || 'CLAIMTECH';
	const logoMarkup = logoBase64
		? `<img src="data:image/png;base64,${logoBase64}" alt="${escapeHtmlWithLineBreaks(
				logoTextFallback
		  )} logo" class="report-logo" />`
		: logoTextFallback;

	const renderPhotoSection = (section: PhotoSection) => {
		if (section.photos.length === 0) return '';

		return `
		<div class="section">
			<div class="section-title">${section.title}</div>
			<div class="photos-grid">
				${section.photos
					.map(
						(photo) => `
					<div class="photo-item">
						<img src="${photo.url}" alt="${photo.caption || section.title}" />
						${photo.caption ? `<div class="photo-caption">${photo.caption}</div>` : ''}
					</div>
				`
					)
					.join('')}
			</div>
		</div>
		`;
	};

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Assessment Photographs - ${assessment.assessment_number}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			font-size: 10pt;
			line-height: 1.4;
			color: #1f2937;
		}

		/* Summary Page Styles */
		.summary-page {
			height: 100vh;
			display: flex;
			flex-direction: column;
			padding: 40px;
			position: relative;
			color: #1f2937;
		}

		.summary-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 60px;
			border-bottom: 4px solid #e11d48;
			padding-bottom: 20px;
		}

		.logo-placeholder {
			font-size: 24pt;
			font-weight: bold;
			color: #e11d48;
			letter-spacing: -1px;
			display: flex;
			align-items: center;
			gap: 0.75rem;
		}

		.report-logo {
			max-height: 70px;
			width: auto;
			object-fit: contain;
		}

		.summary-title {
			font-size: 36pt;
			font-weight: 800;
			color: #111827;
			margin-bottom: 10px;
			line-height: 1.1;
		}

		.summary-subtitle {
			font-size: 14pt;
			color: #6b7280;
			font-weight: 500;
		}

		.summary-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 40px;
			margin-top: 40px;
		}

		.summary-card {
			background: #fff;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			padding: 25px;
			box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		}

		.summary-card-title {
			font-size: 10pt;
			text-transform: uppercase;
			letter-spacing: 1px;
			color: #6b7280;
			margin-bottom: 10px;
			font-weight: 600;
		}

		.summary-card-value {
			font-size: 18pt;
			font-weight: 700;
			color: #111827;
		}

		.summary-footer {
			margin-top: auto;
			text-align: center;
			color: #9ca3af;
			font-size: 9pt;
			border-top: 1px solid #e5e7eb;
			padding-top: 20px;
		}

		/* Standard Page Styles */
		.standard-page {
			padding: 40px;
		}

		.standard-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			padding-bottom: 15px;
			border-bottom: 2px solid #e11d48;
			margin-bottom: 30px;
		}

		.standard-header-company {
			font-size: 16pt;
			font-weight: bold;
			color: #111827;
		}

		.standard-header-details {
			text-align: right;
			font-size: 9pt;
			color: #6b7280;
		}

		.section {
			margin-bottom: 30px;
			page-break-inside: avoid;
		}

		.section-title {
			background-color: #fff;
			padding: 8px 0;
			font-weight: 700;
			font-size: 12pt;
			border-bottom: 2px solid #e11d48;
			margin-bottom: 20px;
			color: #111827;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}

		.photos-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 20px;
			margin-bottom: 20px;
		}

		.photo-item {
			border: 1px solid #e5e7eb;
			padding: 10px;
			background-color: #fff;
			text-align: center;
			border-radius: 4px;
		}

		.photo-item img {
			max-width: 100%;
			height: auto;
			max-height: 350px;
			object-fit: contain;
			display: block;
			margin: 0 auto;
			border-radius: 2px;
		}

		.photo-caption {
			margin-top: 10px;
			font-size: 9pt;
			color: #6b7280;
			font-style: italic;
			font-weight: 500;
		}

		.footer {
			margin-top: 40px;
			padding-top: 20px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			font-size: 8pt;
			color: #9ca3af;
		}

		.page-break {
			page-break-after: always;
		}

		@media print {
			* {
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}
			.section {
				page-break-inside: avoid;
			}
			.photo-item {
				page-break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<!-- Summary Page -->
	<div class="summary-page">
		<div class="summary-header">
			<div class="logo-placeholder">
				${logoMarkup}
			</div>
			<div style="text-align: right;">
				<div style="font-weight: bold; color: #e11d48;">${assessment.assessment_number}</div>
				<div style="color: #6b7280; font-size: 9pt;">${formatDateNumeric(assessment.created_at)}</div>
			</div>
		</div>

		<div>
			<div class="summary-title">ASSESSMENT PHOTOGRAPHS</div>
			<div class="summary-subtitle">Photographic Evidence Record</div>
		</div>

		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-card-title">Vehicle Details</div>
				<div class="summary-card-value" style="font-size: 14pt;">
					${vehicleIdentification?.vehicle_year || ''} ${vehicleIdentification?.vehicle_make || ''}<br>
					${vehicleIdentification?.vehicle_model || ''}
				</div>
				<div style="margin-top: 10px; color: #6b7280; font-size: 10pt;">
					Report: ${assessment.report_number || 'N/A'}
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-card-title">Total Photos</div>
				<div class="summary-card-value" style="color: #e11d48;">
					${totalPhotos}
				</div>
				<div style="margin-top: 5px; color: #6b7280; font-size: 9pt;">Images Captured</div>
			</div>
		</div>

		<div class="summary-footer">
			${companyName} | ${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}
		</div>
	</div>

	<div class="page-break"></div>

	<!-- Standard Page -->
	<div class="standard-page">
		<!-- Standard Header -->
		<div class="standard-header">
			<div class="standard-header-company">
				${companyName}
			</div>
			<div class="standard-header-details">
				<div><strong>Assessment No:</strong> ${assessment.assessment_number}</div>
				<div><strong>Date:</strong> ${formatDateNumeric(assessment.created_at)}</div>
			</div>
		</div>

		<!-- Photo Sections -->
		${sections.map((section) => renderPhotoSection(section)).join('')}

		${sections.every((s) => s.photos.length === 0) ? `
		<div class="section">
			<p style="text-align: center; color: #6b7280; padding: 40px;">No photographs available for this assessment.</p>
		</div>
		` : ''}

		<!-- Footer -->
		<div class="footer">
			<p>This document was generated by ${companySettings?.company_name || 'Claimtech'}</p>
			<p>${companySettings?.email || 'info@claimtech.co.za'} | ${companySettings?.website || 'www.claimtech.co.za'}</p>
			<p>Generated on ${formatDateNumeric(new Date().toISOString())}</p>
		</div>
	</div>
</body>
</html>
	`.trim();
}

