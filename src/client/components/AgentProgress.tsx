import type { AgentRun } from '../../shared/agent.ts';

const runLabels = {planning:'正在规划',running:'正在执行',summarizing:'正在汇总',completed:'已完成',stopped:'已停止',failed:'执行失败',cancelled:'已取消'};
const stepLabels = {pending:'待执行',running:'执行中',waiting_tool:'工具执行中',succeeded:'已完成',failed:'失败',blocked:'受阻',skipped:'已替换',cancelled:'已取消'};
const toolLabels:Record<string,string>={search_context:'检索当前文本',calculate:'计算'};
const reasons:Record<string,string>={TIME_LIMIT:'时间预算耗尽',TIMEOUT:'调用超时',MODEL_LIMIT:'模型调用达到上限',TOOL_LIMIT:'工具调用达到上限',CONTEXT_LIMIT:'上下文达到上限',NO_PROGRESS:'连续多轮没有进展',BLOCKED:'缺少必要材料或依赖',REPLAN_LIMIT:'重新规划达到上限',INVALID_PROTOCOL:'模型决策格式无效',INVALID_PLAN:'计划无效',MODEL_UNAVAILABLE:'模型服务不可用',CANCELLED:'用户停止',INTERRUPTED:'连接中断或页面刷新',UNSAFE_OUTPUT:'不安全的模型输出'};
export function AgentProgress({run}:{run:AgentRun}) {
  return <details className="agent-progress" open={!run.finishedAt}>
    <summary>多步骤执行 · {runLabels[run.status]} <span>{run.steps.filter(step=>step.status==='succeeded').length}/{run.steps.filter(step=>step.status!=='skipped').length} 步骤</span></summary>
    <ol>{run.steps.map(step=><li key={step.stepId} data-status={step.status}>
      <div><strong>{step.title}</strong><span>{stepLabels[step.status]}</span></div>
      <p>{step.completionCriteria}</p>
      {step.output && <p>{step.output}</p>}
      {run.tools.filter(tool=>tool.stepId===step.stepId).map(tool=><p key={tool.callId} className="agent-tool">{toolLabels[tool.name] || tool.name} · {tool.status==='running' ? '执行中' : tool.status==='succeeded' ? '成功' : tool.status==='cancelled' ? '已取消' : '失败'}{tool.summary && `：${tool.summary}`}</p>)}
    </li>)}</ol>
    {run.stopReason && <p role="status">{run.stopMessage || reasons[run.stopReason] || '执行已结束'} 未完成步骤保留实际状态。</p>}
    <small>模型调用 {run.modelCalls} 次 · 工具尝试 {run.toolCalls} 次 · 重新规划 {run.revisions} 次</small>
  </details>;
}
