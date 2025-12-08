import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Bell, Plus, Pin, Paperclip, Eye, EyeOff, 
  Edit2, Trash2, Search, Filter, X, Check, Upload, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
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
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

const CATEGORIES = ['일정', '중요', '찬양', '팀행사', '기타'];

const categoryColors = {
  '일정': 'bg-blue-100 text-blue-700 border-blue-200',
  '중요': 'bg-red-100 text-red-700 border-red-200',
  '찬양': 'bg-purple-100 text-purple-700 border-purple-200',
  '팀행사': 'bg-green-100 text-green-700 border-green-200',
  '기타': 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function Announcements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '기타',
    is_pinned: false,
    attachments: []
  });
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (e) {
        console.log('Not logged in');
      }
    };
    loadUser();
  }, []);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => entities.Announcement.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Announcement.create({
      ...data,
      author_name: user?.full_name || '관리자',
      read_by: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteConfirm(null);
      setSelectedAnnouncement(null);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (announcement) => {
      const readBy = announcement.read_by || [];
      if (!readBy.includes(user?.email)) {
        await entities.Announcement.update(announcement.id, {
          read_by: [...readBy, user?.email]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      category: '기타',
      is_pinned: false,
      attachments: []
    });
  };

  const openEditDialog = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      category: announcement.category || '기타',
      is_pinned: announcement.is_pinned || false,
      attachments: announcement.attachments || []
    });
    setIsDialogOpen(true);
    setSelectedAnnouncement(null);
  };

  const openDetail = (announcement) => {
    setSelectedAnnouncement(announcement);
    if (user?.email && !announcement.read_by?.includes(user.email)) {
      markAsReadMutation.mutate(announcement);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments = [...formData.attachments];

    for (let file of files) {
      const result = await base44.integrations.Core.UploadFile({ file });
      newAttachments.push({
        name: file.name,
        url: result.file_url
      });
    }

    setFormData(prev => ({ ...prev, attachments: newAttachments }));
    setUploading(false);
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         a.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.is_pinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.is_pinned);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title="공지사항"
        description="팀 공지 및 전달 사항을 확인하세요"
        icon={Bell}
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            공지 작성
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="공지 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Announcements list */}
      {isLoading ? (
        <div className="space-y-4">
          {Array(5).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="h-4 w-full bg-slate-100 rounded mb-2" />
                <div className="h-4 w-2/3 bg-slate-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <EmptyState 
          icon={Bell}
          title="등록된 공지가 없습니다"
          description="새로운 공지를 작성해주세요"
          actionLabel="공지 작성"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="space-y-4">
          {/* Pinned */}
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
                <Pin className="w-4 h-4" /> 고정된 공지
              </h3>
              <AnimatePresence mode="popLayout">
                {pinnedAnnouncements.map((announcement, idx) => (
                  <AnnouncementCard 
                    key={announcement.id}
                    announcement={announcement}
                    user={user}
                    index={idx}
                    onClick={() => openDetail(announcement)}
                    onEdit={() => openEditDialog(announcement)}
                    onDelete={() => setDeleteConfirm(announcement)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Regular */}
          {regularAnnouncements.length > 0 && (
            <div className="space-y-3">
              {pinnedAnnouncements.length > 0 && (
                <h3 className="text-sm font-medium text-slate-500 mt-6">일반 공지</h3>
              )}
              <AnimatePresence mode="popLayout">
                {regularAnnouncements.map((announcement, idx) => (
                  <AnnouncementCard 
                    key={announcement.id}
                    announcement={announcement}
                    user={user}
                    index={idx}
                    onClick={() => openDetail(announcement)}
                    onEdit={() => openEditDialog(announcement)}
                    onDelete={() => setDeleteConfirm(announcement)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={categoryColors[selectedAnnouncement.category]}>
                        {selectedAnnouncement.category}
                      </Badge>
                      {selectedAnnouncement.is_pinned && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Pin className="w-3 h-3 mr-1" /> 고정
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-xl">{selectedAnnouncement.title}</DialogTitle>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncement.content}
                </p>

                {selectedAnnouncement.attachments?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-500 mb-3">첨부파일</h4>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map((file, idx) => (
                        <a 
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          <span className="flex-1 text-sm text-slate-700">{file.name}</span>
                          <Download className="w-4 h-4 text-indigo-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t flex items-center justify-between text-sm text-slate-500">
                  <div>
                    <span>{selectedAnnouncement.author_name || '관리자'}</span>
                    <span className="mx-2">•</span>
                    <span>{format(new Date(selectedAnnouncement.created_date), 'yyyy년 M월 d일 HH:mm', { locale: ko })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{selectedAnnouncement.read_by?.length || 0}명 읽음</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? '공지 수정' : '새 공지 작성'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">제목 *</Label>
              <Input 
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="공지 제목"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">카테고리</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="content">내용 *</Label>
              <Textarea 
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="공지 내용을 입력하세요"
                rows={6}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_pinned" className="cursor-pointer">상단 고정</Label>
              <Switch 
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
              />
            </div>

            <div>
              <Label>첨부파일</Label>
              <div className="mt-2">
                <input 
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label 
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {uploading ? '업로드 중...' : '파일을 선택하세요'}
                  </span>
                </label>
              </div>
              {formData.attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{file.name}</span>
                      </div>
                      <Button 
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                {editingAnnouncement ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 공지를 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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

function AnnouncementCard({ announcement, user, index, onClick, onEdit, onDelete }) {
  const isRead = announcement.read_by?.includes(user?.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={`group cursor-pointer hover:shadow-md transition-all border-0 shadow-sm ${
          announcement.is_pinned ? 'ring-2 ring-orange-200 bg-orange-50/30' : ''
        } ${!isRead ? 'border-l-4 border-l-indigo-500' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={categoryColors[announcement.category]}>
                  {announcement.category}
                </Badge>
                {announcement.is_pinned && (
                  <Pin className="w-4 h-4 text-orange-500" />
                )}
                {!isRead && (
                  <Badge className="bg-indigo-100 text-indigo-700">새 공지</Badge>
                )}
              </div>
              <h3 className="font-semibold text-slate-800 mb-1">{announcement.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{announcement.content}</p>
              
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                <span>{announcement.author_name || '관리자'}</span>
                <span>{format(new Date(announcement.created_date), 'M월 d일', { locale: ko })}</span>
                {announcement.attachments?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {announcement.attachments.length}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {announcement.read_by?.length || 0}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-red-500 hover:text-red-600"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}