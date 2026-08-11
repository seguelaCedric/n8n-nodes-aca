import type { INodeProperties } from 'n8n-workflow';

import {
	returnAllProperties,
	sequenceLocator,
	splitCsv,
	unwrapData,
} from '../shared/descriptions';

const forEnrollment = { resource: ['enrollment'] };
const forGetMany = { ...forEnrollment, operation: ['getAll'] };
const forCreate = { ...forEnrollment, operation: ['create'] };

export const enrollmentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forEnrollment },
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Enroll leads in sequence',
				description: 'Enroll contacts, a list, or several lists into an email sequence',
				// No postReceive: the response is a summary of per-bucket counts
				// (enrolled / skipped / noEmail / suppressed / skippedActiveElsewhere)
				// with no `data` and no `success`. One item carrying it is right.
				routing: { request: { method: 'POST', url: '/enrollments' } },
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get enrollment',
				routing: {
					request: { method: 'GET', url: '=/enrollments/{{ $parameter.enrollmentId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many enrollments',
				routing: { request: { method: 'GET', url: '/enrollments' }, output: unwrapData },
			},
		],
	},

	{
		displayName: 'Enrollment ID',
		name: 'enrollmentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { ...forEnrollment, operation: ['get'] } },
	},

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
				displayName: 'Lead ID',
				name: 'lead_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'lead_id' } },
			},
			{
				displayName: 'Sequence ID',
				name: 'sequence_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'sequence_id' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Bounced', value: 'bounced' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Paused', value: 'paused' },
					{ name: 'Replied', value: 'replied' },
					{ name: 'Sender Disconnected', value: 'sender_disconnected' },
					{ name: 'Unsubscribed', value: 'unsubscribed' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},

	/* -- Create ----- */
	{
		...sequenceLocator,
		description: 'The sequence to enroll into',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'sequenceId' } },
	},
	{
		// The API accepts exactly one of contactIds / listId / listIds. Modelling
		// that as a discriminator makes the invalid combination unrepresentable in
		// the UI, rather than a 400 the user discovers at run time.
		displayName: 'Enroll',
		name: 'enrollBy',
		type: 'options',
		default: 'contactIds',
		description: 'Which audience to enroll',
		displayOptions: { show: forCreate },
		options: [
			{ name: 'Specific Contacts', value: 'contactIds' },
			{ name: 'A Lead List', value: 'listId' },
			{ name: 'Several Lead Lists', value: 'listIds' },
		],
	},
	{
		displayName: 'Contact IDs',
		name: 'contactIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 3f2a9c1e-7b40-4d8e-9a12-6c5b8e0d1f34,8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6',
		description: 'Comma-separated contact IDs',
		displayOptions: { show: { ...forCreate, enrollBy: ['contactIds'] } },
		routing: { send: { type: 'body', property: 'contactIds', value: splitCsv } },
	},
	{
		displayName: 'Lead List',
		name: 'listId',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions: { show: { ...forCreate, enrollBy: ['listId'] } },
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a lead list...',
				typeOptions: { searchListMethod: 'getLeadLists', searchable: true },
			},
			{ displayName: 'By ID', name: 'id', type: 'string', placeholder: 'e.g. 8c1d4e77-...' },
		],
		routing: { send: { type: 'body', property: 'listId' } },
	},
	{
		displayName: 'Lead List IDs',
		name: 'listIds',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 8c1d4e77-2a3b-4f56-9e01-77b2c9d4e5f6,1b9e2d55-6c7a-4d21-8f30-44a1b8c7d2e9',
		description: 'Comma-separated lead list IDs',
		displayOptions: { show: { ...forCreate, enrollBy: ['listIds'] } },
		routing: { send: { type: 'body', property: 'listIds', value: splitCsv } },
	},
	{
		displayName: 'Options',
		name: 'enrollOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: forCreate },
		options: [
			{
				displayName: 'Allow Concurrent',
				name: 'allowConcurrent',
				type: 'boolean',
				default: false,
				description:
					'Whether to enroll a lead who is already active in another sequence. Off by default, so a lead is never emailed by two sequences at once.',
				routing: { send: { type: 'body', property: 'allowConcurrent' } },
			},
			{
				displayName: 'Custom Data by Contact ID',
				name: 'customDataByContactId',
				type: 'json',
				default: '{}',
				description:
					'Per-lead merge variables for this sequence only, keyed by contact ID. Beats the sequence copy for that lead.',
				routing: {
					send: {
						type: 'body',
						property: 'customDataByContactId',
						value: '={{ JSON.parse($value) }}',
					},
				},
			},
			{
				displayName: 'Delay (Hours)',
				name: 'delayHours',
				type: 'number',
				default: 0,
				description: 'Wait this many hours before the first email',
				routing: { send: { type: 'body', property: 'delayHours' } },
			},
		],
	},
	{
		displayName:
			'The response reports what happened to each lead: <code>enrolled</code>, <code>skipped</code>, <code>noEmail</code>, <code>suppressed</code> and <code>skippedActiveElsewhere</code>. Enrolling nothing is a normal outcome, not an error - check the counts.',
		name: 'enrollNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forCreate },
	},
];
