declare module 'lua-json' {
	import { ParseError, Comment } from 'luaparse';

	type LuaJsonValue = string | number | boolean | null | LuaJsonArray | LuaJsonObject;
	interface LuaJsonArray extends Array<LuaJsonValue> {}
	interface LuaJsonObject {
		[key: string]: LuaJsonValue;
	}

	interface LuaJsonOptions {
		eol?: string;
		singleQuote?: boolean;
		spaces?: number | string;
	}

	function formatLuaString(string: string, singleQuote: boolean): string;
	function formatLuaKey(string: string, singleQuote: boolean): string;
	function format(value: LuaJsonValue, options?: LuaJsonOptions): string;
	function luaAstToJson(ast: any): LuaJsonValue;
	function parseLua(value: string, options?: { comments?: boolean }): any;

	export function parse(value: string): LuaJsonValue;
	export { format, parseLua, luaAstToJson };
}
