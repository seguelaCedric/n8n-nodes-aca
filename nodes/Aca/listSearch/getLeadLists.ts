import { NodeApiError, type ILoadOptionsFunctions, type INodeListSearchResult, type JsonObject } from 'n8n-workflow';

import { acaApiRequestAllItems } from '../shared/transport';

/**
 * Lead lists for the resource picker.
 *
 * The API has no name search, so filtering happens here over the fetched page
 * set. Archived lists are excluded - enrolling into one is almost never what
 * somebody means, and they can still be addressed by ID.
 */
export async function getLeadLists(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let lists;
	try {
		lists = await acaApiRequestAllItems.call(this, '/lists', { status: 'active' }, 5);
	} catch (error) {
		// Without this the picker surfaces a bare HTTP error with no hint that the
		// credential is the thing to look at.
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Could not load lead lists from ACA',
			description: 'Check that the ACA API credential is valid and has not been revoked',
		});
	}

	const needle = filter?.toLowerCase();
	const results = lists
		.filter((list) => !needle || String(list.name ?? '').toLowerCase().includes(needle))
		.map((list) => {
			// A smart list is defined by a filter, not by stored rows: ACA evaluates
			// its membership when you open it and never writes to the membership
			// table. Get Members therefore returns nothing for one, however full it
			// looks in the app — so say that in the picker rather than let someone
			// pick it and see an empty result with no explanation.
			const isSmart = list.source_type === 'smart';
			const suffix = isSmart
				? ' - smart list, no stored members'
				: ` (${Number(list.lead_count ?? 0)} leads)`;

			return {
				name: `${String(list.name ?? 'Untitled')}${suffix}`,
				value: String(list.id),
			};
		});

	return { results };
}
