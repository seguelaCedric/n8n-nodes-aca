import type { INodeProperties } from 'n8n-workflow';

import { splitCsv } from '../shared/descriptions';

const forMessage = { resource: ['message'] };
const forSend = { ...forMessage, operation: ['send'] };

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forMessage },
		default: 'send',
		options: [
			{
				name: 'Send',
				value: 'send',
				action: 'Send message',
				description:
					'Reply into an existing conversation, on whichever channel that conversation uses',
				routing: { request: { method: 'POST', url: '/messages' } },
			},
		],
	},
	{
		displayName:
			'Messages go out on the conversation existing channel and, for email, stay in the same thread from the same mailbox. There is no way to start a new conversation from here.',
		name: 'sendNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forSend },
	},
	{
		displayName: 'Conversation ID',
		name: 'conversation_id',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
		displayOptions: { show: forSend },
		routing: { send: { type: 'body', property: 'conversation_id' } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		displayOptions: { show: forSend },
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'Email Options',
		name: 'emailOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		description: 'Ignored on non-email channels',
		displayOptions: { show: forSend },
		options: [
			{
				displayName: 'BCC',
				name: 'email_bcc',
				type: 'string',
				default: '',
				placeholder: 'e.g. jane@acme.com,sam@acme.com',
				routing: { send: { type: 'body', property: 'email_bcc', value: splitCsv } },
			},
			{
				displayName: 'CC',
				name: 'email_cc',
				type: 'string',
				default: '',
				placeholder: 'e.g. jane@acme.com,sam@acme.com',
				routing: { send: { type: 'body', property: 'email_cc', value: splitCsv } },
			},
			{
				displayName: 'Subject',
				name: 'email_subject',
				type: 'string',
				default: '',
				description: 'Defaults to a reply subject derived from the thread',
				routing: { send: { type: 'body', property: 'email_subject' } },
			},
		],
	},
];
