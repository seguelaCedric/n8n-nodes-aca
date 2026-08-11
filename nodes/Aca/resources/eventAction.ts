import type { INodeProperties } from 'n8n-workflow';

const forAction = { resource: ['eventAction'] };

/** Shorthand for "show this field only for these actions". */
const forActions = (...actions: string[]) => ({ show: { ...forAction, action: actions } });

/**
 * The whole request body, built in one place.
 *
 * Every action posts the same envelope to the same endpoint and differs only in
 * `data`, so the body is assembled by a single expression rather than by several
 * fields each contributing a fragment. Mixing `request.body` with per-field
 * `send: { type: 'body' }` would leave the merge order deciding what survives;
 * this way the shape is legible and there is nothing to clobber.
 *
 * `organization_id` is deliberately absent - the endpoint takes it from the API
 * token, and sending a different one is rejected.
 */
const ACTION_BODY = `={{ ({
  action: $parameter.action,
  [$parameter.targetBy]: $parameter.target,
  data:
    ['add_tag', 'remove_tag'].includes($parameter.action) ? { tag_name: $parameter.tagName } :
    $parameter.action === 'change_stage' ? { stage_name: $parameter.stageName } :
    $parameter.action === 'update_score' ? { score_delta: $parameter.scoreDelta } :
    $parameter.action === 'add_note' ? { content: $parameter.noteContent } :
    $parameter.action === 'send_message' ? { content: $parameter.messageContent } :
    $parameter.action === 'enroll_in_sequence' ? { sequence_id: $parameter.actionSequenceId } :
    $parameter.action === 'remove_from_sequence' ? { sequence_id: $parameter.actionSequenceId, status: $parameter.exitStatus } :
    $parameter.action === 'set_ai_handling' ? { ai_handling: $parameter.aiHandling } :
    $parameter.action === 'assign_to_user' ? { user_id: $parameter.assignUserId || null } :
    {}
}) }}`;

/**
 * The `/v1/hooks/n8n` actions.
 *
 * These are not duplicates of the REST resources. Adding a tag here is additive,
 * where `PATCH /contacts/{id}` replaces the whole tag list; and targeting a
 * contact by email or phone, adding a note, or handing a conversation back to a
 * human have no REST equivalent at all.
 */
export const eventActionDescription: INodeProperties[] = [
	{
		displayName: 'Action',
		name: 'action',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: forAction },
		default: 'add_tag',
		routing: { request: { method: 'POST', url: '/hooks/n8n', body: ACTION_BODY } },
		options: [
			{ name: 'Add Note', value: 'add_note', action: 'Add note to contact' },
			{ name: 'Add Tag', value: 'add_tag', action: 'Add tag to contact' },
			{
				name: 'Assign to User',
				value: 'assign_to_user',
				action: 'Assign conversation to user',
			},
			{ name: 'Change Stage', value: 'change_stage', action: 'Move contact to pipeline stage' },
			{
				name: 'Enroll in Sequence',
				value: 'enroll_in_sequence',
				action: 'Enroll contact in sequence',
			},
			{
				name: 'Remove From Sequence',
				value: 'remove_from_sequence',
				action: 'Stop contact sequence enrollment',
			},
			{ name: 'Remove Tag', value: 'remove_tag', action: 'Remove tag from contact' },
			{
				name: 'Send Message',
				value: 'send_message',
				action: 'Queue message in conversation',
			},
			{
				name: 'Set AI Handling',
				value: 'set_ai_handling',
				action: 'Set AI handling for conversation',
			},
			{ name: 'Update Score', value: 'update_score', action: 'Change contact lead score' },
		],
	},

	/* -- Targeting ----- */
	{
		displayName: 'Target By',
		name: 'targetBy',
		type: 'options',
		default: 'contact_id',
		description: 'How to identify the contact or conversation to act on',
		displayOptions: { show: forAction },
		options: [
			{ name: 'Contact ID', value: 'contact_id' },
			{ name: 'Contact Email', value: 'contact_email' },
			{ name: 'Contact Phone', value: 'contact_phone' },
			{ name: 'Conversation ID', value: 'conversation_id' },
		],
	},
	{
		displayName: 'Target',
		name: 'target',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. jane@acme.com',
		description: 'The value matching the chosen Target By',
		displayOptions: { show: forAction },
	},

	/* -- Per-action payloads ----- */
	{
		displayName: 'Tag Name',
		name: 'tagName',
		type: 'string',
		required: true,
		default: '',
		description: 'Created if it does not exist yet',
		displayOptions: forActions('add_tag', 'remove_tag'),
	},
	{
		displayName: 'Stage',
		name: 'stageName',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Qualified',
		description: 'Pipeline stage name, or a stage ID',
		displayOptions: forActions('change_stage'),
	},
	{
		displayName: 'Score Change',
		name: 'scoreDelta',
		type: 'number',
		required: true,
		default: 10,
		description: 'Added to the current score. Use a negative number to subtract.',
		displayOptions: forActions('update_score'),
	},
	{
		displayName: 'Note',
		name: 'noteContent',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: forActions('add_note'),
	},
	{
		displayName: 'Message',
		name: 'messageContent',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		description: 'Queued for sending on the conversation own channel',
		displayOptions: forActions('send_message'),
	},
	{
		displayName: 'Sequence ID',
		name: 'actionSequenceId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: forActions('enroll_in_sequence', 'remove_from_sequence'),
	},
	{
		displayName: 'Exit Status',
		name: 'exitStatus',
		type: 'options',
		default: 'completed',
		description: 'What to mark the enrollment as when it stops',
		displayOptions: forActions('remove_from_sequence'),
		options: [
			{ name: 'Completed', value: 'completed' },
			{ name: 'Paused', value: 'paused' },
			{ name: 'Unsubscribed', value: 'unsubscribed' },
		],
	},
	{
		displayName: 'AI Handling',
		name: 'aiHandling',
		type: 'boolean',
		default: false,
		description: 'Whether the AI keeps replying in this conversation',
		displayOptions: forActions('set_ai_handling'),
	},
	{
		displayName: 'User ID',
		name: 'assignUserId',
		type: 'string',
		default: '',
		description: 'Leave empty to unassign',
		displayOptions: forActions('assign_to_user'),
	},
	{
		displayName:
			'A failed action returns <b>400</b> with a message explaining why - an unknown contact, an enrollment that matched nothing. Only a completed action returns 200.',
		name: 'actionNotice',
		type: 'notice',
		default: '',
		displayOptions: { show: forAction },
	},
];
