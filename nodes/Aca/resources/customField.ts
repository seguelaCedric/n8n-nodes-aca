import type { INodeProperties } from 'n8n-workflow';

import { unwrapData } from '../shared/descriptions';

const forCustomField = { resource: ['customField'] };
const forCreate = { ...forCustomField, operation: ['create'] };

export const customFieldDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forCustomField },
		default: 'getAll',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create custom field definition',
				description: 'Define a new custom field for contacts in this organisation',
				routing: { request: { method: 'POST', url: '/custom-fields' }, output: unwrapData },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many custom field definitions',
				description:
					'List which custom field keys exist, their types and allowed values. Read this before writing custom_fields onto a contact.',
				// Unpaginated by design - there are a handful of definitions, not a
				// table of them, so there is no Return All / Limit pair here.
				routing: { request: { method: 'GET', url: '/custom-fields' }, output: unwrapData },
			},
		],
	},

	{
		displayName: 'Field Key',
		name: 'field_key',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. icebreaker',
		description:
			'The key stored on every contact. Lowercase letters, digits and underscores, starting with a letter. This is what expressions and merge variables reference, so it cannot be changed later.',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'field_key' } },
	},
	{
		displayName: 'Display Name',
		name: 'display_name',
		type: 'string',
		default: '',
		placeholder: 'e.g. Icebreaker',
		description: 'Shown in the ACA dashboard. Defaults to the field key.',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'display_name' } },
	},
	{
		displayName: 'Field Type',
		name: 'field_type',
		type: 'options',
		default: 'text',
		displayOptions: { show: forCreate },
		routing: { send: { type: 'body', property: 'field_type' } },
		options: [
			{ name: 'Boolean', value: 'boolean' },
			{ name: 'Date', value: 'date' },
			{ name: 'Date and Time', value: 'datetime' },
			{ name: 'Email', value: 'email' },
			{ name: 'Multi-Select', value: 'multi_select' },
			{ name: 'Number', value: 'number' },
			{ name: 'Phone', value: 'phone' },
			{ name: 'Select', value: 'select' },
			{ name: 'Text', value: 'text' },
			{ name: 'Textarea', value: 'textarea' },
			{ name: 'URL', value: 'url' },
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Hot,Warm,Cold',
		description: 'Comma-separated list of the values this field accepts',
		displayOptions: { show: { ...forCreate, field_type: ['select', 'multi_select'] } },
		routing: {
			send: {
				type: 'body',
				property: 'options',
				value: '={{ $value.split(",").map(v => v.trim()).filter(v => v) }}',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: forCreate },
		options: [
			{
				displayName: 'Default Value',
				name: 'default_value',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'default_value' } },
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Display Order',
				name: 'display_order',
				type: 'number',
				default: 0,
				routing: { send: { type: 'body', property: 'display_order' } },
			},
			{
				displayName: 'Required',
				name: 'is_required',
				type: 'boolean',
				default: false,
				description: 'Whether the dashboard should require a value for this field',
				routing: { send: { type: 'body', property: 'is_required' } },
			},
		],
	},
	{
		displayName:
			'Definitions can be created here but not edited or deleted - changing a type reinterprets the value on every contact that already has one, and removing a definition orphans them. Do those in the ACA dashboard, where the consequences are visible.',
		name: 'createNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forCreate },
	},
];
