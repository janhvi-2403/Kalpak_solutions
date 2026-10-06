'use client';

import React, { useState } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Sliders,
  X,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Dialog,
  Input,
} from '@/components/ui';

export interface ServiceCategoryItem {
  id: string;
  name: string;
  code: string;
  description: string;
  subcategories: string[];
  issueTypes: string[];
  isActive: boolean;
}

export interface PriorityItem {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
  responseTargetHours: number;
  resolutionTargetHours: number;
  color: string;
  description: string;
}

interface ServiceCategoriesTabProps {
  categories: ServiceCategoryItem[];
  priorities: PriorityItem[];
  onSaveCategories: (updated: ServiceCategoryItem[]) => Promise<void>;
  onSavePriorities: (updated: PriorityItem[]) => Promise<void>;
  isSaving: boolean;
}

export function ServiceCategoriesTab({
  categories,
  priorities,
  onSaveCategories,
  onSavePriorities,
  isSaving,
}: ServiceCategoriesTabProps) {
  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSubcategories, setCatSubcategories] = useState<string[]>([]);
  const [catIssueTypes, setCatIssueTypes] = useState<string[]>([]);
  const [newSubcatInput, setNewSubcatInput] = useState('');
  const [newIssueTypeInput, setNewIssueTypeInput] = useState('');
  const [catStatus, setCatStatus] = useState<boolean>(true);

  // Priority SLA Modal State
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [editingPriorities, setEditingPriorities] = useState<PriorityItem[]>([]);

  // --------------------------------------------------------------------------
  // Category Handlers
  // --------------------------------------------------------------------------
  const openAddCategoryModal = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatCode('');
    setCatDescription('');
    setCatSubcategories(['General']);
    setCatIssueTypes(['Breakdown', 'Repair']);
    setNewSubcatInput('');
    setNewIssueTypeInput('');
    setCatStatus(true);
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ServiceCategoryItem) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatCode(cat.code);
    setCatDescription(cat.description);
    setCatSubcategories([...cat.subcategories]);
    setCatIssueTypes([...cat.issueTypes]);
    setNewSubcatInput('');
    setNewIssueTypeInput('');
    setCatStatus(cat.isActive);
    setIsCategoryModalOpen(true);
  };

  const handleAddSubcat = () => {
    if (!newSubcatInput.trim()) return;
    if (!catSubcategories.includes(newSubcatInput.trim())) {
      setCatSubcategories([...catSubcategories, newSubcatInput.trim()]);
    }
    setNewSubcatInput('');
  };

  const handleRemoveSubcat = (sub: string) => {
    setCatSubcategories(catSubcategories.filter((s) => s !== sub));
  };

  const handleAddIssueType = () => {
    if (!newIssueTypeInput.trim()) return;
    if (!catIssueTypes.includes(newIssueTypeInput.trim())) {
      setCatIssueTypes([...catIssueTypes, newIssueTypeInput.trim()]);
    }
    setNewIssueTypeInput('');
  };

  const handleRemoveIssueType = (issue: string) => {
    setCatIssueTypes(catIssueTypes.filter((i) => i !== issue));
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catCode.trim()) {
      alert('Please enter a valid Category Name and Category Code.');
      return;
    }

    let updated: ServiceCategoryItem[];
    if (editingCategoryId) {
      updated = categories.map((c) =>
        c.id === editingCategoryId
          ? {
              ...c,
              name: catName.trim(),
              code: catCode.trim().toUpperCase(),
              description: catDescription.trim(),
              subcategories: catSubcategories,
              issueTypes: catIssueTypes,
              isActive: catStatus,
            }
          : c
      );
    } else {
      const newCat: ServiceCategoryItem = {
        id: 'cat_' + Date.now(),
        name: catName.trim(),
        code: catCode.trim().toUpperCase(),
        description: catDescription.trim(),
        subcategories: catSubcategories.length > 0 ? catSubcategories : ['General'],
        issueTypes: catIssueTypes.length > 0 ? catIssueTypes : ['General Issue'],
        isActive: catStatus,
      };
      updated = [...categories, newCat];
    }

    await onSaveCategories(updated);
    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    const updated = categories.filter((c) => c.id !== id);
    await onSaveCategories(updated);
  };

  const handleToggleCategoryStatus = async (id: string) => {
    const updated = categories.map((c) =>
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    await onSaveCategories(updated);
  };

  // --------------------------------------------------------------------------
  // Priority SLA Handlers
  // --------------------------------------------------------------------------
  const openEditPriorityModal = () => {
    setEditingPriorities(JSON.parse(JSON.stringify(priorities)));
    setIsPriorityModalOpen(true);
  };

  const handlePrioritySlaChange = (
    level: string,
    field: 'responseTargetHours' | 'resolutionTargetHours',
    value: number
  ) => {
    setEditingPriorities((prev) =>
      prev.map((p) => (p.level === level ? { ...p, [field]: Math.max(1, value) } : p))
    );
  };

  const handleSavePrioritiesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePriorities(editingPriorities);
    setIsPriorityModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Section 1: Priorities & SLA Response / Resolution Targets ── */}
      <Card className="border border-slate-200/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Ticket Priorities &amp; Target SLA Deadlines
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service Level Agreement (SLA) response and resolution time commitments configured across severity tiers.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={openEditPriorityModal}
            className="text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Sliders className="w-3.5 h-3.5 text-orange-500" />
            <span>Configure SLA Targets</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {priorities.map((pri) => (
              <div
                key={pri.level}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${pri.color}`}
                  >
                    {pri.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    {pri.level}
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">First Response SLA:</span>
                    <span className="font-mono font-bold text-slate-800">
                      &le; {pri.responseTargetHours} hr{pri.responseTargetHours > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Resolution SLA:</span>
                    <span className="font-mono font-bold text-orange-600">
                      &le; {pri.resolutionTargetHours} hr{pri.resolutionTargetHours > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-tight pt-1 border-t border-slate-200/60">
                  {pri.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Service Categories, Subcategories & Issue Types ── */}
      <Card className="border border-slate-200/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Ticket Service Categories &amp; Issue Classifications
              </CardTitle>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Define operational categories, granular subcategories, and specific technical issue types used for logging and routing tickets.
            </p>
          </div>

          <Button
            size="sm"
            onClick={openAddCategoryModal}
            className="text-xs font-semibold gap-1.5 bg-orange-500 hover:bg-orange-600 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service Category</span>
          </Button>
        </CardHeader>

        <CardContent className="pt-2">
          {categories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No categories configured yet. Click &quot;Add Service Category&quot; to create your first category.
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    cat.isActive
                      ? 'bg-white border-slate-200 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 px-2 py-1 rounded-md">
                        {cat.code}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                          <Badge
                            variant={cat.isActive ? 'primary' : 'neutral'}
                            className="text-[10px] font-mono uppercase"
                          >
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditCategoryModal(cat)}
                        className="text-xs h-8 gap-1 text-slate-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleCategoryStatus(cat.id)}
                        className="text-xs h-8 text-slate-600 hover:text-slate-900"
                      >
                        {cat.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-xs h-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Subcategories & Issue Types Tags */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block mb-1.5 text-[11px] uppercase tracking-wider font-mono">
                        Subcategories ({cat.subcategories.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium px-2 py-0.5 rounded-md"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-700 block mb-1.5 text-[11px] uppercase tracking-wider font-mono">
                        Handled Issue Types ({cat.issueTypes.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.issueTypes.map((issue) => (
                          <span
                            key={issue}
                            className="bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium px-2 py-0.5 rounded-md"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Modal: Add / Edit Category ── */}
      <Dialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategoryId ? 'Edit Service Category' : 'Add New Service Category'}
        description="Configure category code, description, subcategories, and handled issue types for customer ticket logging."
      >
        <form onSubmit={handleSaveCategorySubmit} className="space-y-4 mt-3 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                id="cat-modal-name"
                label="Category Name *"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Mechanical Breakdown"
              />
            </div>
            <div>
              <Input
                id="cat-modal-code"
                label="Code Prefix *"
                required
                value={catCode}
                onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                placeholder="e.g. MECH"
                helperText="Short identifier"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Scope
            </label>
            <textarea
              rows={2}
              value={catDescription}
              onChange={(e) => setCatDescription(e.target.value)}
              placeholder="What equipment, breakdowns, or service calls belong in this category..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Subcategories Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subcategories ({catSubcategories.length})
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubcatInput}
                onChange={(e) => setNewSubcatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubcat();
                  }
                }}
                placeholder="Type subcategory name (e.g. Gearbox Assembly) and press Add..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-500"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddSubcat}
                className="text-xs"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
              {catSubcategories.map((sub) => (
                <span
                  key={sub}
                  className="bg-white border border-slate-200 text-slate-700 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <span>{sub}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubcat(sub)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Issue Types Editor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Handled Issue Types ({catIssueTypes.length})
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newIssueTypeInput}
                onChange={(e) => setNewIssueTypeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIssueType();
                  }
                }}
                placeholder="Type issue type (e.g. Oil Leakage) and press Add..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-orange-500"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddIssueType}
                className="text-xs"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
              {catIssueTypes.map((issue) => (
                <span
                  key={issue}
                  className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                >
                  <span>{issue}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveIssueType(issue)}
                    className="text-blue-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={catStatus}
                onChange={(e) => setCatStatus(e.target.checked)}
                className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
              />
              <span>Enable this Category for Customer Ticket Submission</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {isSaving ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ── Modal: Configure Priority SLA Targets ── */}
      <Dialog
        isOpen={isPriorityModalOpen}
        onClose={() => setIsPriorityModalOpen(false)}
        title="Configure SLA Response & Resolution Target Hours"
        description="Set the contractual SLA target limits for each severity level. Tickets breaching these targets will be flagged as Overdue."
      >
        <form onSubmit={handleSavePrioritiesSubmit} className="space-y-4 mt-3">
          <div className="space-y-3">
            {editingPriorities.map((pri) => (
              <div
                key={pri.level}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-bold">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${pri.color}`}>
                    {pri.label}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{pri.level}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                      Response Target (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={pri.responseTargetHours}
                      onChange={(e) =>
                        handlePrioritySlaChange(
                          pri.level,
                          'responseTargetHours',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1 text-[11px]">
                      Resolution Target (Hours)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={pri.resolutionTargetHours}
                      onChange={(e) =>
                        handlePrioritySlaChange(
                          pri.level,
                          'resolutionTargetHours',
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-orange-600 outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPriorityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              {isSaving ? 'Saving...' : 'Apply SLA Targets'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
