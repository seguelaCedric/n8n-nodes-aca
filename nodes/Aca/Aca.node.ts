import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { ACA_BASE_URL } from './shared/constants';
import { getLeadLists } from './listSearch/getLeadLists';
import { getSequences } from './listSearch/getSequences';
import { getCustomFields } from './loadOptions/getCustomFields';
import { contactDescription } from './resources/contact';
import { conversationDescription } from './resources/conversation';
import { customFieldDescription } from './resources/customField';
import { enrollmentDescription } from './resources/enrollment';
import { eventActionDescription } from './resources/eventAction';
import { listDescription } from './resources/list';
import { messageDescription } from './resources/message';
import { sequenceDescription } from './resources/sequence';

export class Aca implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ACA',
		name: 'aca',
		icon: { light: 'file:../../icons/aca.svg', dark: 'file:../../icons/aca.dark.svg' },
		group: ['input'],
		version: 1,
		// Event Action is selected by `action`, not `operation`, so the usual
		// "operation: resource" would read "undefined: eventAction" on the canvas.
		subtitle:
			'={{ $parameter["resource"] === "eventAction" ? $parameter["action"] : $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Manage contacts, lead lists, sequences and conversations in ACA',
		defaults: { name: 'ACA' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'acaApi', required: true }],
		requestDefaults: {
			baseURL: ACA_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'contact',
				options: [
					{
						name: 'Contact',
						value: 'contact',
						description: 'People in the CRM. Read, create, update and delete.',
					},
					{
						name: 'Conversation',
						value: 'conversation',
						description: 'Message threads across every channel, and their history',
					},
					{
						name: 'Custom Field',
						value: 'customField',
						description: 'The schema behind a contact custom fields. Read it before writing them.',
					},
					{
						name: 'Enrollment',
						value: 'enrollment',
						description: 'Put leads into an email sequence, and see who is running through one',
					},
					{
						name: 'Event Action',
						value: 'eventAction',
						description:
							'Act on a contact or conversation: tag, note, stage, score, handoff. Additive where Update replaces.',
					},
					{
						name: 'Lead List',
						value: 'list',
						description: 'Named groups of contacts, and the contacts inside them',
					},
					{
						name: 'Message',
						value: 'message',
						description: 'Reply into an existing conversation on its own channel',
					},
					{
						name: 'Sequence',
						value: 'sequence',
						description: 'Email sequences and their steps. Read-only.',
					},
				],
			},
			...contactDescription,
			...conversationDescription,
			...customFieldDescription,
			...enrollmentDescription,
			...eventActionDescription,
			...listDescription,
			...messageDescription,
			...sequenceDescription,
		],
	};

	methods = {
		listSearch: {
			getLeadLists,
			getSequences,
		},
		loadOptions: {
			getCustomFields,
		},
	};
}
