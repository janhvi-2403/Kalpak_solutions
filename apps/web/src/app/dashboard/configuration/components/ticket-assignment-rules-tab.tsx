'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Play,
  Sparkles,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
} from '@/components/ui';
import { ServiceCategoryItem, PriorityItem } from './service-categories-tab';

export interface AssignmentRuleItem {
  id: string;
  name: string;
  description: string;
  priorityOrder: number;
  isActive: boolean;
  conditions: {
    category?: string;
    subcategory?: string;
    issueType?: string;
    priority?: string;
  };
  target: {
    departmentId: string;
    departmentName: string;
    assigneeName?: string;
  };
}

interface TicketAssignmentRulesTabProps {
  rules: AssignmentRuleItem[];
  departments: Array<{ id: string; name: string }>;
  categories: ServiceCategoryItem[];
  priorities: PriorityItem[];
  onSaveRules: (updated: AssignmentRuleItem[]) => Promise<void>;
  isSaving: boolean;
}

export function TicketAssignmentRulesTab({
  rules,
  departments,
  categories,
  priorities,
  onSaveRules,
  isSaving,
}: TicketAssignmentRulesTabProps) {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleOrder, setRuleOrder] = useState<number>(1);
  const [ruleCategory, setRuleCategory] = useState<string>('ANY');
  const [rulePriority, setRulePriority] = useState<string>('ANY');
  const [ruleIssueType, setRuleIssueType] = useState<string>('ANY');
  const [ruleTargetDeptId, setRuleTargetDeptId] = useState<string>('');
  const [ruleTargetAssignee, setRuleTargetAssignee] = useState<string>('');
  const [ruleStatus, setRuleStatus] = useState<boolean>(true);

  // Simulator State
  const [simCategory, setSimCategory] = useState<string>(categories[0]?.name || 'Mechanical Breakdown');
  const [simPriority, setSimPriority] = useState<string>('CRITICAL');
  const [simIssueType, setSimIssueType] = useState<string>('Machine Breakdown');
  const [simResult, setSimResult] = useState<{
    matchedRule: AssignmentRuleItem | null;
    routedDepartment: string;
    routedAssignee: string;
    slaHours: number;
  } | null>(null);

  // --------------------------------------------------------------------------
  // Rule Modals & Handlers
  // --------------------------------------------------------------------------
  const openAddRuleModal = () => {
    setEditingRuleId(null);
    setRuleName('');
    setRuleDescription('');
    setRuleOrder(rules.length + 1);
    setRuleCategory('ANY');
    setRulePriority('ANY');
    setRuleIssueType('ANY');
    setRuleTargetDeptId(departments[0]?.id || '');
    setRuleTargetAssignee('Department Head (Auto-dispatch)');
    setRuleStatus(true);
    setIsModalOpen(true);
  };

  const openEditRuleModal = (rule: AssignmentRuleItem) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setRuleOrder(rule.priorityOrder);
    setRuleCategory(rule.conditions.category || 'ANY');
    setRulePriority(rule.conditions.priority || 'ANY');
    setRuleIssueType(rule.conditions.issueType || 'ANY');
    setRuleTargetDeptId(rule.target.departmentId);
    setRuleTargetAssignee(rule.target.assigneeName || 'Department Head');
    setRuleStatus(rule.isActive);
    setIsModalOpen(true);
  };

  const handleSaveRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      alert('Please enter a rule name.');
      return;
    }

    const targetDept = departments.find((d) => d.id === ruleTargetDeptId) || departments[0];

    const conditions: AssignmentRuleItem['conditions'] = {};
    if (ruleCategory !== 'ANY') conditions.category = ruleCategory;
    if (rulePriority !== 'ANY') conditions.priority = rulePriority;
    if (ruleIssueType !== 'ANY') conditions.issueType = ruleIssueType;

    let updated: AssignmentRuleItem[];
    if (editingRuleId) {
      updated = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              name: ruleName.trim(),
              description: ruleDescription.trim(),
              priorityOrder: ruleOrder,
              isActive: ruleStatus,
              conditions,
              target: {
                departmentId: targetDept?.id || 'dept-1',
                departmentName: targetDept?.name || 'Operations',
                assigneeName: ruleTargetAssignee.trim() || 'Department Head',
              },
            }
          : r
      );
    } else {
      const newRule: AssignmentRuleItem = {
        id: 'rule_' + Date.now(),
        name: ruleName.trim(),
        description: ruleDescription.trim(),
        priorityOrder: ruleOrder,
        isActive: ruleStatus,
        conditions,
        target: {
          departmentId: targetDept?.id || 'dept-1',
          departmentName: targetDept?.name || 'Operations',
          assigneeName: ruleTargetAssignee.trim() || 'Department Head',
        },
      };
      updated = [...rules, newRule];
    }

    // Sort by priority order
    updated.sort((a, b) => a.priorityOrder - b.priorityOrder);
    await onSaveRules(updated);
    setIsModalOpen(false);
  };

  const handleDeleteRule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete assignment rule "${name}"?`)) return;
    const updated = rules.filter((r) => r.id !== id);
    await onSaveRules(updated);
  };

  const handleToggleRuleStatus = async (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    await onSaveRules(updated);
  };

  const handleMoveOrder = async (index: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && index === 0) return;
    if (direction === 'DOWN' && index === rules.length - 1) return;

    const copy = [...rules];
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const temp = copy[index]!;
    copy[index] = copy[targetIdx]!;
    copy[targetIdx] = temp;

    // Re-index priorityOrder
    const updated = copy.map((r, i) => ({ ...r, priorityOrder: i + 1 }));
    await onSaveRules(updated);
  };

  // --------------------------------------------------------------------------
  // Live Simulator Test
  // --------------------------------------------------------------------------
  const runSimulation = () => {
    // Evaluate active rules in order
    const activeRules = rules
      .filter((r) => r.isActive)
      .sort((a, b) => a.priorityOrder - b.priorityOrder);

    let match: AssignmentRuleItem | null = null;

    for (const r of activeRules) {
      const catMatch = !r.conditions.category || r.conditions.category === simCategory;
      const priMatch = !r.conditions.priority || r.conditions.priority === simPriority;
      const issueMatch = !r.conditions.issueType || r.conditions.issueType === simIssueType;

      if (catMatch && priMatch && issueMatch) {
        match = r;
        break;
      }
    }

    const priorityObj = priorities.find((p) => p.level === simPriority);
    const slaHours = priorityObj?.resolutionTargetHours || 24;

    if (match) {
      setSimResult({
        matchedRule: match,
        routedDepartment: match.target.departmentName,
        routedAssignee: match.target.assigneeName || 'Department Lead',
        slaHours,
      });
    } else {
      setSimResult({
        matchedRule: null,
        routedDepartment: departments[0]?.name || 'General Operations',
        routedAssignee: 'Round-Robin Default Allocation',
        slaHours,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Ticket Assignment Rules ── */}
      <Card className="border border-slate-200/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Automated Ticket Routing &amp; Assignment Rules
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules are evaluated sequentially from top to bottom. The first matching rule automatically assigns the ticket to the specified department and technician.
            </p>
          </div>

          <Button
            size="sm"
            onClick={openAddRuleModal}
            className="text-xs font-semibold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Assignment Rule</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-2">
          {rules.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No rules configured. Click &quot;Create Assignment Rule&quot; to define automated department routing.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.isActive
                      ? 'bg-white border-slate-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Priority Order & Movement */}
                      <div className="flex flex-col items-center justify-center bg-slate-100 rounded-lg p-1 text-[10px] font-mono font-bold text-slate-600 shrink-0">
                        <button
                          onClick={() => handleMoveOrder(idx, 'UP')}
                          disabled={idx === 0}
                          className="hover:text-orange-600 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <span>#{rule.priorityOrder}</span>
                        <button
                          onClick={() => handleMoveOrder(idx, 'DOWN')}
                          disabled={idx === rules.length - 1}
                          className="hover:text-orange-600 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{rule.name}</h4>
                          <span
                            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              rule.isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{rule.description}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditRuleModal(rule)}
                        className="text-xs h-7 gap-1 text-slate-700"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleRuleStatus(rule.id)}
                        className="text-xs h-7 text-slate-600 hover:text-slate-900"
                      >
                        {rule.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        className="text-xs h-7 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Criteria & Action Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    {/* Conditions */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
                        WHEN:
                      </span>
                      {rule.conditions.category ? (
                        <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Category: {rule.conditions.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Any Category</span>
                      )}

                      {rule.conditions.priority && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Priority: {rule.conditions.priority}
                        </span>
                      )}

                      {rule.conditions.issueType && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                          Issue: {rule.conditions.issueType}
                        </span>
                      )}
                    </div>

                    {/* Routing Target */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                        ROUTED TO:
                      </span>
                      <span className="font-bold text-slate-900 text-[11px]">
                        {rule.target.departmentName}
                      </span>
                      {rule.target.assigneeName && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({rule.target.assigneeName})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Interactive Rule Simulator & Tester ── */}
      <Card className="border border-slate-200/80 shadow-xs bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardHeader className="pb-3 border-b border-slate-700/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <CardTitle className="text-sm font-bold text-white">
                Live Ticket Matcher &amp; Assignment Simulator
              </CardTitle>
            </div>
            <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
              Rule Testing Engine
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Test how incoming tickets will be classified, which rule takes precedence, and which department is assigned.
          </p>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Sample Category
              </label>
              <select
                value={simCategory}
                onChange={(e) => setSimCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Sample Priority
              </label>
              <select
                value={simPriority}
                onChange={(e) => setSimPriority(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400 font-semibold"
              >
                <option value="CRITICAL">P1 - Critical</option>
                <option value="HIGH">P2 - High</option>
                <option value="MEDIUM">P3 - Medium</option>
                <option value="LOW">P4 - Low</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Sample Issue Type
              </label>
              <input
                type="text"
                value={simIssueType}
                onChange={(e) => setSimIssueType(e.target.value)}
                placeholder="e.g. Electrical Short Circuit"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
              >
              </input>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              onClick={runSimulation}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Ticket Routing</span>
            </Button>
          </div>

          {/* Simulation Result */}
          {simResult && (
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center gap-1.5 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ROUTING SIMULATION RESULT:
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {simResult.matchedRule ? `Matched Rule #${simResult.matchedRule.priorityOrder}` : 'Fallback Rule'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Department</span>
                  <span className="font-bold text-white text-sm">{simResult.routedDepartment}</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">Assigned Technician</span>
                  <span className="font-bold text-white text-sm">{simResult.routedAssignee}</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-mono">SLA Resolution Target</span>
                  <span className="font-bold text-orange-400 text-sm">&le; {simResult.slaHours} Hours</span>
                </div>
              </div>

              {simResult.matchedRule && (
                <p className="text-[11px] text-slate-300 pt-1">
                  Triggered by rule: <strong className="text-white">&quot;{simResult.matchedRule.name}&quot;</strong>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal: Add / Edit Assignment Rule ── */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRuleId ? 'Edit Assignment Rule' : 'Create Ticket Assignment Rule'}
        description="Configure matching criteria and designate the target service department and technician."
      >
        <form onSubmit={handleSaveRuleSubmit} className="space-y-4 mt-3 max-h-[75vh] overflow-y-auto pr-1">
          <Input
            id="rule-name"
            label="Rule Name *"
            required
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="e.g. Critical Electrical Failures Auto-Route"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Business Reason
            </label>
            <textarea
              rows={2}
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Why this ticket type routes to this department..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Evaluation Priority Order
              </label>
              <input
                type="number"
                min={1}
                value={ruleOrder}
                onChange={(e) => setRuleOrder(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 outline-none focus:border-orange-500"
              />
              <span className="text-[10px] text-slate-400">Lower numbers evaluate first</span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Match Priority Level
              </label>
              <select
                value={rulePriority}
                onChange={(e) => setRulePriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
              >
                <option value="ANY">Any Priority</option>
                <option value="CRITICAL">P1 - Critical</option>
                <option value="HIGH">P2 - High</option>
                <option value="MEDIUM">P3 - Medium</option>
                <option value="LOW">P4 - Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Match Service Category
              </label>
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
              >
                <option value="ANY">Any Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Match Issue Type
              </label>
              <input
                type="text"
                value={ruleIssueType}
                onChange={(e) => setRuleIssueType(e.target.value)}
                placeholder="ANY or specific issue (e.g. Oil Leakage)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Action Destination */}
          <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-3 text-xs">
            <span className="font-bold text-orange-800 text-[11px] uppercase tracking-wider font-mono block">
              Routing Action Target
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Target Department *
                </label>
                <select
                  value={ruleTargetDeptId}
                  onChange={(e) => setRuleTargetDeptId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500 font-bold"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Assignee Staff / Lead Role
                </label>
                <input
                  type="text"
                  value={ruleTargetAssignee}
                  onChange={(e) => setRuleTargetAssignee(e.target.value)}
                  placeholder="e.g. Senior Specialist (Lead)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={ruleStatus}
                onChange={(e) => setRuleStatus(e.target.checked)}
                className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
              />
              <span>Enable this Rule for Live Inflow Processing</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {isSaving ? 'Saving...' : editingRuleId ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
