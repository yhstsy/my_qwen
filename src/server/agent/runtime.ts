import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { ChatMessage } from '../../chat.ts';
import { isRecord, validatePlan } from '../../shared/agent.ts';
import type { AgentEvent, AgentEventType, AgentRun, AgentStep, PlanStep, ToolRequest, ToolResult } from '../../shared/agent.ts';
import { defaultTools, ToolError, toolArguments } from './tools.ts';
import type { AgentTool } from './tools.ts';
export interface AgentLimits {
    maxSteps: number;
    maxModelCalls: number;
    maxToolCalls: number;
    maxRevisions: number;
    noProgress: number;
    executionMs: number;
    totalMs: number;
    modelMs: number;
    toolMs: number;
    resultBytes: number;
    observationBytes: number;
}
export const defaultLimits: AgentLimits = { maxSteps: 5, maxModelCalls: 12, maxToolCalls: 6, maxRevisions: 1, noProgress: 3, executionMs: 45000, totalMs: 55000, modelMs: 15000, toolMs: 5000, resultBytes: 8192, observationBytes: 32768 };
export interface ModelContext {
    messages: ChatMessage[];
    run: AgentRun;
    step?: AgentStep;
    requests: ToolRequest[];
    results: ToolResult[];
    lastResults: ToolResult[];
    feedback?: string;
}
export type AgentModel = (phase: 'plan' | 'execute' | 'summarize', context: ModelContext, signal: AbortSignal) => Promise<unknown>;
export class AgentError extends Error {
    code: string;
    retryable: boolean;
    retryAfterMs: number;
    constructor(code: string, message: string, retryable = false, retryAfterMs = 0) { super(message); this.code = code; this.retryable = retryable; this.retryAfterMs = retryAfterMs; }
}
export function bounded<T>(work: (signal: AbortSignal) => Promise<T>, parent: AbortSignal, ms: number): Promise<T> {
    if (parent.aborted)
        return Promise.reject(new AgentError('CANCELLED', '已停止执行。'));
    if (ms <= 0)
        return Promise.reject(new AgentError('TIME_LIMIT', '执行时间已耗尽。'));
    const controller = new AbortController();
    return new Promise<T>((resolve, reject) => {
        const abort = () => { controller.abort(); reject(new AgentError('CANCELLED', '已停止执行。')); };
        const timer = setTimeout(() => { controller.abort(); reject(new AgentError('TIMEOUT', '调用超时。', true)); }, ms);
        parent.addEventListener('abort', abort, { once: true });
        Promise.resolve().then(() => {
            if (controller.signal.aborted)
                throw new AgentError('CANCELLED', '已停止执行。');
            return work(controller.signal);
        }).then(resolve, reject).finally(() => {
            clearTimeout(timer);
            parent.removeEventListener('abort', abort);
        });
        // Clean up even when a supplier ignores cancellation and never settles.
        controller.signal.addEventListener('abort', () => { clearTimeout(timer); parent.removeEventListener('abort', abort); }, { once: true });
    });
}
const cleanText = (value: unknown, max = 4000) => {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new AgentError('INVALID_PROTOCOL', '模型返回的结构化结果无效。', true);
    return value.trim();
};
const planFields = (s: PlanStep) => ({ stepId: s.stepId, title: s.title, goal: s.goal, dependsOn: s.dependsOn, completionCriteria: s.completionCriteria, requiresEvidence: s.requiresEvidence });
const resultError = (error: unknown) => error instanceof ToolError || error instanceof AgentError
    ? { code: error.code, message: error.message, retryable: error.retryable }
    : { code: 'TOOL_FAILED', message: '工具执行失败。', retryable: false };
