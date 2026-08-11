import type { INodeProperties } from 'n8n-workflow';

import {
	confirmDeleted,
	returnAllProperties,
	simplifyProperty,
	splitCsv,
	unwrapData,
} from '../shared/descriptions';

const forContact = { resource: ['contact'] };
const forGetMany = { ...forContact, operation: ['getAll'] };
const forCreate = { ...forContact, operation: ['create'] };
const forUpdate = { ...forContact, operation: ['update'] };
const forDeleteMany = { ...forContact, operation: ['deleteMany'] };

export const contactDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forContact },
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create contacts',
				description: 'Create one or many contacts, de-duplicated on email',
				routing: { request: { method: 'POST', url: '/contacts' } },
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete contact',
				description: 'Delete a single contact by ID',
				routing: {
					request: { method: 'DELETE', url: '=/contacts/{{ $parameter.contactId }}' },
					output: confirmDeleted,
				},
			},
			{
				name: 'Delete Many',
				value: 'deleteMany',
				action: 'Delete many contacts',
				description: 'Delete up to 100 contacts by ID',
				routing: { request: { method: 'DELETE', url: '/contacts' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get contact',
				description: 'Retrieve a single contact by ID',
				routing: {
					request: { method: 'GET', url: '=/contacts/{{ $parameter.contactId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many contacts',
				description: 'Retrieve many contacts, with optional filters',
				routing: { request: { method: 'GET', url: '/contacts' }, output: unwrapData },
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update contact',
				description: 'Update a single contact by ID',
				routing: {
					request: { method: 'PATCH', url: '=/contacts/{{ $parameter.contactId }}' },
					output: unwrapData,
				},
			},
		],
	},

	/* -- Get / Update / Delete: the ID ----- */
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3f2a9c1e-7b40-4d8e-9a12-6c5b8e0d1f34',
		displayOptions: { show: { resource: ['contact'], operation: ['get', 'update', 'delete'] } },
	},

	simplifyProperty({ resource: ['contact'], operation: ['get', 'getAll'] }),

	/* -- Get Many ----- */
	...returnAllProperties(forGetMany),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: forGetMany },
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'Partial match on company name',
				routing: { send: { type: 'query', property: 'company' } },
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Exact match, case-insensitive',
				routing: { send: { type: 'query', property: 'email' } },
			},
			{
				displayName: 'Owner User ID',
				name: 'owner_user_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'owner_user_id' } },
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Where the contact came from, e.g. <code>api</code> or <code>csv</code>',
				routing: { send: { type: 'query', property: 'source' } },
			},
			{
				displayName: 'Stage ID',
				name: 'stage_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'stage_id' } },
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
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Tag',
				name: 'tag',
				type: 'string',
				default: '',
				description: 'Only contacts carrying this tag',
				routing: { send: { type: 'query', property: 'tag' } },
			},
		],
	},

	/* -- Create ----- */
	{
		displayName:
			'Duplicates skipped by <b>Dedupe on Email</b> are counted in <code>skipped</code> but are <b>not</b> returned in <code>contact_ids</code>. If you need the ID of every contact you submitted, look them up afterwards by email.',
		name: 'createNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forCreate },
	},
	{
		displayName: 'Contacts',
		name: 'contacts',
		type: 'json',
		required: true,
		default: '[\n  {\n    "display_name": "Jane Doe",\n    "primary_email": "jane@acme.com"\n  }\n]',
		description:
			'Array of contacts to create, up to 1000 per call. Each may carry <code>display_name</code>, <code>primary_email</code>, <code>primary_phone</code>, <code>company</code>, <code>job_title</code>, <code>tags</code> and <code>custom_fields</code>.',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'contacts' } },
	},
	{
		displayName: 'Options',
		name: 'createOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: forCreate },
		options: [
			{
				displayName: 'Dedupe on Email',
				name: 'dedupe_on_email',
				type: 'boolean',
				default: true,
				description: 'Whether to skip contacts whose email already exists in this organisation',
				routing: { send: { type: 'body', property: 'dedupe_on_email' } },
			},
			{
				displayName: 'Log Activity',
				name: 'log_activity',
				type: 'boolean',
				default: true,
				description: 'Whether to write a creation activity onto each contact',
				routing: { send: { type: 'body', property: 'log_activity' } },
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: 'api',
				description: 'Recorded on each contact, and filterable later',
				routing: { send: { type: 'body', property: 'source' } },
			},
		],
	},

	/* -- Update ----- */
	{
		displayName:
			'<code>tags</code> and <code>custom_fields</code> are <b>replaced wholesale</b>, not merged. To add one tag, read the contact first and send the full list back.',
		name: 'updateNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forUpdate },
	},
	{
		displayName: 'Fields',
		name: 'updateFields',
		type: 'json',
		required: true,
		default: '{\n  "job_title": "Head of Growth"\n}',
		description:
			'Fields to change. Anything outside the updatable set is ignored rather than rejected.',
		displayOptions: { show: forUpdate },
		routing: { request: { body: '={{ JSON.parse($value) }}' } },
	},

	/* -- Delete Many ----- */
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3f2a9c1e-7b40-4d8e-9a12-6c5b8e0d1f34,8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6',
		description: 'Comma-separated contact IDs, up to 100 per call',
		displayOptions: { show: forDeleteMany },
		routing: { send: { type: 'body', property: 'ids', value: splitCsv } },
	},

	{
		displayName:
			'Deleting a contact also removes its tags, notes and list memberships. This cannot be undone.',
		name: 'deleteNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['delete', 'deleteMany'] } },
	},
];
