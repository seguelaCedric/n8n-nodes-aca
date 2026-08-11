import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';

/**
 * Filters for reading a lead list's contacts.
 *
 * These map onto ACA's Advanced Filters engine - the same one the app's filter
 * panel drives - rather than a second interpretation of what "has an email"
 * means. The node assembles a single JSON object and sends it as `filters`.
 *
 * The presence toggles at the top (Has Email, Has LinkedIn URL, Has Phone) are
 * convenience wrappers: each one lowers to a `contactFieldConditions` entry, the
 * same generic mechanism exposed in full by Field Conditions below. One
 * predicate underneath, three obvious switches on the surface.
 */

/** Native contact columns that can be matched. Mirrors the SQL allowlist. */
const CONTACT_FIELDS = [
	{ name: 'City', value: 'city' },
	{ name: 'Company', value: 'company' },
	{ name: 'Company Website', value: 'company_website' },
	{ name: 'Country', value: 'country' },
	{ name: 'Display Name', value: 'display_name' },
	{ name: 'Email', value: 'primary_email' },
	{ name: 'First Name', value: 'first_name' },
	{ name: 'Job Title', value: 'job_title' },
	{ name: 'Last Name', value: 'last_name' },
	{ name: 'LinkedIn URL', value: 'primary_linkedin_url' },
	{ name: 'Phone', value: 'primary_phone' },
	{ name: 'Source', value: 'source' },
	{ name: 'State', value: 'state' },
	{ name: 'Status', value: 'status' },
];

/**
 * Build the `filters` query parameter from everything the user set.
 *
 * Written as one expression so the request carries a single, legible JSON
 * object: n8n has no hook for "assemble this from several fields", and spreading
 * the work across per-field `send` blocks would leave merge order deciding what
 * survives.
 */
export const MEMBER_FILTERS_QUERY = `={{ (() => {
  const f = $parameter.filters || {};
  const out = {};
  const presence = [];

  if (f.hasEmail !== undefined) presence.push({ field: 'primary_email', operator: f.hasEmail ? 'has_value' : 'is_empty' });
  if (f.hasLinkedin !== undefined) presence.push({ field: 'primary_linkedin_url', operator: f.hasLinkedin ? 'has_value' : 'is_empty' });
  if (f.hasPhone !== undefined) presence.push({ field: 'primary_phone', operator: f.hasPhone ? 'has_value' : 'is_empty' });

  const conditions = (f.fieldConditions && f.fieldConditions.condition) || [];
  for (const c of conditions) {
    if (!c || !c.field) continue;
    const entry = { field: c.field, operator: c.operator };
    if (c.value !== undefined && c.value !== '') entry.value = c.value;
    presence.push(entry);
  }
  if (presence.length) out.contactFieldConditions = presence;

  if (f.search) out.search = f.search;
  if (f.emailQuality && f.emailQuality.length) out.emailQuality = f.emailQuality;
  if (f.aiAnalysisStatus) out.aiAnalysisStatus = f.aiAnalysisStatus;
  if (f.hasEnrichmentData !== undefined) out.hasEnrichmentData = f.hasEnrichmentData;
  if (f.isB2b !== undefined) out.isB2b = f.isB2b;
  if (f.runsAds !== undefined) out.runsAds = f.runsAds;
  if (f.hiringSalesRoles !== undefined) out.hiringSalesRoles = f.hiringSalesRoles;
  if (f.hasOutboundMotion !== undefined) out.hasOutboundMotion = f.hasOutboundMotion;

  const csv = (v) => String(v).split(',').map(s => s.trim()).filter(s => s);
  if (f.countries) out.countries = csv(f.countries);
  if (f.cities) out.cities = csv(f.cities);
  if (f.industries) out.industries = csv(f.industries);
  if (f.companySizes) out.companySizes = csv(f.companySizes);
  if (f.seniorities) out.seniorities = csv(f.seniorities);
  if (f.departments) out.departments = csv(f.departments);
  if (f.detectedTechnologies) out.detectedTechnologies = csv(f.detectedTechnologies);
  if (f.excludedTechnologies) out.excludedTechnologies = csv(f.excludedTechnologies);
  if (f.detectedTechMatchAll !== undefined) out.detectedTechMatchAll = f.detectedTechMatchAll;

  if (f.icpProductId) out.icpProductId = f.icpProductId;
  if (f.minIcpScore !== undefined) out.minIcpScore = f.minIcpScore;
  if (f.maxIcpScore !== undefined) out.maxIcpScore = f.maxIcpScore;
  if (f.minDmScore !== undefined) out.minDmScore = f.minDmScore;

  return Object.keys(out).length ? JSON.stringify(out) : undefined;
})() }}`;

