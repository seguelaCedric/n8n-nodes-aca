import type { INodeProperties } from 'n8n-workflow';

import { returnAllProperties, sequenceLocator, unwrapData } from '../shared/descriptions';

const forSequence = { resource: ['sequence'] };
const forGetMany = { ...forSequence, operation: ['getAll'] };

export const sequenceDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forSequence },
		default: 'getAll',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get sequence',
				description: 'Retrieve one sequence, including its steps',
				routing: {
					request: { method: 'GET', url: '=/sequences/{{ $parameter.sequenceId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many sequences',
				description: 'Retrieve many sequences. Steps are only returned by Get.',
				routing: { request: { method: 'GET', url: '/sequences' }, output: unwrapData },
			},
		],
	},
	{
		...sequenceLocator,
		displayOptions: { show: { ...forSequence, operation: ['get'] } },
	},
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
				displayName: 'Campaign ID',
				name: 'campaign_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'campaign_id' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'Paused', value: 'paused' },
				],
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
