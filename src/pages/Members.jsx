import React, { useState } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Users, Plus, Search, Phone, Edit2, Trash2, X, 
  Music, Cake, Award, Mic, Settings2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

const INSTRUMENT_POSITIONS = ['드럼', '베이스기타', '일렉기타', '어쿠스틱기타', '메인건반', '세컨건반'];
const SINGER_POSITIONS = ['여성싱어', '남성싱어'];
const OTHER_POSITIONS = ['엔지니어', '인도자'];
const ALL_POSITIONS = [...INSTRUMENT_POSITIONS, ...SINGER_POSITIONS, ...OTHER_POSITIONS];

const EXECUTIVE_ROLES = ['팀장', '파트장', '총무', '회계', '서기'];

const positionColors = {
  '드럼': 'bg-orange-100 text-orange-700',
  '베이스기타': 'bg-emerald-100 text-emerald-700',
  '일렉기타': 'bg-red-100 text-red-700',
  '어쿠스틱기타': 'bg-amber-100 text-amber-700',
  '메인건반': 'bg-blue-100 text-blue-700',
  '세컨건반': 'bg-cyan-100 text-cyan-700',
  '여성싱어': 'bg-pink-100 text-pink-700',
  '남성싱어': 'bg-indigo-100 text-indigo-700',
  '엔지니어': 'bg-slate-100 text-slate-700',
  '인도자': 'bg-purple-100 text-purple-700',
};

const executiveColors = {
  '팀장': 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  '파트장': 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white',
  '총무': 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white',
  '회계': 'bg-gradient-to-r from-pink-400 to-rose-500 text-white',
  '서기': 'bg-gradient-to-r from-purple-400 to-violet-500 text-white',
};

const currentYear = new Date().getFullYear();

