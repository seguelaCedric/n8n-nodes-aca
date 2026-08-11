import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
} from 'n8n-workflow';

import { ACA_BASE_URL } from './constants';

/**
 * One authenticated call to the ACA API.
 *
 * Always goes through `httpRequestWithAuthentication` and never reads the
 * credential itself - fetching credentials manually and then building the
 * request by hand is the pattern n8n's linter rejects, and it would duplicate
 * the header logic that already lives in the credential class.
 */
export async function acaApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${ACA_BASE_URL}${endpoint}`,
		headers: { Accept: 'application/json' },
		json: true,
	};

	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;

	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'acaApi',
		options,
	)) as IDataObject;
}

/**
 * Walk every page of a list endpoint.
 *
 * Keyset pagination, so the loop follows `next_cursor` and stops on `has_more`.
 * The page cap is a safety net, not a limit anyone should hit: these helpers back
 * resource pickers and the trigger's own bookkeeping, both of which read tens of
 * rows, not tens of thousands.
 */
export async function acaApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	endpoint: string,
	qs: IDataObject = {},
	maxPages = 20,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let cursor: string | undefined;
	let page = 0;

	do {
		const query: IDataObject = { ...qs, limit: 100 };
		if (cursor) query.cursor = cursor;

		const response = await acaApiRequest.call(this, 'GET', endpoint, undefined, query);
		items.push(...((response.data as IDataObject[]) ?? []));

		cursor = response.has_more === true ? (response.next_cursor as string) : undefined;
		page += 1;
	} while (cursor && page < maxPages);

	return items;
}
