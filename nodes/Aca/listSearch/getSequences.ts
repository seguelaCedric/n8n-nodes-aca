import { NodeApiError, type ILoadOptionsFunctions, type INodeListSearchResult, type JsonObject } from 'n8n-workflow';

import { acaApiRequestAllItems } from '../shared/transport';

/** Email sequences for the resource picker, labelled with their status. */
export async function getSequences(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let sequences;
	try {
		sequences = await acaApiRequestAllItems.call(this, '/sequences', {}, 5);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Could not load sequences from ACA',
			description: 'Check that the ACA API credential is valid and has not been revoked',
		});
	}

	const needle = filter?.toLowerCase();
	const results = sequences
		.filter((sequence) => !needle || String(sequence.name ?? '').toLowerCase().includes(needle))
		.map((sequence) => ({
			name: `${String(sequence.name ?? 'Untitled')} - ${String(sequence.status ?? 'unknown')}`,
			value: String(sequence.id),
		}));

	return { results };
}
