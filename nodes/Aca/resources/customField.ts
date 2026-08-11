import type { INodeProperties } from 'n8n-workflow';

import { unwrapData } from '../shared/descriptions';

const forCustomField = { resource: ['customField'] };

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
];
