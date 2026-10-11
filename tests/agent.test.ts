import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { validatePlan, isAgentEvent } from '../src/shared/agent.ts';
import type { AgentEvent, PlanStep } from '../src/shared/agent.ts';
import { runAgent, AgentError } from '../src/server/agent/runtime.ts';
import type { AgentModel, AgentLimits } from '../src/server/agent/runtime.ts';
import { ToolError, defaultTools } from '../src/server/agent/tools.ts';
import type { AgentTool } from '../src/server/agent/tools.ts';
import { createAppServer } from '../src/app-server.ts';
import { createAgentModel } from '../src/server/agent/model.ts';
import { requestAgent } from '../src/client/generation.ts';
import { chatReducer, readConversations } from '../src/client/state.ts';
const step = (id = 's1', dependsOn: string[] = [], requiresEvidence = true): PlanStep => ({ stepId: id, title: `步骤 ${id}`, goal: '计算费用', dependsOn, completionCriteria: '取得真实工具结果', requiresEvidence });
const calculation = { name: 'calculate', arguments: { operation: 'multiply', operands: [120, 3] } };
const complete = (output = '总计 360', evidenceIds: string[] = []) => ({ type: 'complete_step', output, evidenceIds });
async function execute(model: AgentModel, limits: Partial<AgentLimits> = {}, tools?: AgentTool[], controller = new AbortController()) {
    const events: AgentEvent[] = [];
    const run = await runAgent({ messages: [{ role: 'user', content: '产品单价120，购买3件，计算费用' }], model, limits, tools, signal: controller.signal, emit: event => { events.push(event); } });
    return { run, events };
}
const basicModel: AgentModel = async (phase, ctx) => phase === 'plan' ? { steps: [step()] } : phase === 'summarize' ? '总计 360。' :
    ctx.results.length ? complete('总计 360', ctx.results.filter(r => r.status === 'succeeded').map(r => r.callId)) : { type: 'call_tools', calls: [calculation] };
