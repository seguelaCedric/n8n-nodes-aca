import type { INodeProperties } from 'n8n-workflow';

import { returnAllProperties, unwrapData } from '../shared/descriptions';

const forConversation = { resource: ['conversation'] };
const forGetMany = { ...forConversation, operation: ['getAll'] };
const forGetMessages = { ...forConversation, operation: ['getMessages'] };

export const conversationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forConversation },
		default: 'getAll',
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get conversation',
				description: 'Retrieve one conversation with its 20 most recent messages',
				routing: {
					request: { method: 'GET', url: '=/conversations/{{ $parameter.conversationId }}' },
					output: unwrapData,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many conversations',
				routing: { request: { method: 'GET', url: '/conversations' }, output: unwrapData },
			},
			{
				name: 'Get Messages',
				value: 'getMessages',
				action: 'Get conversation messages',
				description: 'Retrieve a conversation full message history, oldest first',
				routing: {
					request: {
						method: 'GET',
						url: '=/conversations/{{ $parameter.conversationId }}/messages',
					},
					output: unwrapData,
				},
			},
		],
	},
	{
		displayName: 'Conversation ID',
		name: 'conversationId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
		displayOptions: { show: { resource: ['conversation'], operation: ['get', 'getMessages'] } },
	},

	...returnAllProperties(forGetMany),
	...returnAllProperties(forGetMessages),

	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: forGetMany },
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				default: 'email',
				options: [
					{ name: 'Email', value: 'email' },
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'LinkedIn', value: 'linkedin' },
					{ name: 'SMS', value: 'sms' },
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				routing: { send: { type: 'query', property: 'channel' } },
			},
			{
				displayName: 'Contact ID',
				name: 'contact_id',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'contact_id' } },
			},
			{
				displayName: 'Has Inbound Message',
				name: 'has_inbound_message',
				type: 'boolean',
				default: true,
				description: 'Whether to return only conversations the contact has actually replied in',
				routing: { send: { type: 'query', property: 'has_inbound_message' } },
			},
			{
				displayName: 'Include System',
				name: 'include_system',
				type: 'boolean',
				default: false,
				description: 'Whether to include system-generated conversations. Excluded by default.',
				routing: { send: { type: 'query', property: 'include_system' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
];
