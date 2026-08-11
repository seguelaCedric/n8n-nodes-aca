import type { INodeProperties } from 'n8n-workflow';

/**
 * Everything `PATCH /v1/contacts/{id}` will accept, as real fields.
 *
 * This used to be a raw JSON textarea, which put the burden of knowing the
 * column names on the caller and gave no hint that an unrecognised key is
 * ignored rather than rejected.
 *
 * Custom fields are separate on purpose. Writing `custom_fields` replaces the
 * entire object, so setting one key that way erases every other custom field on
 * the contact. The Custom Fields collection below sends `custom_fields_patch`
 * instead, which merges - and merges atomically, so two workflows touching
 * different keys on the same contact cannot lose each other's write.
 */

/** Assembles the PATCH body from both collections in one place. */
export const CONTACT_UPDATE_BODY = `={{ (() => {
  const u = $parameter.updateFields || {};
  const out = {};

  for (const [k, v] of Object.entries(u)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'tags') {
      out.tags = String(v).split(',').map(s => s.trim()).filter(s => s);
    } else {
      out[k] = v;
    }
  }

  const entries = ($parameter.customFields && $parameter.customFields.field) || [];
  const patch = {};
  for (const e of entries) {
    if (!e || !e.fieldKey) continue;
    patch[e.fieldKey] = (e.value === '' || e.value === undefined) ? null : e.value;
  }
  if (Object.keys(patch).length) out.custom_fields_patch = patch;

  return out;
})() }}`;

export const contactUpdateProperties: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Only the fields you add are changed; everything else is left alone',
		displayOptions: { show: { resource: ['contact'], operation: ['update'] } },
		options: [
			{
				displayName: 'City',
				name: 'city',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Company Website',
				name: 'company_website',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://acme.com',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Display Name',
				name: 'display_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'primary_email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Head of Growth',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Lead Score',
				name: 'lead_score',
				type: 'number',
				default: 0,
				description: 'Absolute value. Use Event Action > Update Score to add or subtract.',
			},
			{
				displayName: 'LinkedIn URL',
				name: 'primary_linkedin_url',
				type: 'string',
				default: '',
				placeholder: 'e.g. linkedin.com/in/janedoe',
			},
			{
				displayName: 'Owner User ID',
				name: 'owner_user_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone',
				name: 'primary_phone',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Pipeline ID',
				name: 'pipeline_id',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Where the contact came from. Filterable later.',
			},
			{
				displayName: 'Stage ID',
				name: 'stage_id',
				type: 'string',
				default: '',
				description: 'Use Event Action > Change Stage to move by stage name instead',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Archived', value: 'archived' },
					{ name: 'Bounced', value: 'bounced' },
					{ name: 'Do Not Contact', value: 'do_not_contact' },
					{ name: 'Unsubscribed', value: 'unsubscribed' },
				],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'e.g. warm,demo-booked',
				description:
					'Comma-separated, and <b>replaces</b> every existing tag. Use Event Action > Add Tag to add one without disturbing the rest.',
			},
		],
	},
	{
		displayName: 'Custom Fields',
		name: 'customFields',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		placeholder: 'Add Custom Field',
		description:
			'Merged into the contact: fields you do not list keep their current values. Leave a value empty to remove that field.',
		displayOptions: { show: { resource: ['contact'], operation: ['update'] } },
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldKey',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getCustomFields' },
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Leave empty to remove this field from the contact',
					},
				],
			},
		],
	},
];
