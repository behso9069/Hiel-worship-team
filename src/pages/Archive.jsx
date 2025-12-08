import React, { useState } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Archive, Plus, Play, Pause, Search, Calendar,
  Upload, Download, Star, Edit2, Trash2, Music, Users
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ArchivePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    title: '',
    worship_leader: '',
    team_members: {},
    songs: [],
    audio_url: '',
    notes: ''
  });
  const [songsInput, setSongsInput] = useState('');

  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['serviceRecords'],
    queryFn: () => entities.ServiceRecord.list('-date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.ServiceRecord.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.ServiceRecord.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.ServiceRecord.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRecords'] });
      setDeleteConfirm(null);
      setSelectedRecord(null);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      date: '',
      title: '',
      worship_leader: '',
      team_members: {},
      songs: [],
      audio_url: '',
      notes: ''
    });
    setSongsInput('');
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setFormData({
      date: record.date || '',
      title: record.title || '',
      worship_leader: record.worship_leader || '',
      team_members: record.team_members || {},
      songs: record.songs || [],
      audio_url: record.audio_url || '',
      notes: record.notes || ''
    });
    setSongsInput(record.songs?.join(', ') || '');
    setIsDialogOpen(true);
    setSelectedRecord(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      songs: songsInput.split(',').map(s => s.trim()).filter(Boolean)
    };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, audio_url: result.file_url }));
    setUploading(false);
  };

  const toggleAudio = (record) => {
    if (playingAudio === record.id) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(record.id);
    }
  };

  const filteredRecords = records.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.worship_leader?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.songs?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by month
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const monthKey = record.date ? format(parseISO(record.date), 'yyyy년 M월', { locale: ko }) : '날짜 미정';
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(record);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="자료 보관"
        description="예배 실황 음원과 서빙 이력을 관리합니다"
        icon={Archive}
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            기록 추가
          </Button>
        }
      />

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input 
          placeholder="제목, 인도자, 곡명으로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-slate-200 rounded-lg mb-4" />
                <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-slate-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState 
          icon={Archive}
          title="등록된 기록이 없습니다"
          description="예배 기록을 추가해주세요"
          actionLabel="기록 추가"
          onAction={() => setIsDialogOpen(true)}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedRecords).map(([month, monthRecords]) => (
            <div key={month}>
              <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                {month}
                <Badge variant="secondary">{monthRecords.length}</Badge>
              </h3>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {monthRecords.map((record, idx) => (
                    <motion.div
                      key={record.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card 
                        className="group cursor-pointer hover:shadow-md transition-all border-0 shadow-sm overflow-hidden"
                        onClick={() => setSelectedRecord(record)}
                      >
                        <CardContent className="p-0">
                          {/* Cover */}
                          <div className="h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative">
                            {record.thumbnail_url ? (
                              <img 
                                src={record.thumbnail_url} 
                                alt={record.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Music className="w-12 h-12 text-indigo-300" />
                              </div>
                            )}
                            
                            {record.audio_url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAudio(record);
                                }}
                                className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                              >
                                {playingAudio === record.id ? (
                                  <Pause className="w-5 h-5 text-indigo-600" />
                                ) : (
                                  <Play className="w-5 h-5 text-indigo-600 ml-0.5" />
                                )}
                              </button>
                            )}

                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="h-8 w-8 bg-white/90"
                                onClick={() => openEditDialog(record)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="secondary" 
                                className="h-8 w-8 bg-white/90 text-red-500"
                                onClick={() => setDeleteConfirm(record)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                              <Calendar className="w-3 h-3" />
                              {record.date ? format(parseISO(record.date), 'M월 d일 EEEE', { locale: ko }) : '날짜 미정'}
                            </div>
                            <h3 className="font-semibold text-slate-800 truncate">
                              {record.title || '제목 없음'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              인도: {record.worship_leader || '미정'}
                            </p>
                            
                            {record.songs?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {record.songs.slice(0, 2).map((song, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {song}
                                  </Badge>
                                ))}
                                {record.songs.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{record.songs.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden audio element */}
      {playingAudio && (
        <audio
          src={records.find(r => r.id === playingAudio)?.audio_url}
          autoPlay
          onEnded={() => setPlayingAudio(null)}
        />
      )}

      {/* Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedRecord && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedRecord.title || '제목 없음'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="flex flex-wrap gap-4">
                  <div className="px-4 py-2 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-600">날짜</p>
                    <p className="font-semibold text-indigo-700">
                      {selectedRecord.date ? format(parseISO(selectedRecord.date), 'yyyy년 M월 d일', { locale: ko }) : '미정'}
                    </p>
                  </div>
                  <div className="px-4 py-2 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600">인도자</p>
                    <p className="font-semibold text-purple-700">{selectedRecord.worship_leader || '미정'}</p>
                  </div>
                </div>

                {/* Audio Player */}
                {selectedRecord.audio_url && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm font-medium text-slate-600 mb-3">🎵 음원</p>
                    <audio 
                      src={selectedRecord.audio_url} 
                      controls 
                      className="w-full"
                    />
                  </div>
                )}

                {/* Songs */}
                {selectedRecord.songs?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-3">🎤 찬양 목록</p>
                    <div className="space-y-2">
                      {selectedRecord.songs.map((song, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="text-slate-700">{song}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members */}
                {selectedRecord.team_members && Object.keys(selectedRecord.team_members).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4" /> 참여 팀원
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(selectedRecord.team_members).map(([position, name]) => (
                        name && (
                          <div key={position} className="p-2 bg-slate-50 rounded-lg text-center">
                            <p className="text-xs text-slate-500">{position}</p>
                            <p className="font-medium text-slate-700">{name}</p>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedRecord.notes && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">📝 메모</p>
                    <p className="text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? '기록 수정' : '새 기록 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">날짜 *</Label>
                <Input 
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="worship_leader">인도자 *</Label>
                <Input 
                  id="worship_leader"
                  value={formData.worship_leader}
                  onChange={(e) => setFormData(prev => ({ ...prev, worship_leader: e.target.value }))}
                  placeholder="인도자 이름"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="title">제목</Label>
              <Input 
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="예: 주일 오후예배"
              />
            </div>

            <div>
              <Label htmlFor="songs">찬양 목록</Label>
              <Input 
                id="songs"
                value={songsInput}
                onChange={(e) => setSongsInput(e.target.value)}
                placeholder="쉼표로 구분 (예: 주님의 은혜, 이 땅에 살면서)"
              />
              <p className="text-xs text-slate-500 mt-1">찬양곡을 쉼표(,)로 구분해서 입력하세요</p>
            </div>

            <div>
              <Label>음원 파일</Label>
              <div className="mt-2">
                <input 
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <label 
                  htmlFor="audio-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {uploading ? '업로드 중...' : formData.audio_url ? '파일 변경' : '음원 업로드'}
                  </span>
                </label>
              </div>
              {formData.audio_url && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                  <audio src={formData.audio_url} controls className="w-full" />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="notes">메모</Label>
              <Textarea 
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="특이사항이나 메모"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || uploading}
                className="bg-gradient-to-r from-indigo-500 to-purple-600"
              >
                {editingRecord ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 기록을 정말 삭제하시겠습니까?
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