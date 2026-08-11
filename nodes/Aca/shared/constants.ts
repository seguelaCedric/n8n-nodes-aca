/** Base URL for every ACA REST call, including the trigger's own bookkeeping. */
export const ACA_BASE_URL = 'https://api.automatedclientacquisition.com/v1';

/**
 * The events ACA actually emits.
 *
 * Each one is produced by a database trigger, so this list is exhaustive rather
 * than aspirational - if an event is not here, nothing in ACA fires it.
 */
export const ACA_WEBHOOK_EVENTS = [
	{ name: 'Contact Created', value: 'contact_created' },
	{ name: 'Contact Updated', value: 'contact_updated' },
	{ name: 'Handoff Requested', value: 'handoff_requested' },
	{ name: 'Lead Replied', value: 'lead_replied' },
	{ name: 'Message Received', value: 'message_received' },
	{ name: 'Message Sent', value: 'message_sent' },
	{ name: 'Score Changed', value: 'score_changed' },
	{ name: 'Sequence Completed', value: 'sequence_completed' },
	{ name: 'Stage Changed', value: 'stage_changed' },
	{ name: 'Tag Added', value: 'tag_added' },
	{ name: 'Tag Removed', value: 'tag_removed' },
];
