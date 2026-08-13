import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type JsonObject,
} from 'n8n-workflow';

import { acaApiRequestAllItems } from '../shared/transport';

/**
 * Lead lists as a multi-select.
 *
 * The resource picker (`listSearch/getLeadLists`) cannot back a multiOptions
 * parameter — n8n only feeds those from loadOptions — so the trigger's list
 * filter needs its own loader.
 *
 * Smart lists are listed but labelled. A smart list is a stored filter, not
 * stored rows, so the event that this filter narrows — a membership row being
 * written — is not something a smart list normally produces.
 */
export async function getLeadListOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let lists;
	try {
		lists = await acaApiRequestAllItems.call(this, '/lists', { status: 'active' }, 5);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Could not load lead lists from ACA',
			description: 'Check that the ACA API credential is valid and has not been revoked',
		});
	}

	return lists
		.map((list) => ({
			name: `${String(list.name ?? 'Untitled')}${list.source_type === 'smart' ? ' (smart list)' : ''}`,
			value: String(list.id),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