test('agent validates plan DAGs, duplicate IDs, missing dependencies and required fields', () => {
    assert.equal(validatePlan([step('s1'), step('s2', ['s1'])]).length, 2);
    assert.throws(() => validatePlan([step(), step()]));
    assert.throws(() => validatePlan([step('a', ['b'])]));
    assert.throws(() => validatePlan([step('a', ['b']), step('b', ['a'])]));
    assert.throws(() => validatePlan([{ ...step(), requiresEvidence: undefined }]));
});
test('agent completes dependent steps through multiple real tool rounds with ordered snapshots', async () => {
    const { run, events } = await execute(async (phase, ctx) => {
        if (phase === 'plan')
            return { steps: [step('find'), step('cost', ['find'])] };
        if (phase === 'summarize')
            return '已检索单价并计算：360。';
        const own = ctx.results.filter(r => r.stepId === ctx.step!.stepId);
        if (!own.length)
            return { type: 'call_tools', calls: [ctx.step!.stepId === 'find' ? { name: 'search_context', arguments: { query: '单价' } } : calculation] };
        return complete(ctx.step!.stepId === 'find' ? '单价120，数量3' : '总计360', own.map(r => r.callId));
    });
    assert.equal(run.status, 'completed');
    assert.deepEqual(run.steps.map(s => s.status), ['succeeded', 'succeeded']);
    assert.equal(run.toolCalls, 2);
    assert.ok(run.steps[0].finishedAt! <= run.steps[1].startedAt!);
    events.forEach((event, index) => { assert.equal(event.seq, index + 1); assert.ok(isAgentEvent(event)); });
    assert.equal(events[0].run.steps.length, 0, 'snapshots must not mutate');
    assert.equal(events.at(-1)!.type, 'run.finished');
    assert.match(events.find(e => e.answer)?.answer || '', /360/);
});
test('agent returns one correlated result for every batch request including unsupported tools', async () => {
    let observed = 0;
    const { run } = await execute(async (phase, ctx) => {
        if (phase === 'plan')
            return { steps: [step()] };
        if (phase === 'summarize')
            return '360';
        if (!ctx.results.length)
            return { type: 'call_tools', calls: [calculation, { name: 'shell', arguments: { command: 'unsafe' } }] };
        observed = ctx.lastResults.length;
        assert.equal(ctx.lastResults[0].status, 'succeeded');
        assert.equal(ctx.lastResults[1].error?.code, 'UNKNOWN_TOOL');
        assert.notEqual(ctx.lastResults[0].callId, ctx.lastResults[1].callId);
        return complete('360', [ctx.lastResults[0].callId]);
    });
    assert.equal(observed, 2);
    assert.equal(run.status, 'completed');
});
test('agent rejects invented evidence and never marks the step successful', async () => {
    const { run } = await execute(async (phase) => phase === 'plan' ? { steps: [step()] } : complete('伪造', ['fake_id']));
    assert.equal(run.status, 'failed');
    assert.equal(run.stopReason, 'INVALID_PROTOCOL');
    assert.equal(run.steps[0].status, 'failed');
});
test('agent stops repeated identical calls without re-executing the underlying tool', async () => {
    let executions = 0;
    const tool: AgentTool = { name: 'constant', description: '固定结果', parameters: {}, execute: () => { executions++; return { value: 1 }; } };
    const { run } = await execute(async (phase) => phase === 'plan' ? { steps: [step()] } : { type: 'call_tools', calls: [{ name: 'constant', arguments: {} }] }, {}, [tool]);
    assert.equal(run.stopReason, 'NO_PROGRESS');
    assert.equal(executions, 1);
    assert.equal(run.toolCalls, 4);
});
test('agent bounds model calls and returns results for unexecuted calls when the tool budget ends', async () => {
    const limited = await execute(basicModel, { maxModelCalls: 2 });
    assert.equal(limited.run.stopReason, 'MODEL_LIMIT');
    assert.ok(limited.run.modelCalls <= 2);
    const { run } = await execute(async (phase) => phase === 'plan' ? { steps: [step()] } : { type: 'call_tools', calls: [calculation, calculation, calculation] }, { maxToolCalls: 1 });
    assert.equal(run.stopReason, 'TOOL_LIMIT');
    assert.equal(run.toolCalls, 1);
    assert.equal(run.tools.length, 3);
    assert.deepEqual(run.tools.map(t => t.status), ['succeeded', 'failed', 'failed']);
});
test('agent retries transient tool errors once and counts every attempt', async () => {
    let attempts = 0;
    const tool: AgentTool = { name: 'calculate', description: 'test', parameters: {}, execute: () => {
            if (++attempts === 1)
                throw new ToolError('TEMP', '临时错误', true);
            return 360;
        } };
    const { run } = await execute(basicModel, {}, [tool]);
    assert.equal(run.status, 'completed');
    assert.equal(run.toolCalls, 2);
    assert.equal(attempts, 2);
});
test('agent respects supplier backoff and cancels pending retries without another request', async () => {
    const times: number[] = [];
    const { run } = await execute(async (phase, ctx, signal) => {
        times.push(Date.now());
        if (times.length === 1) throw new AgentError('MODEL_UNAVAILABLE', '限流', true, 40);
        return basicModel(phase, ctx, signal);
    });
    assert.equal(run.status, 'completed');
    assert.ok(times[1] - times[0] >= 35);
    const controller = new AbortController();
    let calls = 0;
    const cancelled = await execute(async () => {
        calls++;
        setTimeout(() => controller.abort(), 10);
        throw new AgentError('MODEL_UNAVAILABLE', '限流', true, 1000);
    }, {}, undefined, controller);
    assert.equal(cancelled.run.status, 'cancelled');
    assert.equal(calls, 1);
});
test('supplier Retry-After is preserved without exposing the error body', async () => {
    const server = createServer((_req, res) => {
        res.writeHead(429, { 'Retry-After': '7' });
        res.end('test-private-key');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const model = createAgentModel({ apiKey: 'test-private-key', apiBase: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, model: 'test' });
        await assert.rejects(model('plan', { messages: [], run: { runId: 'test', status: 'planning', steps: [], tools: [], modelCalls: 1, toolCalls: 0, revisions: 0, startedAt: Date.now() }, requests: [], results: [], lastResults: [] }, new AbortController().signal), error => {
            assert.ok(error instanceof AgentError);
            assert.equal(error.retryAfterMs, 7000);
            assert.equal(error.retryable, true);
            assert.doesNotMatch(error.message, /test-private-key/);
            return true;
        });
    } finally {
        server.closeAllConnections();
        await new Promise<void>(resolve => server.close(() => resolve()));
    }
});
test('agent bounds tools that ignore cancellation and oversized observations', async () => {
    const hanging: AgentTool = { name: 'calculate', description: 'test', parameters: {}, execute: () => new Promise(() => { }) };
    const { run } = await execute(async (phase, ctx) => phase === 'plan' ? { steps: [step()] } : ctx.results.length ? { type: 'blocked', message: '工具不可用' } : { type: 'call_tools', calls: [calculation] }, { toolMs: 5 }, [hanging]);
    assert.equal(run.status, 'stopped');
    assert.equal(run.tools[0].status, 'failed');
    assert.equal(run.toolCalls, 2);
    const huge: AgentTool = { name: 'calculate', description: 'test', parameters: {}, execute: () => 'x'.repeat(9000) };
    const large = await execute(async (phase, ctx) => phase === 'plan' ? { steps: [step()] } : ctx.results.length ? { type: 'blocked', message: '结果太大' } : { type: 'call_tools', calls: [calculation] }, {}, [huge]);
    assert.match(large.run.tools[0].summary || '', /大小限制/);
    const context = await execute(basicModel, { observationBytes: 1 });
    assert.equal(context.run.stopReason, 'CONTEXT_LIMIT');
});
test('agent time deadline bounds a model that never settles', async () => {
    const { run } = await execute(() => new Promise(() => { }), { executionMs: 8, totalMs: 15, modelMs: 5 });
    assert.equal(run.status, 'stopped');
    assert.ok(['TIMEOUT', 'TIME_LIMIT'].includes(run.stopReason!));
});
test('agent revises only unfinished steps and preserves completed evidence', async () => {
    const first = step('first', [], false);
    const { run } = await execute(async (phase, ctx) => {
        if (phase === 'plan')
            return { steps: [first, step('old', ['first'], false)] };
        if (phase === 'summarize')
            return '完成修订后的任务。';
        if (ctx.step?.stepId === 'first')
            return complete('第一步结果');
        if (ctx.step?.stepId === 'old')
            return { type: 'revise_plan', reason: '替换剩余步骤', steps: [first, step('new', ['first'], false)] };
        return complete('新步骤结果');
    });
    assert.equal(run.status, 'completed');
    assert.equal(run.revisions, 1);
    assert.equal(run.steps.find(s => s.stepId === 'old')?.status, 'skipped');
    assert.equal(run.steps.find(s => s.stepId === 'first')?.output, '第一步结果');
});
test('agent cancellation aborts active tools and never schedules subsequent steps', async () => {
    const controller = new AbortController();
    let aborted = false;
    const tool: AgentTool = { name: 'calculate', description: 'test', parameters: {}, execute: (_args, ctx) => new Promise((_resolve, reject) => {
            ctx.signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
            controller.abort();
        }) };
    const { run } = await execute(basicModel, {}, [tool], controller);
    assert.equal(run.status, 'cancelled');
    assert.equal(run.steps[0].status, 'cancelled');
    assert.ok(aborted);
    assert.equal(run.tools[0].status, 'cancelled');
});
test('agent cancellation during final synthesis is not reported as completion', async () => {
    const controller = new AbortController();
    const { run } = await execute(async (phase, ctx) => {
        if (phase === 'summarize') {
            controller.abort();
            throw new AgentError('CANCELLED', '取消');
        }
        return basicModel(phase, ctx, controller.signal);
    }, {}, undefined, controller);
    assert.equal(run.status, 'cancelled');
    assert.equal(run.stopReason, 'CANCELLED');
});
test('agent cancellation supplies cancelled results for the remaining batch without execution', async () => {
    const controller = new AbortController();
    let calls = 0;
    const tool: AgentTool = { name: 'calculate', description: 'test', parameters: {}, execute: () => { calls++; controller.abort(); return 360; } };
    const { run } = await execute(async (phase) => phase === 'plan' ? { steps: [step()] } : { type: 'call_tools', calls: [calculation, calculation] }, {}, [tool], controller);
    assert.equal(run.status, 'cancelled');
    assert.equal(calls, 1);
    assert.equal(run.tools.length, 2);
    assert.deepEqual(run.tools.map(t => t.status), ['cancelled', 'cancelled']);
});
test('agent bounds fallback summaries and preserves partial output when synthesis fails', async () => {
    const { run, events } = await execute(async (phase, ctx) => {
        if (phase === 'plan')
            return { steps: [step('a', [], false), step('b', ['a'], false), step('c', ['b'], false), step('d', ['c'], false), step('e', ['d'], false)] };
        if (phase === 'summarize')
            throw new Error('mock unavailable');
        return complete(ctx.step!.stepId + 'x'.repeat(3990));
    });
    assert.equal(run.status, 'completed');
    assert.ok(events.find(e => e.answer)!.answer!.length <= 16000);
    assert.ok(events.every(isAgentEvent));
});
test('agent does not accept evidence from an unrelated step', async () => {
    const { run } = await execute(async (phase, ctx) => {
        if (phase === 'plan')
            return { steps: [step('a'), step('b')] };
        if (!ctx.results.length)
            return { type: 'call_tools', calls: [calculation] };
        return complete('360', [ctx.results[0].callId]);
    });
    assert.equal(run.status, 'failed');
    assert.equal(run.steps.find(s => s.stepId === 'b')!.status, 'failed');
});
test('calculator validates types and zero divisors; context search reports actual sources', async () => {
    const context = { messages: [{ role: 'user' as const, content: '附件价格120' }], signal: new AbortController().signal };
    assert.throws(() => defaultTools[0].execute({ operation: 'divide', operands: [1, 0] }, context));
    assert.throws(() => defaultTools[0].execute({ operation: 'sum', operands: ['process.exit()'] }, context));
    const output = await defaultTools[1].execute({ query: '价格' }, context) as {
        matches: {
            sourceId: string;
            text: string;
        }[];
    };
    assert.equal(output.matches[0].sourceId, 'message_0');
    assert.match(output.matches[0].text, /120/);
});
async function mockProvider(native = false) {
    let nativeRound = 0;
    const seen: Record<string, unknown>[] = [];
    const server = createServer(async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req)
            chunks.push(chunk);
        const body = JSON.parse(Buffer.concat(chunks).toString());
        seen.push(body);
        const contents = body.messages.at(-1).content as string;
        const state = JSON.parse(contents.split('\n').find(line => line.startsWith('{"phase"'))!);
        let content: unknown;
        if (state.phase === 'plan')
            content = { steps: [step()] };
        else if (state.phase === 'summarize')
            content = '总计360。';
        else if (!state.results.length && !native)
            content = { type: 'call_tools', calls: [calculation] };
        else if (native && nativeRound++ === 0) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [1, 2].map(n => ({ id: `provider_${n}`, type: 'function', function: { name: 'calculate', arguments: JSON.stringify(calculation.arguments) } })) } }] }));
            return;
        }
        else if (native) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ choices: [{ message: { content: null, tool_calls: [{ id: 'provider_complete', type: 'function', function: { name: 'complete_step', arguments: JSON.stringify({ output: '总计360', evidenceIds: state.results.filter((r: {status: string}) => r.status === 'succeeded').map((r: {callId: string}) => r.callId) }) } }] } }] }));
            return;
        }
        else
            content = complete('总计360', state.results.filter((r: {
                status: string;
            }) => r.status === 'succeeded').map((r: {
                callId: string;
            }) => r.callId));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    return { server, seen, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}