export function memberFilterProperties(show: IDisplayOptions['show']): INodeProperties[] {
	return [
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			description: 'Narrow the list down before it reaches your workflow',
			displayOptions: { show },
			options: [
				{
					displayName: 'AI Analysis Status',
					name: 'aiAnalysisStatus',
					type: 'options',
					default: 'analyzed',
					description: 'Whether ACA has analysed the contact company',
					options: [
						{ name: 'Analyzed', value: 'analyzed' },
						{ name: 'Analyzing', value: 'analyzing' },
						{ name: 'Failed', value: 'failed' },
						{ name: 'No Data', value: 'no_data' },
						{ name: 'Not Analyzed', value: 'not_analyzed' },
					],
				},
				{
					displayName: 'Cities',
					name: 'cities',
					type: 'string',
					default: '',
					placeholder: 'e.g. London,Manchester',
					description: 'Comma-separated, case-insensitive',
				},
				{
					displayName: 'Company Sizes',
					name: 'companySizes',
					type: 'string',
					default: '',
					placeholder: 'e.g. 11-50,51-200',
					description: 'Comma-separated, matched against enrichment data',
				},
				{
					displayName: 'Countries',
					name: 'countries',
					type: 'string',
					default: '',
					placeholder: 'e.g. United Kingdom,United States',
					description: 'Comma-separated, case-insensitive',
				},
				{
					displayName: 'Departments',
					name: 'departments',
					type: 'string',
					default: '',
					placeholder: 'e.g. sales,marketing',
					description: 'Comma-separated, matched against enrichment data',
				},
				{
					displayName: 'Detected Technologies',
					name: 'detectedTechnologies',
					type: 'string',
					default: '',
					placeholder: 'e.g. hubspot,salesforce',
					description: 'Comma-separated, detected on the company website',
				},
				{
					displayName: 'Email Quality',
					name: 'emailQuality',
					type: 'multiOptions',
					default: [],
					description:
						'Deliverability grade from verification. Clean is safe to send; failed should never be sent to.',
					options: [
						{ name: 'Clean', value: 'clean' },
						{ name: 'Failed', value: 'failed' },
						{ name: 'Risky', value: 'risky' },
						{ name: 'Unverified', value: 'unverified' },
					],
				},
				{
					displayName: 'Excluded Technologies',
					name: 'excludedTechnologies',
					type: 'string',
					default: '',
					placeholder: 'e.g. outreach,salesloft',
					description: 'Comma-separated. Drops contacts whose site shows any of these.',
				},
				{
					displayName: 'Field Conditions',
					name: 'fieldConditions',
					type: 'fixedCollection',
					typeOptions: { multipleValues: true },
					default: {},
					placeholder: 'Add Condition',
					description:
						'Match any contact field on whether it is filled, empty, or holds a particular value. Conditions are combined with AND.',
					options: [
						{
							displayName: 'Condition',
							name: 'condition',
							values: [
								{
									displayName: 'Field',
									name: 'field',
									type: 'options',
									default: 'primary_linkedin_url',
									options: CONTACT_FIELDS,
								},
								{
									displayName: 'Operator',
									name: 'operator',
									type: 'options',
									default: 'has_value',
									options: [
										{ name: 'Is Filled', value: 'has_value' },
										{ name: 'Is Empty', value: 'is_empty' },
										{ name: 'Equals', value: 'equals' },
										{ name: 'Contains', value: 'contains' },
									],
								},
								{
									displayName: 'Value',
									name: 'value',
									type: 'string',
									default: '',
									description: 'Only used by Equals and Contains',
									displayOptions: { show: { operator: ['equals', 'contains'] } },
								},
							],
						},
					],
				},
				{
					displayName: 'Has Email',
					name: 'hasEmail',
					type: 'boolean',
					default: true,
					description: 'Whether to keep only contacts that have an email address',
				},
				{
					displayName: 'Has Enrichment Data',
					name: 'hasEnrichmentData',
					type: 'boolean',
					default: true,
					description: 'Whether to keep only contacts ACA has enriched',
				},
				{
					displayName: 'Has LinkedIn URL',
					name: 'hasLinkedin',
					type: 'boolean',
					default: true,
					description: 'Whether to keep only contacts that have a LinkedIn URL',
				},
				{
					displayName: 'Has Outbound Motion',
					name: 'hasOutboundMotion',
					type: 'boolean',
					default: true,
					description: 'Whether the company appears to run outbound already',
				},
				{
					displayName: 'Has Phone',
					name: 'hasPhone',
					type: 'boolean',
					default: true,
					description: 'Whether to keep only contacts that have a phone number',
				},
				{
					displayName: 'Hiring Sales Roles',
					name: 'hiringSalesRoles',
					type: 'boolean',
					default: true,
					description: 'Whether the company is currently hiring sales people',
				},
				{
					displayName: 'ICP Product ID',
					name: 'icpProductId',
					type: 'string',
					default: '',
					description: 'Required before any ICP or decision-maker score filter applies',
				},
				{
					displayName: 'Industries',
					name: 'industries',
					type: 'string',
					default: '',
					placeholder: 'e.g. staffing and recruiting',
					description: 'Comma-separated, matched against enrichment data',
				},
				{
					displayName: 'Is B2B',
					name: 'isB2b',
					type: 'boolean',
					default: true,
					description: 'Whether the company sells to other businesses',
				},
				{
					displayName: 'Match All Detected Technologies',
					name: 'detectedTechMatchAll',
					type: 'boolean',
					default: false,
					description: 'Whether the site must show every listed technology rather than any of them',
				},
				{
					displayName: 'Max ICP Score',
					name: 'maxIcpScore',
					type: 'number',
					default: 100,
					description: 'Requires ICP Product ID',
				},
				{
					displayName: 'Min Decision-Maker Score',
					name: 'minDmScore',
					type: 'number',
					default: 50,
					description: 'Requires ICP Product ID',
				},
				{
					displayName: 'Min ICP Score',
					name: 'minIcpScore',
					type: 'number',
					default: 50,
					description: 'Requires ICP Product ID',
				},
				{
					displayName: 'Runs Ads',
					name: 'runsAds',
					type: 'boolean',
					default: true,
					description: 'Whether paid-ad tracking was detected on the company website',
				},
				{
					displayName: 'Search',
					name: 'search',
					type: 'string',
					default: '',
					description: 'Partial match across name, email, company and job title',
				},
				{
					displayName: 'Seniorities',
					name: 'seniorities',
					type: 'string',
					default: '',
					placeholder: 'e.g. c_suite,vp,director',
					description: 'Comma-separated, matched against enrichment data',
				},
			],
		},
	];
}
