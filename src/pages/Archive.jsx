import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Archive, Plus, Play, Pause, Search, Calendar,
  Upload, Download, Star, Edit2, Trash2, Music, Users, X, FileText
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
  SelectValue,
} from "@/components/ui/select";
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

// 음원 카테고리별 최대 개수
const AUDIO_LIMITS = {
  '연습파일': 2,
  '예배실황': 2,
  '기타': 1
};

const categoryColors = {
  '연습파일': 'bg-green-100 text-green-700',
  '예배실황': 'bg-blue-100 text-blue-700',
  '기타': 'bg-slate-100 text-slate-700',
};

export default function ArchivePage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    worship_leader: '',
    team_members: {},
    songs: [],
    audio_files: [], // [{ category, url, label }]
    sheet_music_urls: [],
    notes: ''
  });

  const queryClient = useQueryClient();

  // 팀장 여부 확인
  useEffect(() => {
    const checkTeamLeader = async () => {
      const isLeader = await User.isTeamLeader();
      setIsTeamLeader(isLeader);
    };
    checkTeamLeader();
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['serviceRecords'],
    queryFn: () => entities.ServiceRecord.list('-date'),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  // 선곡 데이터 가져오기
  const { data: setlists = [] } = useQuery({
    queryKey: ['setlists'],
    queryFn: () => entities.WeeklySetlist.list('date'),
  });

  // 스케줄 데이터 가져오기
  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => entities.ServiceSchedule.list('date'),
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

  // 날짜 선택 시 자동으로 데이터 가져오기
  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, date }));

    // 해당 날짜의 선곡 정보 찾기
    const setlist = setlists.find(s => s.date === date);
    if (setlist) {
      setFormData(prev => ({
        ...prev,
        worship_leader: setlist.worship_leader || prev.worship_leader,
        songs: setlist.songs?.map(s => ({
          title: s.title,
          key: s.key,
          artist: s.artist,
          sheet_music_file: s.sheet_music_file
        })) || prev.songs
      }));
    }

    // 해당 날짜의 스케줄 정보 찾기
    const schedule = schedules.find(s => s.date === date);
    if (schedule) {
      setFormData(prev => ({
        ...prev,
        team_members: schedule.assignments || prev.team_members
      }));
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setFormData({
      date: '',
      worship_leader: '',
      team_members: {},
      songs: [],
      audio_files: [],
      sheet_music_urls: [],
      notes: ''
    });
  };

  const openEditDialog = (record) => {
    setEditingRecord(record);
    setFormData({
      date: record.date || '',
      worship_leader: record.worship_leader || '',
      team_members: record.team_members || {},
      songs: record.songs || [],
      audio_files: record.audio_files || [],
      sheet_music_urls: record.sheet_music_urls || [],
      notes: record.notes || ''
    });
    setIsDialogOpen(true);
    setSelectedRecord(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // 음원 파일 추가
  const addAudioFile = (category) => {
    const currentCount = formData.audio_files.filter(f => f.category === category).length;
    if (currentCount < AUDIO_LIMITS[category]) {
      setFormData(prev => ({
        ...prev,
        audio_files: [...prev.audio_files, { category, url: '', label: '' }]
      }));
    }
  };

  // 음원 파일 수정
  const updateAudioFile = (index, field, value) => {
    setFormData(prev => {
      const files = [...prev.audio_files];
      files[index] = { ...files[index], [field]: value };
      return { ...prev, audio_files: files };
    });
  };

  // 음원 파일 삭제
  const removeAudioFile = (index) => {
    setFormData(prev => ({
      ...prev,
      audio_files: prev.audio_files.filter((_, i) => i !== index)
    }));
  };

  const toggleAudio = (url) => {
    if (playingAudio === url) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(url);
    }
  };

  const filteredRecords = records.filter(r => 
    r.worship_leader?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.songs?.some(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by month
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const monthKey = record.date ? format(parseISO(record.date), 'yyyy년 M월', { locale: ko }) : '날짜 미정';
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(record);
    return acc;
  }, {});

  // 카테고리별 음원 개수 확인
  const getAudioCountByCategory = (category) => {
    return formData.audio_files.filter(f => f.category === category).length;
  };

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
          placeholder="인도자, 곡명으로 검색..."
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
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-12 h-12 text-indigo-300" />
                            </div>
                            
                            {record.audio_files?.length > 0 && (
                              <Badge className="absolute top-2 left-2 bg-green-500 text-white">
                                <Music className="w-3 h-3 mr-1" />
                                {record.audio_files.length}개
                              </Badge>
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
                              {isTeamLeader && (
                                <Button 
                                  size="icon" 
                                  variant="secondary" 
                                  className="h-8 w-8 bg-white/90 text-red-500"
                                  onClick={() => setDeleteConfirm(record)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                              <Calendar className="w-3 h-3" />
                              {record.date ? format(parseISO(record.date), 'M월 d일 EEEE', { locale: ko }) : '날짜 미정'}
                            </div>
                            <h3 className="font-semibold text-slate-800">
                              {record.date ? format(parseISO(record.date), 'yyyy년 M월 d일 예배', { locale: ko }) : '날짜 미정'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                              인도: {record.worship_leader || '미정'}
                            </p>
                            
                            {record.songs?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {record.songs.slice(0, 2).map((song, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {song.title}
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
          src={playingAudio}
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
                <DialogTitle className="text-xl">
                  {selectedRecord.date ? format(parseISO(selectedRecord.date), 'yyyy년 M월 d일 예배', { locale: ko }) : '예배 기록'}
                </DialogTitle>
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

                {/* Audio Files */}
                {selectedRecord.audio_files?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-3">🎵 음원 파일</p>
                    <div className="space-y-3">
                      {selectedRecord.audio_files.map((audio, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs", categoryColors[audio.category])}>
                                {audio.category}
                              </Badge>
                              {audio.label && (
                                <span className="text-sm text-slate-600">{audio.label}</span>
                              )}
                            </div>
                          </div>
                          <audio 
                            src={audio.url} 
                            controls 
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Songs */}
                {selectedRecord.songs?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-3">🎤 찬양 목록</p>
                    <div className="space-y-2">
                      {selectedRecord.songs.map((song, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-medium flex items-center justify-center flex-shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-slate-700 font-medium">{song.title}</p>
                              {song.artist && (
                                <p className="text-xs text-slate-500">{song.artist}</p>
                              )}
                              {song.key && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Key: {song.key}
                                </Badge>
                              )}
                              {song.sheet_music_file && (
                                <Badge className="mt-1 ml-1 text-xs bg-green-100 text-green-700">
                                  <FileText className="w-3 h-3 mr-1" />
                                  악보
                                </Badge>
                              )}
                            </div>
                          </div>
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
                      {Object.entries(selectedRecord.team_members).map(([position, names]) => {
                        const nameList = Array.isArray(names) ? names : [names];
                        return nameList.filter(Boolean).map((name, idx) => (
                          <div key={`${position}-${idx}`} className="p-2 bg-slate-50 rounded-lg text-center">
                            <p className="text-xs text-slate-500">{position}</p>
                            <p className="font-medium text-slate-700">{name}</p>
                          </div>
                        ));
                      })}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? '기록 수정' : '새 기록 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="date">날짜 * (선택 시 자동 입력)</Label>
                <Input 
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="worship_leader">인도자</Label>
              <Input 
                id="worship_leader"
                value={formData.worship_leader}
                onChange={(e) => setFormData(prev => ({ ...prev, worship_leader: e.target.value }))}
                placeholder="인도자 이름"
              />
            </div>

            {/* 찬양 목록 (자동 표시) */}
            {formData.songs?.length > 0 && (
              <div>
                <Label>찬양 목록 (자동 입력됨)</Label>
                <div className="mt-2 space-y-2 p-3 bg-slate-50 rounded-lg max-h-40 overflow-y-auto">
                  {formData.songs.map((song, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-slate-700">{song.title}</span>
                      {song.key && (
                        <Badge variant="outline" className="text-xs">Key: {song.key}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 봉사자 리스트 (자동 표시) */}
            {formData.team_members && Object.keys(formData.team_members).length > 0 && (
              <div>
                <Label>봉사자 (자동 입력됨)</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg max-h-40 overflow-y-auto">
                  {Object.entries(formData.team_members).map(([position, names]) => {
                    const nameList = Array.isArray(names) ? names : [names];
                    return nameList.filter(Boolean).map((name, idx) => (
                      <div key={`${position}-${idx}`} className="text-sm">
                        <span className="text-slate-500">{position}:</span>
                        <span className="ml-1 font-medium text-slate-700">{name}</span>
                      </div>
                    ));
                  })}
                </div>
              </div>
            )}

            {/* 음원 파일 */}
            <div>
              <Label>음원 파일</Label>
              <div className="mt-2 space-y-3">
                {['연습파일', '예배실황', '기타'].map(category => (
                  <div key={category} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={cn("text-xs", categoryColors[category])}>
                        {category} ({getAudioCountByCategory(category)}/{AUDIO_LIMITS[category]})
                      </Badge>
                      <Button 
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addAudioFile(category)}
                        disabled={getAudioCountByCategory(category) >= AUDIO_LIMITS[category]}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        추가
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.audio_files
                        .map((file, idx) => ({ ...file, originalIndex: idx }))
                        .filter(file => file.category === category)
                        .map(file => (
                          <div key={file.originalIndex} className="flex gap-2">
                            <Input 
                              placeholder="라벨 (예: 1부, 전체)"
                              value={file.label}
                              onChange={(e) => updateAudioFile(file.originalIndex, 'label', e.target.value)}
                              className="w-32"
                            />
                            <Input 
                              placeholder="음원 URL"
                              value={file.url}
                              onChange={(e) => updateAudioFile(file.originalIndex, 'url', e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeAudioFile(file.originalIndex)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Google Drive, YouTube 등의 링크를 입력하세요
              </p>
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
                disabled={createMutation.isPending || updateMutation.isPending}
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