export default function Members() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('members');
  const [formData, setFormData] = useState({
    name: '',
    positions: [],
    executive_roles: [],
    phone: '',
    birthday: '',
    is_active: true
  });
  const [newExecutiveRole, setNewExecutiveRole] = useState({ year: currentYear, role: '' });

  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Member.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Member.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Member.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeleteConfirm(null);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingMember(null);
    setFormData({
      name: '',
      positions: [],
      executive_roles: [],
      phone: '',
      birthday: '',
      is_active: true
    });
    setNewExecutiveRole({ year: currentYear, role: '' });
  };

  const openEditDialog = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      positions: member.positions || [],
      executive_roles: member.executive_roles || [],
      phone: member.phone || '',
      birthday: member.birthday || '',
      is_active: member.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const togglePosition = (position) => {
    setFormData(prev => ({
      ...prev,
      positions: prev.positions.includes(position)
        ? prev.positions.filter(p => p !== position)
        : [...prev.positions, position]
    }));
  };

  const addExecutiveRole = () => {
    if (newExecutiveRole.role) {
      setFormData(prev => ({
        ...prev,
        executive_roles: [...prev.executive_roles, { ...newExecutiveRole }]
      }));
      setNewExecutiveRole({ year: currentYear, role: '' });
    }
  };

  const removeExecutiveRole = (index) => {
    setFormData(prev => ({
      ...prev,
      executive_roles: prev.executive_roles.filter((_, i) => i !== index)
    }));
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = filterPosition === 'all' || member.positions?.includes(filterPosition);
    return matchesSearch && matchesPosition;
  });

  // Get current year executives
  const currentYearExecutives = members.filter(member => 
    member.executive_roles?.some(role => role.year === currentYear)
  );

  // Group members by position category
  const instrumentMembers = filteredMembers.filter(m => m.positions?.some(p => INSTRUMENT_POSITIONS.includes(p)));
  const singerMembers = filteredMembers.filter(m => m.positions?.some(p => SINGER_POSITIONS.includes(p)));
  const otherMembers = filteredMembers.filter(m => 
    m.positions?.some(p => OTHER_POSITIONS.includes(p)) && 
    !m.positions?.some(p => [...INSTRUMENT_POSITIONS, ...SINGER_POSITIONS].includes(p))
  );

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="팀원 관리"
        description="히엘찬양팀 팀원들을 관리합니다"
        icon={Users}
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            팀원 추가
          </Button>
        }
      />

      {/* Current Year Executive Board */}
      {currentYearExecutives.length > 0 && (
        <Card className="mb-8 border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5" />
              {currentYear}년 임원단
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {EXECUTIVE_ROLES.map(role => {
                const executive = currentYearExecutives.find(m => 
                  m.executive_roles?.some(r => r.year === currentYear && r.role === role)
                );
                return (
                  <div key={role} className="text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold shadow-lg",
                      executive ? executiveColors[role] : 'bg-slate-200 text-slate-400'
                    )}>
                      {executive ? executive.name?.[0] : '?'}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{executive?.name || '미정'}</p>
                    <p className="text-xs text-slate-500">{role}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="이름으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="포지션 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 포지션</SelectItem>
            {ALL_POSITIONS.map(position => (
              <SelectItem key={position} value={position}>{position}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members by Category */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-32 bg-slate-100 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="등록된 팀원이 없습니다"
          description="새로운 팀원을 추가해주세요"
          actionLabel="팀원 추가"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="members">전체</TabsTrigger>
            <TabsTrigger value="instrument">악기팀</TabsTrigger>
            <TabsTrigger value="singer">싱어</TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <MemberGrid 
              members={filteredMembers} 
              currentYear={currentYear}
              onEdit={openEditDialog} 
              onDelete={setDeleteConfirm} 
            />
          </TabsContent>

          <TabsContent value="instrument">
            <MemberGrid 
              members={instrumentMembers} 
              currentYear={currentYear}
              onEdit={openEditDialog} 
              onDelete={setDeleteConfirm} 
            />
          </TabsContent>

          <TabsContent value="singer">
            <MemberGrid 
              members={singerMembers} 
              currentYear={currentYear}
              onEdit={openEditDialog} 
              onDelete={setDeleteConfirm} 
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? '팀원 수정' : '새 팀원 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">이름 *</Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="팀원 이름"
                required
              />
            </div>

            {/* Positions */}
            <div>
              <Label className="mb-3 block">포지션 *</Label>
              
              {/* Instruments */}
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Music className="w-3 h-3" /> 악기팀
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {INSTRUMENT_POSITIONS.map(position => (
                    <label 
                      key={position}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        formData.positions.includes(position) 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox 
                        checked={formData.positions.includes(position)}
                        onCheckedChange={() => togglePosition(position)}
                      />
                      <span className="truncate">{position}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Singers */}
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Mic className="w-3 h-3" /> 싱어
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SINGER_POSITIONS.map(position => (
                    <label 
                      key={position}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        formData.positions.includes(position) 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox 
                        checked={formData.positions.includes(position)}
                        onCheckedChange={() => togglePosition(position)}
                      />
                      <span>{position}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Others */}
              <div>
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> 기타
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {OTHER_POSITIONS.map(position => (
                    <label 
                      key={position}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        formData.positions.includes(position) 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Checkbox 
                        checked={formData.positions.includes(position)}
                        onCheckedChange={() => togglePosition(position)}
                      />
                      <span>{position}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Executive Roles */}
            <div>
              <Label className="mb-2 block">임원 역할</Label>
              <div className="flex gap-2 mb-2">
                <Input 
                  type="number"
                  value={newExecutiveRole.year}
                  onChange={(e) => setNewExecutiveRole(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  className="w-24"
                  placeholder="년도"
                />
                <Select 
                  value={newExecutiveRole.role} 
                  onValueChange={(v) => setNewExecutiveRole(prev => ({ ...prev, role: v }))}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="직책 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXECUTIVE_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addExecutiveRole}>
                  추가
                </Button>
              </div>
              {formData.executive_roles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.executive_roles.map((role, idx) => (
                    <Badge 
                      key={idx} 
                      className={cn(executiveColors[role.role], "pr-1")}
                    >
                      {role.year} {role.role}
                      <button 
                        type="button"
                        onClick={() => removeExecutiveRole(idx)}
                        className="ml-1 hover:bg-white/20 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input 
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <Label htmlFor="birthday">생일</Label>
              <Input 
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {editingMember ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀원 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.name}님을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MemberGrid({ members, currentYear, onEdit, onDelete }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {members.map((member, idx) => {
          const currentYearRole = member.executive_roles?.find(r => r.year === currentYear);
          
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="group hover:shadow-md transition-all border-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg",
                          currentYearRole 
                            ? executiveColors[currentYearRole.role]
                            : "bg-gradient-to-br from-indigo-400 to-purple-500"
                        )}>
                          {member.name?.[0]}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{member.name}</h4>
                          {currentYearRole && (
                            <Badge className={cn(executiveColors[currentYearRole.role], "text-xs mt-1")}>
                              {currentYearRole.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => onEdit(member)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => onDelete(member)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {member.positions?.map(position => (
                        <Badge 
                          key={position} 
                          className={`${positionColors[position]} text-xs`}
                        >
                          {position}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      {member.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {member.phone}
                        </div>
                      )}
                      {member.birthday && (
                        <div className="flex items-center gap-2">
                          <Cake className="w-4 h-4" />
                          {format(parseISO(member.birthday), 'M월 d일', { locale: ko })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}