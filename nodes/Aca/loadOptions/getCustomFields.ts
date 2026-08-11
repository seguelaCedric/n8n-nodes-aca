import {
	NodeApiError,
	type ILoadOptionsFunctions,
	type INodePropertyOptions,
	type JsonObject,
} from 'n8n-workflow';

import { acaApiRequest } from '../shared/transport';

/**
 * The organisation's custom field definitions, for the field picker.
 *
 * Typing a key by hand is how you end up writing `linked_in` on half your
 * contacts and `linkedin` on the rest, with nothing to tell you: `custom_fields`
 * is a free-form object, so an invented key stores happily and matches nothing
 * later. Reading the definitions makes the valid set the only set on offer.
 *
 * The label carries the type because it decides what a sensible value looks
 * like - a `select` will only ever accept one of its own options.
 */
export async function getCustomFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let response;
	try {
		response = await acaApiRequest.call(this, 'GET', '/custom-fields');
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Could not load custom fields from ACA',
			description: 'Check that the ACA API credential is valid and has not been revoked',
		});
	}

	const definitions = (response.data ?? []) as Array<Record<string, unknown>>;

	return definitions.map((definition) => {
		const key = String(definition.field_key);
		const label = String(definition.display_name || key);
		const type = String(definition.field_type || 'text');
		const options = Array.isArray(definition.options) ? definition.options : [];

		return {
			name: `${label} (${type})`,
			value: key,
			description: options.length
				? `Accepts: ${options.join(', ')}`
				: String(definition.description || ''),
		};
	});
}