function describeResult(name: string, output: unknown): string {
    if (name === 'calculate' && isRecord(output) && typeof output.value === 'number')
        return `计算结果：${output.value}`;
    if (name === 'search_context' && isRecord(output) && Array.isArray(output.matches)) {
        const first = output.matches[0];
        return `找到 ${output.matches.length} 条文本片段${isRecord(first) && typeof first.text === 'string' ? `：${first.text.slice(0, 200)}` : '。'}`;
    }
    return JSON.stringify(output).slice(0, 300);
}
export async function runAgent(options: {
    messages: ChatMessage[];
    model: AgentModel;
    signal: AbortSignal;
    emit: (event: AgentEvent) => void | Promise<void>;
    tools?: AgentTool[];
    limits?: Partial<AgentLimits>;
}): Promise<AgentRun> {
    const { messages, model, signal, emit } = options;
    const limits = { ...defaultLimits, ...options.limits };
    const tools = new Map((options.tools || defaultTools).map(tool => [tool.name, tool]));
    const run: AgentRun = { runId: randomUUID(), status: 'planning', steps: [], tools: [], modelCalls: 0, toolCalls: 0, revisions: 0, startedAt: Date.now() };
    const results: ToolResult[] = [];
    const requests: ToolRequest[] = [];
    let lastResults: ToolResult[] = [];
    let seq = 0, noProgress = 0, protocolFailures = 0, observationBytes = 0;
    let feedback: string | undefined;
    let retryNotBefore = 0;
    const knownObservations = new Set<string>();
    const successfulCalls = new Map<string, ToolResult>();
    const publish = async (type: AgentEventType, answer?: string) => emit({ version: 1, runId: run.runId, seq: ++seq, type, run: structuredClone(run), ...(answer ? { answer } : {}) });
    const timeLeft = (final = false) => run.startedAt + (final ? limits.totalMs : limits.executionMs) - Date.now();
    const check = () => {
        if (signal.aborted)
            throw new AgentError('CANCELLED', '已停止执行。');
        if (timeLeft() <= 0)
            throw new AgentError('TIME_LIMIT', '执行时间已耗尽。');
        if (run.modelCalls >= limits.maxModelCalls - 1)
            throw new AgentError('MODEL_LIMIT', '模型调用次数已达上限。');
        if (noProgress >= limits.noProgress)
            throw new AgentError('NO_PROGRESS', '连续多轮没有取得新进展。');
    };
    const invoke = async (phase: 'plan' | 'execute' | 'summarize', step?: AgentStep) => {
        if (phase !== 'summarize')
            check();
        if (signal.aborted)
            throw new AgentError('CANCELLED', '已停止执行。');
        if (run.modelCalls >= limits.maxModelCalls)
            throw new AgentError('MODEL_LIMIT', '模型调用次数已达上限。');
        run.modelCalls++;
        try {
            return await bounded(async s => {
                const wait = retryNotBefore - Date.now();
                if (wait > 0) await delay(wait, undefined, { signal: s });
                return model(phase, { messages, run: structuredClone(run), step: step ? structuredClone(step) : undefined, requests, results, lastResults, feedback }, s);
            }, signal, Math.min(limits.modelMs, timeLeft(phase === 'summarize')));
        } catch (error) {
            if (error instanceof AgentError && error.retryable && error.retryAfterMs > 0)
                retryNotBefore = Date.now() + error.retryAfterMs;
            throw error;
        }
    };
    const installPlan = (value: unknown, revision = false) => {
        const plan = validatePlan(value, limits.maxSteps);
        if (revision) {
            if (run.revisions >= limits.maxRevisions)
                throw new AgentError('REPLAN_LIMIT', '重新规划次数已达上限。');
            for (const old of run.steps.filter(s => s.status === 'succeeded')) {
                const replacement = plan.find(s => s.stepId === old.stepId);
                if (!replacement || JSON.stringify(planFields(old)) !== JSON.stringify(planFields(replacement)))
                    throw new Error('重新规划必须保留已完成步骤。');
            }
            for (const step of plan)
                if (run.steps.some(s => s.stepId === step.stepId && s.status !== 'succeeded'))
                    throw new Error('替换的步骤必须使用新的编号。');
            const archived = run.steps.filter(s => s.status !== 'succeeded').map(s => ({ ...s, status: 'skipped' as const, finishedAt: Date.now() }));
            run.steps = [...archived, ...plan.map(s => run.steps.find(old => old.stepId === s.stepId && old.status === 'succeeded') || { ...s, status: 'pending' as const })];
            run.revisions++;
        }
        else
            run.steps = plan.map(s => ({ ...s, status: 'pending' }));
    };
    await publish('run.started');
    try {
        // The planner gets one repair attempt, counted against the same run budget.
        for (let attempt = 0;; attempt++) {
            try {
                const plan = await invoke('plan');
                installPlan(isRecord(plan) ? plan.steps : undefined);
                break;
            }
            catch (error) {
                if (signal.aborted || attempt >= 1 || error instanceof AgentError && !error.retryable)
                    throw error;
                feedback = '计划无效，请返回合法的 steps 数组，检查依赖与必填字段。';
            }
        }
        feedback = undefined;
        run.status = 'running';
        await publish('plan.created');
        while (run.steps.some(s => !['succeeded', 'skipped'].includes(s.status))) {
            check();
            const step = run.steps.find(s => s.status === 'pending' && s.dependsOn.every(id => run.steps.some(p => p.stepId === id && p.status === 'succeeded')));
            if (!step)
                throw new AgentError('BLOCKED', '没有可执行步骤，任务依赖尚未满足。');
            step.status = 'running';
            step.startedAt = Date.now();
            await publish('step.updated');
            while (step.status === 'running' || step.status === 'waiting_tool') {
                check();
                let decision: unknown;
                try {
                    decision = await invoke('execute', step);
                }
                catch (error) {
                    if (error instanceof AgentError && error.retryable && protocolFailures++ < 1) {
                        feedback = '上次响应失败，请返回有效的结构化决策。';
                        noProgress++;
                        continue;
                    }
                    throw error;
                }
                lastResults = [];
                try {
                    if (!isRecord(decision))
                        throw new Error('决策必须是对象。');
                    if (decision.type === 'call_tools') {
                        if (!Array.isArray(decision.calls) || !decision.calls.length || decision.calls.length > 6)
                            throw new Error('工具请求数量不合法。');
                        // Validate the whole batch before executing any tool.
                        const calls = decision.calls.map(call => {
                            if (!isRecord(call) || typeof call.name !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(call.name))
                                throw new Error('工具名称不合法。');
                            return { name: call.name, arguments: toolArguments(call.arguments) };
                        });
                        step.status = 'waiting_tool';
                        await publish('step.updated');
                        let progressed = false, exhausted = false;
                        for (const call of calls) {
                            const request: ToolRequest = { version: 1, runId: run.runId, stepId: step.stepId, callId: randomUUID(), ...call };
                            requests.push(request);
                            const summary = { callId: request.callId, stepId: step.stepId, name: call.name, status: 'running' as const };
                            run.tools.push(summary);
                            await publish('tool.started');
                            const started = Date.now();
                            let result: ToolResult | undefined;
                            for (let attempt = 0; attempt < 2; attempt++) {
                                try {
                                    if (signal.aborted)
                                        throw new AgentError('CANCELLED', '已停止执行。');
                                    if (run.toolCalls >= limits.maxToolCalls) {
                                        exhausted = true;
                                        throw new AgentError('TOOL_LIMIT', '工具调用次数已达上限。');
                                    }
                                    if (timeLeft() <= 0)
                                        throw new AgentError('TIME_LIMIT', '执行时间已耗尽。');
                                    run.toolCalls++;
                                    const tool = tools.get(call.name);
                                    if (!tool)
                                        throw new ToolError('UNKNOWN_TOOL', '请求的工具未开放。');
                                    const signature = JSON.stringify([call.name, Object.fromEntries(Object.entries(call.arguments).sort(([a], [b]) => a.localeCompare(b)))]);
                                    const cached = successfulCalls.get(signature);
                                    const output = cached?.output ?? await bounded(async (s) => tool.execute(call.arguments, { messages, signal: s }), signal, Math.min(limits.toolMs, timeLeft()));
                                    const serialized = JSON.stringify(output);
                                    if (serialized === undefined)
                                        throw new ToolError('INVALID_RESULT', '工具未返回有效结果。');
                                    if (Buffer.byteLength(serialized) > limits.resultBytes)
                                        throw new ToolError('RESULT_TOO_LARGE', '工具结果超过大小限制。');
                                    if (observationBytes + Buffer.byteLength(serialized) > limits.observationBytes)
                                        throw new AgentError('CONTEXT_LIMIT', '累计工具结果超过上下文限制。');
                                    observationBytes += Buffer.byteLength(serialized);
                                    result = { version: 1, runId: run.runId, stepId: step.stepId, callId: request.callId, status: 'succeeded', output, evidenceIds: [request.callId], durationMs: Date.now() - started };
                                    successfulCalls.set(signature, result);
                                    const observation = JSON.stringify([signature, output]);
                                    if (!knownObservations.has(observation)) {
                                        knownObservations.add(observation);
                                        progressed = true;
                                    }
                                }
                                catch (error) {
                                    const failure = resultError(error);
                                    result = { version: 1, runId: run.runId, stepId: step.stepId, callId: request.callId, status: signal.aborted ? 'cancelled' : 'failed', error: failure, evidenceIds: [], durationMs: Date.now() - started };
                                    if (failure.retryable && attempt === 0 && !signal.aborted && run.toolCalls < limits.maxToolCalls && timeLeft() > 0)
                                        continue;
                                }
                                break;
                            }
                            results.push(result!);
                            lastResults.push(result!);
                            Object.assign(summary, { status: result!.status, summary: result!.status === 'succeeded' ? describeResult(call.name, result!.output) : result!.error!.message });
                            await publish('tool.finished');
                        }
                        if (signal.aborted)
                            throw new AgentError('CANCELLED', '已停止执行。');
                        if (exhausted)
                            throw new AgentError('TOOL_LIMIT', '工具调用次数已达上限，部分请求未执行。');
                        if (lastResults.some(result => result.error?.code === 'CONTEXT_LIMIT'))
                            throw new AgentError('CONTEXT_LIMIT', '累计工具结果超过上下文限制。');
                        step.status = 'running';
                        await publish('step.updated');
                        noProgress = progressed ? 0 : noProgress + 1;
                    }
                    else if (decision.type === 'complete_step') {
                        const output = cleanText(decision.output);
                        const allowedSteps = new Set([step.stepId]);
                        const includeDependencies = (current: AgentStep) => {
                            for (const id of current.dependsOn) {
                                if (!allowedSteps.has(id)) {
                                    allowedSteps.add(id);
                                    const parent = run.steps.find(s => s.stepId === id);
                                    if (parent)
                                        includeDependencies(parent);
                                }
                            }
                        };
                        includeDependencies(step);
                        if (!Array.isArray(decision.evidenceIds) || !decision.evidenceIds.every(id => typeof id === 'string' && results.some(r => r.status === 'succeeded' && r.callId === id && allowedSteps.has(r.stepId))))
                            throw new Error('证据编号无效。');
                        if (step.requiresEvidence && !decision.evidenceIds.length)
                            throw new Error('该步骤必须提供工具证据。');
                        step.output = output;
                        step.evidenceIds = [...decision.evidenceIds] as string[];
                        step.status = 'succeeded';
                        step.finishedAt = Date.now();
                        noProgress = 0;
                        await publish('step.updated');
                    }
                    else if (decision.type === 'revise_plan') {
                        cleanText(decision.reason, 1000);
                        installPlan(decision.steps, true);
                        noProgress = 0;
                        await publish('plan.revised');
                        break;
                    }
                    else if (decision.type === 'blocked') {
                        step.status = 'blocked';
                        step.finishedAt = Date.now();
                        throw new AgentError('BLOCKED', cleanText(decision.message, 1000));
                    }
                    else
                        throw new Error('不支持的决策类型。');
                    protocolFailures = 0;
                    feedback = undefined;
                }
                catch (error) {
                    if (error instanceof AgentError)
                        throw error;
                    noProgress++;
                    if (protocolFailures++ >= 1)
                        throw new AgentError('INVALID_PROTOCOL', '模型连续返回无效决策。');
                    feedback = error instanceof Error ? error.message : '决策格式不正确。';
                }
            }
        }
    }
    catch (error) {
        const cancelled = signal.aborted || error instanceof AgentError && error.code === 'CANCELLED';
        run.status = cancelled ? 'cancelled' : error instanceof AgentError && ['TIME_LIMIT', 'TIMEOUT', 'MODEL_LIMIT', 'TOOL_LIMIT', 'CONTEXT_LIMIT', 'NO_PROGRESS', 'BLOCKED', 'REPLAN_LIMIT'].includes(error.code) ? 'stopped' : 'failed';
        run.stopReason = cancelled ? 'CANCELLED' : error instanceof AgentError ? error.code : 'INVALID_PLAN';
        run.stopMessage = cancelled ? '已停止执行。' : error instanceof AgentError ? error.message : '模型未返回有效计划。';
        for (const step of run.steps) {
            if (step.status === 'running' || step.status === 'waiting_tool') {
                step.status = cancelled ? 'cancelled' : 'failed';
                step.finishedAt = Date.now();
            }
            else if (step.status === 'pending')
                step.status = cancelled ? 'cancelled' : 'blocked';
        }
        for (const tool of run.tools)
            if (tool.status === 'running')
                tool.status = cancelled ? 'cancelled' : 'failed';
    }
    const outcome = run.status === 'running' ? 'completed' : run.status;
    const succeeded = run.steps.filter(s => s.status === 'succeeded');
    let answer = succeeded.map(s => `${s.title}\n${s.output}`).join('\n\n');
    if (outcome === 'completed' || outcome === 'stopped' && succeeded.length > 0) {
        run.status = 'summarizing';
        await publish('step.updated');
        try {
            answer = cleanText(await invoke('summarize'), 16000);
        }
        catch { /* Preserve verified step outputs when final synthesis is unavailable. */ }
    }
    run.status = signal.aborted ? 'cancelled' : outcome;
    if (signal.aborted) {
        run.stopReason = 'CANCELLED';
        run.stopMessage = '已停止执行。';
    }
    answer = answer.slice(0, 14000);
    if (run.status !== 'completed')
        answer += (answer ? '\n\n' : '') + `执行${run.status === 'cancelled' ? '已取消' : run.status === 'failed' ? '失败' : '已停止'}：${run.stopMessage || '任务尚未完成。'} 未完成步骤不会标记为成功。`;
    if (!answer)
        answer = '任务未产生有效结果。';
    await publish('answer.completed', answer);
    run.finishedAt = Date.now();
    await publish('run.finished');
    return run;
}
