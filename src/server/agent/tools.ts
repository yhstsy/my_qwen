import type { ChatMessage } from '../../chat.ts';
import { isRecord } from '../../shared/agent.ts';
export interface ToolContext {
    messages: ChatMessage[];
    signal: AbortSignal;
}
export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: Record<string, unknown>, context: ToolContext) => unknown | Promise<unknown>;
}
export class ToolError extends Error {
    code: string;
    retryable: boolean;
    constructor(code: string, message: string, retryable = false) { super(message); this.code = code; this.retryable = retryable; }
}
const invalid = () => { throw new ToolError('INVALID_ARGUMENTS', '工具参数格式不正确。'); };
export const defaultTools: AgentTool[] = [
    {
        name: 'calculate', description: '对有限数值进行 sum、subtract、multiply、divide、average 运算；不执行代码。',
        parameters: { type: 'object', properties: { operation: { type: 'string', enum: ['sum', 'subtract', 'multiply', 'divide', 'average'] }, operands: { type: 'array', items: { type: 'number' }, minItems: 1, maxItems: 50 } }, required: ['operation', 'operands'], additionalProperties: false },
        execute(args) {
            const { operation, operands } = args;
            if (Object.keys(args).some(k => !['operation', 'operands'].includes(k)) || typeof operation !== 'string' || !['sum', 'subtract', 'multiply', 'divide', 'average'].includes(operation) ||
                !Array.isArray(operands) || !operands.length || operands.length > 50 || !operands.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e12))
                return invalid();
            if (operation === 'divide' && operands.slice(1).includes(0))
                throw new ToolError('DIVISION_BY_ZERO', '除数不能为零。');
            let value: number;
            if (operation === 'sum' || operation === 'average')
                value = operands.reduce((a: number, b: number) => a + b, 0) / (operation === 'average' ? operands.length : 1);
            else
                value = operands.slice(1).reduce((a: number, b: number) => operation === 'multiply' ? a * b : operation === 'divide' ? a / b : a - b, operands[0]);
            if (!Number.isFinite(value) || Math.abs(value) > 1e15)
                throw new ToolError('RESULT_OUT_OF_RANGE', '计算结果超出支持范围。');
            return { value, arithmetic: 'IEEE-754 double precision' };
        },
    },
    {
        name: 'search_context', description: '检索本次提交的会话及已解析附件文本。仅返回实际存在的片段，不搜索网络或未提交文件。',
        parameters: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 200 } }, required: ['query'], additionalProperties: false },
        execute(args, context) {
            if (Object.keys(args).some(k => k !== 'query') || typeof args.query !== 'string' || !args.query.trim() || args.query.length > 200)
                return invalid();
            const terms = args.query.toLocaleLowerCase().trim().split(/\s+/).slice(0, 8);
            const matches: {
                sourceId: string;
                offset: number;
                text: string;
            }[] = [];
            context.messages.forEach((message, index) => {
                const source = message.content.toLocaleLowerCase();
                const offsets = terms.map(term => source.indexOf(term)).filter(offset => offset >= 0);
                if (offsets.length && matches.length < 5) {
                    const offset = Math.max(0, Math.min(...offsets) - 100);
                    matches.push({ sourceId: `message_${index}`, offset, text: message.content.slice(offset, offset + 600) });
                }
            });
            return { matches, scope: 'submitted_context', found: matches.length };
        },
    },
];
export function toolArguments(value: unknown): Record<string, unknown> {
    if (!isRecord(value) || JSON.stringify(value).length > 4096)
        return invalid();
    return value;
}
