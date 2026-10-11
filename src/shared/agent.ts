export const stepStatuses = ['pending', 'running', 'waiting_tool', 'succeeded', 'failed', 'blocked', 'skipped', 'cancelled'] as const;
export type StepStatus = typeof stepStatuses[number];
export type RunStatus = 'planning' | 'running' | 'summarizing' | 'completed' | 'stopped' | 'failed' | 'cancelled';
export interface PlanStep {
    stepId: string;
    title: string;
    goal: string;
    dependsOn: string[];
    completionCriteria: string;
    requiresEvidence: boolean;
}
export interface AgentStep extends PlanStep {
    status: StepStatus;
    output?: string;
    evidenceIds?: string[];
    startedAt?: number;
    finishedAt?: number;
}
export interface ToolRequest {
    version: 1;
    runId: string;
    stepId: string;
    callId: string;
    name: string;
    arguments: Record<string, unknown>;
}
export interface ToolResult {
    version: 1;
    runId: string;
    stepId: string;
    callId: string;
    status: 'succeeded' | 'failed' | 'cancelled';
    output?: unknown;
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
    evidenceIds: string[];
    durationMs: number;
    truncated?: boolean;
}
export interface ToolSummary {
    callId: string;
    stepId: string;
    name: string;
    status: 'running' | ToolResult['status'];
    summary?: string;
}
export interface AgentRun {
    runId: string;
    status: RunStatus;
    steps: AgentStep[];
    tools: ToolSummary[];
    modelCalls: number;
    toolCalls: number;
    revisions: number;
    startedAt: number;
    finishedAt?: number;
    stopReason?: string;
    stopMessage?: string;
}
export type AgentEventType = 'run.started' | 'plan.created' | 'plan.revised' | 'step.updated' | 'tool.started' | 'tool.finished' | 'answer.completed' | 'run.finished';
export interface AgentEvent {
    version: 1;
    runId: string;
    seq: number;
    type: AgentEventType;
    run: AgentRun;
    answer?: string;
}
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 2000): value is string => typeof value === 'string' && !!value.trim() && value.length <= max;
export const isTerminalRun = (status: RunStatus) => ['completed', 'stopped', 'failed', 'cancelled'].includes(status);
export function validatePlan(value: unknown, maxSteps = 5): PlanStep[] {
    if (!Array.isArray(value) || !value.length || value.length > maxSteps)
        throw new Error('计划步骤数量不合法。');
    const steps: PlanStep[] = value.map(step => {
        if (!isRecord(step) || !text(step.stepId, 64) || !/^[a-zA-Z0-9_-]+$/.test(step.stepId) ||
            !text(step.title, 120) || !text(step.goal) || !text(step.completionCriteria) ||
            !Array.isArray(step.dependsOn) || !step.dependsOn.every(id => text(id, 64)) ||
            typeof step.requiresEvidence !== 'boolean')
            throw new Error('计划步骤格式不正确。');
        return { stepId: step.stepId, title: step.title, goal: step.goal, dependsOn: [...step.dependsOn], completionCriteria: step.completionCriteria, requiresEvidence: step.requiresEvidence };
    });
    const ids = new Set(steps.map(step => step.stepId));
    if (ids.size !== steps.length)
        throw new Error('步骤编号重复。');
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (step: PlanStep) => {
        if (visiting.has(step.stepId))
            throw new Error('计划存在循环依赖。');
        if (visited.has(step.stepId))
            return;
        visiting.add(step.stepId);
        for (const id of step.dependsOn) {
            if (!ids.has(id))
                throw new Error('计划引用了不存在的步骤。');
            visit(steps.find(item => item.stepId === id)!);
        }
        visiting.delete(step.stepId);
        visited.add(step.stepId);
    };
    steps.forEach(visit);
    return steps;
}
export function isAgentRun(value: unknown): value is AgentRun {
    if (!isRecord(value) || !text(value.runId, 100) || !['planning', 'running', 'summarizing', 'completed', 'stopped', 'failed', 'cancelled'].includes(String(value.status)) ||
        !Array.isArray(value.steps) || value.steps.length > 15 || !Array.isArray(value.tools) || value.tools.length > 20 ||
        ![value.modelCalls, value.toolCalls, value.revisions, value.startedAt].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) ||
        (value.stopReason !== undefined && !text(value.stopReason, 2000)) ||
        (value.stopMessage !== undefined && !text(value.stopMessage, 2000)) ||
        (value.finishedAt !== undefined && (typeof value.finishedAt !== 'number' || !Number.isFinite(value.finishedAt))))
        return false;
    return value.steps.every(s => isRecord(s) && text(s.stepId, 64) && text(s.title, 120) && text(s.goal) && text(s.completionCriteria) &&
        typeof s.requiresEvidence === 'boolean' && Array.isArray(s.dependsOn) && s.dependsOn.every(id => text(id, 64)) &&
        stepStatuses.includes(s.status as StepStatus) && (s.output === undefined || text(s.output, 4000)) &&
        (s.evidenceIds === undefined || (Array.isArray(s.evidenceIds) && s.evidenceIds.every(id => text(id, 100))))) &&
        value.tools.every(t => isRecord(t) && text(t.callId, 100) && text(t.stepId, 64) && text(t.name, 64) &&
            ['running', 'succeeded', 'failed', 'cancelled'].includes(String(t.status)) && (t.summary === undefined || typeof t.summary === 'string' && t.summary.length <= 300));
}
export function isAgentEvent(value: unknown): value is AgentEvent {
    return isRecord(value) && value.version === 1 && typeof value.seq === 'number' && Number.isSafeInteger(value.seq) && value.seq > 0 &&
        ['run.started', 'plan.created', 'plan.revised', 'step.updated', 'tool.started', 'tool.finished', 'answer.completed', 'run.finished'].includes(String(value.type)) &&
        isAgentRun(value.run) && value.runId === value.run.runId && (value.answer === undefined || text(value.answer, 16000));
}