test('agent HTTP streams JSON decisions, actual tools and terminal results through the existing endpoint', async () => {
    const provider = await mockProvider();
    const app = createAppServer({ apiKey: 'test-agent-key', apiBase: provider.base, agentProtocol: 'json' });
    await new Promise<void>(resolve => app.listen(0, '127.0.0.1', resolve));
    try {
        const base = `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
        const events: AgentEvent[] = [];
        await requestAgent({ history: [{ role: 'user', content: '计算120乘3' }], apiAvailable: true, tool: '', speed: '快速', signal: new AbortController().signal, fetcher: (_input, init) => fetch(base + '/api/chat', init), onEvent: event => events.push(event) });
        assert.equal(events.at(-1)?.run.status, 'completed');
        assert.equal(events.at(-1)?.run.toolCalls, 1);
        assert.doesNotMatch(JSON.stringify(events), /test-agent-key/);
        const invalid = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }], executionMode: 'bad' }) });
        assert.equal(invalid.status, 400);
    }
    finally {
        app.closeAllConnections();
        provider.server.closeAllConnections();
        await Promise.all([new Promise<void>(resolve => app.close(() => resolve())), new Promise<void>(resolve => provider.server.close(() => resolve()))]);
    }
});
test('native tool adapter preserves every provider tool_call_id when returning a batch', async () => {
    const provider = await mockProvider(true);
    try {
        const model = createAgentModel({ apiKey: 'test-native-key', apiBase: provider.base, model: 'test', protocol: 'tools' });
        const { run } = await execute(model);
        assert.equal(run.status, 'completed');
        assert.equal(run.toolCalls, 2);
        const turn = provider.seen.find(body => (body.messages as {
            role: string;
        }[]).some(m => m.role === 'tool'))!;
        const results = (turn.messages as {
            role: string;
            tool_call_id?: string;
        }[]).filter(m => m.role === 'tool');
        assert.deepEqual(results.map(r => r.tool_call_id), ['provider_1', 'provider_2']);
    }
    finally {
        provider.server.closeAllConnections();
        await new Promise<void>(resolve => provider.server.close(() => resolve()));
    }
});
test('agent client decodes split UTF-8 and rejects interrupted, reordered and foreign streams', async () => {
    const { events } = await execute(basicModel);
    async function consume(input: AgentEvent[], split = false) {
        const bytes = new TextEncoder().encode(input.map(e => JSON.stringify(e)).join('\n') + '\n');
        const fetcher: typeof fetch = async () => new Response(new ReadableStream({ start(controller) {
                if (split)
                    for (let i = 0; i < bytes.length; i += 7)
                        controller.enqueue(bytes.slice(i, i + 7));
                else
                    controller.enqueue(bytes);
                controller.close();
            } }), { headers: { 'Content-Type': 'application/x-ndjson' } });
        const received: AgentEvent[] = [];
        await requestAgent({ history: [], apiAvailable: true, tool: '', speed: '快速', signal: new AbortController().signal, fetcher, onEvent: e => received.push(e) });
        return received;
    }
    assert.equal((await consume(events, true)).at(-1)?.run.status, 'completed');
    await assert.rejects(consume(events.slice(0, -1)), /中断/);
    await assert.rejects(consume([events[0], events[2]]), /编号/);
    await assert.rejects(consume([events[0], { ...events[1], runId: 'foreign' }]), /编号/);
});
test('agent reducer rejects late events, preserves terminal metadata and restores interrupted history', async () => {
    const { events } = await execute(basicModel);
    let state = chatReducer({ conversations: [], currentId: null, generation: null }, { type: 'start', id: 'gen', chat: { id: 'chat', title: '测试', messages: [] } });
    for (const event of events)
        state = chatReducer(state, { type: 'agent', id: 'gen', event });
    assert.equal(state.conversations[0].messages[0].agent?.finishedAt, events.at(-1)?.run.finishedAt);
    const terminal = state;
    state = chatReducer(state, { type: 'agent', id: 'gen', event: { ...events[0], seq: 999 } });
    assert.equal(state, terminal);
    state = chatReducer(state, { type: 'cancel' });
    assert.equal(chatReducer(state, { type: 'agent', id: 'gen', event: events[1] }), state);
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify([{ id: 'saved', title: '旧会话', messages: [{ role: 'assistant', content: '', agent: events[1].run }] }]) } });
    try {
        assert.equal(readConversations()[0].messages[0].agent?.stopReason, 'INTERRUPTED');
        assert.match(readConversations()[0].messages[0].content, /中断/);
    }
    finally {
        if (original)
            Object.defineProperty(globalThis, 'localStorage', original);
        else
            Reflect.deleteProperty(globalThis, 'localStorage');
    }
});
