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
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
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
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Custom Field', value: 'customField' },
					{ name: 'Enrollment', value: 'enrollment' },
					{
						name: 'Event Action',
						value: 'eventAction',
						description: 'Act on a contact or conversation: tag, note, stage, score, handoff',
					},
					{ name: 'Lead List', value: 'list' },
					{ name: 'Message', value: 'message' },
					{ name: 'Sequence', value: 'sequence' },
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
