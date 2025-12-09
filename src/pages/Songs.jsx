import React, { useState } from 'react';
import * as entities from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Music, Plus, Search, Play, FileText, Link as LinkIcon,
  Edit2, Trash2, X, ExternalLink, Hash, Clock, ChevronLeft, ChevronRight,
  Calendar, User as UserIcon, ListMusic
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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

// 주차 계산 함수
const getWeekNumber = (date) => {
  const d = new Date(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const firstSunday = new Date(firstDay);
  firstSunday.setDate(firstDay.getDate() + (7 - firstDay.getDay()) % 7);
  
  if (d < firstSunday) return 1;
  
  const diffDays = Math.floor((d - firstSunday) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 2;
};

export default function Songs() {
  const [activeTab, setActiveTab] = useState('setlist');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('song'); // 'song' or 'setlist'
  const [editingSong, setEditingSong] = useState(null);
  const [editingSetlist, setEditingSetlist] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [songForm, setSongForm] = useState({
    title: '',
    artist: '',
    key: '',
    tempo: '',
    duration: '',
    youtube_url: '',
    sheet_music_url: '',
    chord_chart: '',
    lyrics: '',
    tags: []
  });
  
  const [setlistForm, setSetlistForm] = useState({
    date: '',
    worship_leader: '',
    songs: [{ title: '', artist: '', key: '', reference_links: [{ label: '', url: '' }], notes: '' }],
    practice_notes: '',
    status: 'draft'
  });
  
  const [tagInput, setTagInput] = useState('');
  const queryClient = useQueryClient();
  const yearMonth = format(currentMonth, 'yyyy-MM');

  const { data: songs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: () => entities.Song.list('title'),
  });

  const { data: setlists = [], isLoading: setlistsLoading } = useQuery({
    queryKey: ['setlists', yearMonth],
    queryFn: async () => {
      const all = await entities.WeeklySetlist.list('-date');
      return all.filter(s => s.year_month === yearMonth);
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => entities.Member.list('name'),
  });

  // Song mutations
  const createSongMutation = useMutation({
    mutationFn: (data) => entities.Song.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      closeDialog();
    },
  });

  const updateSongMutation = useMutation({
    mutationFn: ({ id, data }) => entities.Song.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      closeDialog();
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (id) => entities.Song.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      setDeleteConfirm(null);
      setSelectedSong(null);
    },
  });

  // Setlist mutations
  const createSetlistMutation = useMutation({
    mutationFn: (data) => entities.WeeklySetlist.create({
      ...data,
      year_month: format(parseISO(data.date), 'yyyy-MM'),
      week_number: getWeekNumber(parseISO(data.date))
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      closeDialog();
    },
  });

  const updateSetlistMutation = useMutation({
    mutationFn: ({ id, data }) => entities.WeeklySetlist.update(id, {
      ...data,
      year_month: format(parseISO(data.date), 'yyyy-MM'),
      week_number: getWeekNumber(parseISO(data.date))
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      closeDialog();
    },
  });

  const deleteSetlistMutation = useMutation({
    mutationFn: (id) => entities.WeeklySetlist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      setDeleteConfirm(null);
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingSong(null);
    setEditingSetlist(null);
    setSongForm({
      title: '', artist: '', key: '', tempo: '', duration: '',
      youtube_url: '', sheet_music_url: '', chord_chart: '', lyrics: '', tags: []
    });
    setSetlistForm({
      date: '', worship_leader: '',
      songs: [{ title: '', artist: '', key: '', reference_links: [{ label: '', url: '' }], notes: '' }],
      practice_notes: '', status: 'draft'
    });
    setTagInput('');
  };

  const openSongDialog = (song = null) => {
    setDialogType('song');
    if (song) {
      setEditingSong(song);
      setSongForm({
        title: song.title || '',
        artist: song.artist || '',
        key: song.key || '',
        tempo: song.tempo || '',
        duration: song.duration || '',
        youtube_url: song.youtube_url || '',
        sheet_music_url: song.sheet_music_url || '',
        chord_chart: song.chord_chart || '',
        lyrics: song.lyrics || '',
        tags: song.tags || []
      });
    }
    setIsDialogOpen(true);
  };

  const openSetlistDialog = (setlist = null) => {
    setDialogType('setlist');
    if (setlist) {
      setEditingSetlist(setlist);
      setSetlistForm({
        date: setlist.date || '',
        worship_leader: setlist.worship_leader || '',
        songs: setlist.songs?.length > 0 ? setlist.songs : [{ title: '', artist: '', key: '', reference_links: [{ label: '', url: '' }], notes: '' }],
        practice_notes: setlist.practice_notes || '',
        status: setlist.status || 'draft'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSongSubmit = (e) => {
    e.preventDefault();
    const data = { ...songForm, tempo: songForm.tempo ? Number(songForm.tempo) : null };
    if (editingSong) {
      updateSongMutation.mutate({ id: editingSong.id, data });
    } else {
      createSongMutation.mutate(data);
    }
  };

  const handleSetlistSubmit = (e) => {
    e.preventDefault();
    // Filter out empty songs
    const filteredSongs = setlistForm.songs.filter(s => s.title.trim());
    const data = { ...setlistForm, songs: filteredSongs };
    
    if (editingSetlist) {
      updateSetlistMutation.mutate({ id: editingSetlist.id, data });
    } else {
      createSetlistMutation.mutate(data);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !songForm.tags.includes(tagInput.trim())) {
      setSongForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setSongForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  // Setlist form helpers
  const addSetlistSong = () => {
    setSetlistForm(prev => ({
      ...prev,
      songs: [...prev.songs, { title: '', artist: '', key: '', reference_links: [{ label: '', url: '' }], notes: '' }]
    }));
  };

  const updateSetlistSong = (index, field, value) => {
    setSetlistForm(prev => {
      const songs = [...prev.songs];
      songs[index] = { ...songs[index], [field]: value };
      return { ...prev, songs };
    });
  };

  const removeSetlistSong = (index) => {
    setSetlistForm(prev => ({
      ...prev,
      songs: prev.songs.filter((_, i) => i !== index)
    }));
  };

  const addReferenceLink = (songIndex) => {
    setSetlistForm(prev => {
      const songs = [...prev.songs];
      songs[songIndex].reference_links = [...(songs[songIndex].reference_links || []), { label: '', url: '' }];
      return { ...prev, songs };
    });
  };

  const updateReferenceLink = (songIndex, linkIndex, field, value) => {
    setSetlistForm(prev => {
      const songs = [...prev.songs];
      songs[songIndex].reference_links[linkIndex] = { ...songs[songIndex].reference_links[linkIndex], [field]: value };
      return { ...prev, songs };
    });
  };

  const removeReferenceLink = (songIndex, linkIndex) => {
    setSetlistForm(prev => {
      const songs = [...prev.songs];
      songs[songIndex].reference_links = songs[songIndex].reference_links.filter((_, i) => i !== linkIndex);
      return { ...prev, songs };
    });
  };

  const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : null;
  };

  const filteredSongs = songs.filter(song => 
    song.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get worship leaders (members with 인도자 position)
  const worshipLeaders = members.filter(m => m.positions?.includes('인도자'));

  // Sort setlists by week number
  const sortedSetlists = [...setlists].sort((a, b) => (a.week_number || 0) - (b.week_number || 0));

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        title="찬양"
        description="주간 선곡 리스트와 찬양 곡을 관리합니다"
        icon={Music}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="setlist">주간 선곡</TabsTrigger>
            <TabsTrigger value="library">곡 라이브러리</TabsTrigger>
          </TabsList>
          
          <Button 
            onClick={() => activeTab === 'setlist' ? openSetlistDialog() : openSongDialog()}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'setlist' ? '선곡 추가' : '곡 추가'}
          </Button>
        </div>

        {/* Weekly Setlist Tab */}
        <TabsContent value="setlist">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl font-bold text-slate-800">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </h2>
            <Button variant="ghost" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {setlistsLoading ? (
            <div className="space-y-4">
              {Array(4).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 w-24 bg-slate-200 rounded mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-slate-100 rounded" />
                      <div className="h-4 w-3/4 bg-slate-100 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedSetlists.length === 0 ? (
            <EmptyState 
              icon={ListMusic}
              title="등록된 선곡이 없습니다"
              description="이번 달 선곡 리스트를 추가해주세요"
              actionLabel="선곡 추가"
              onAction={() => openSetlistDialog()}
            />
          ) : (
            <div className="space-y-6">
              {sortedSetlists.map((setlist) => (
                <motion.div
                  key={setlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                            <span className="text-xl font-bold">{setlist.week_number}</span>
                          </div>
                          <div>
                            <CardTitle className="text-lg text-white">{setlist.week_number}주차 선곡</CardTitle>
                            <p className="text-sm text-white/70">
                              {setlist.date && format(parseISO(setlist.date), 'M월 d일 EEEE', { locale: ko })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={setlist.status === 'confirmed' ? 'bg-white/20 text-white' : 'bg-yellow-400 text-yellow-900'}>
                            {setlist.status === 'confirmed' ? '확정' : '작성중'}
                          </Badge>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={() => openSetlistDialog(setlist)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-white hover:bg-white/20"
                            onClick={() => setDeleteConfirm({ type: 'setlist', item: setlist })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {/* Worship Leader */}
                      <div className="flex items-center gap-2 mb-4 text-slate-600">
                        <UserIcon className="w-4 h-4" />
                        <span className="text-sm">인도: <strong>{setlist.worship_leader || '미정'}</strong></span>
                      </div>

                      {/* Songs */}
                      <div className="space-y-4">
                        {setlist.songs?.map((song, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-slate-800">{song.title}</h4>
                                  {song.artist && (
                                    <p className="text-sm text-slate-500">{song.artist}</p>
                                  )}
                                  {song.key && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Key: {song.key}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Reference Links */}
                            {song.reference_links?.length > 0 && song.reference_links.some(l => l.url) && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {song.reference_links.filter(l => l.url).map((link, linkIdx) => (
                                  
                                    key={linkIdx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {link.label || '참조 링크'}
                                  </a>
                                ))}
                              </div>
                            )}

                            {song.notes && (
                              <p className="mt-2 text-sm text-slate-600 bg-white p-2 rounded border-l-2 border-indigo-300">
                                {song.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Practice Notes */}
                      {setlist.practice_notes && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                          <p className="text-sm font-medium text-amber-700 mb-1">📝 연습 노트</p>
                          <p className="text-sm text-amber-800">{setlist.practice_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Song Library Tab */}
        <TabsContent value="library">
          {/* Search */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="곡명, 아티스트, 태그로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {songsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
                    <div className="flex gap-2">
                      <div className="h-6 w-12 bg-slate-100 rounded-full" />
                      <div className="h-6 w-16 bg-slate-100 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSongs.length === 0 ? (
            <EmptyState 
              icon={Music}
              title="등록된 곡이 없습니다"
              description="새로운 곡을 추가해주세요"
              actionLabel="곡 추가"
              onAction={() => openSongDialog()}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredSongs.map((song, idx) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card 
                      className="group cursor-pointer hover:shadow-md transition-all border-0 shadow-sm overflow-hidden"
                      onClick={() => setSelectedSong(song)}
                    >
                      <CardContent className="p-0">
                        <div className="h-32 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex items-center justify-center relative">
                          <Music className="w-12 h-12 text-indigo-300" />
                          {song.youtube_url && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <Play className="w-6 h-6 text-indigo-600 ml-1" />
                              </div>
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-8 w-8 bg-white/90"
                              onClick={() => openSongDialog(song)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="secondary" 
                              className="h-8 w-8 bg-white/90 text-red-500"
                              onClick={() => setDeleteConfirm({ type: 'song', item: song })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <h3 className="font-semibold text-slate-800 truncate">{song.title}</h3>
                          <p className="text-sm text-slate-500 truncate">{song.artist || '아티스트 미등록'}</p>
                          
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                            {song.key && (
                              <span className="flex items-center gap-1">
                                <Hash className="w-3 h-3" /> {song.key}
                              </span>
                            )}
                            {song.tempo && (
                              <span>{song.tempo} BPM</span>
                            )}
                            {song.duration && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {song.duration}
                              </span>
                            )}
                          </div>

                          {song.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {song.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {song.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{song.tags.length - 3}
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
          )}
        </TabsContent>
      </Tabs>

      {/* Song Detail Dialog */}
      <Dialog open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedSong && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedSong.title}</DialogTitle>
                    <p className="text-slate-500 mt-1">{selectedSong.artist || '아티스트 미등록'}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedSong(null); openSongDialog(selectedSong); }}>
                    <Edit2 className="w-4 h-4 mr-1" /> 수정
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap gap-4 py-4 border-b">
                {selectedSong.key && (
                  <div className="px-4 py-2 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-indigo-600">키</p>
                    <p className="font-semibold text-indigo-700">{selectedSong.key}</p>
                  </div>
                )}
                {selectedSong.tempo && (
                  <div className="px-4 py-2 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600">템포</p>
                    <p className="font-semibold text-purple-700">{selectedSong.tempo} BPM</p>
                  </div>
                )}
                {selectedSong.duration && (
                  <div className="px-4 py-2 bg-pink-50 rounded-lg">
                    <p className="text-xs text-pink-600">길이</p>
                    <p className="font-semibold text-pink-700">{selectedSong.duration}</p>
                  </div>
                )}
              </div>

              <Tabs defaultValue="video" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="video">영상</TabsTrigger>
                  <TabsTrigger value="sheet">악보</TabsTrigger>
                  <TabsTrigger value="chord">코드</TabsTrigger>
                  <TabsTrigger value="lyrics">가사</TabsTrigger>
                </TabsList>

                <TabsContent value="video" className="mt-4">
                  {selectedSong.youtube_url ? (
                    <div className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                      <iframe
                        src={getYoutubeEmbedUrl(selectedSong.youtube_url)}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-slate-100 flex flex-col items-center justify-center">
                      <Play className="w-12 h-12 text-slate-300 mb-2" />
                      <p className="text-slate-400">등록된 영상이 없습니다</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sheet" className="mt-4">
                  {selectedSong.sheet_music_url ? (
                    <div className="space-y-4">
                      <a 
                        href={selectedSong.sheet_music_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <FileText className="w-8 h-8 text-indigo-500" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">악보 보기</p>
                          <p className="text-sm text-slate-500">클릭하여 새 탭에서 열기</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-400" />
                      </a>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">등록된 악보가 없습니다</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="chord" className="mt-4">
                  {selectedSong.chord_chart ? (
                    <div className="p-6 bg-slate-50 rounded-xl">
                      <pre className="font-mono text-sm whitespace-pre-wrap text-slate-700">
                        {selectedSong.chord_chart}
                      </pre>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Hash className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">등록된 코드가 없습니다</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="lyrics" className="mt-4">
                  {selectedSong.lyrics ? (
                    <div className="p-6 bg-slate-50 rounded-xl">
                      <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {selectedSong.lyrics}
                      </p>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400">등록된 가사가 없습니다</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {selectedSong.tags?.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    {selectedSong.tags.map(tag => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Song Create/Edit Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'song'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSong ? '곡 수정' : '새 곡 추가'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSongSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">곡명 *</Label>
                <Input 
                  id="title"
                  value={songForm.title}
                  onChange={(e) => setSongForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="찬양 제목"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="artist">아티스트</Label>
                <Input 
                  id="artist"
                  value={songForm.artist}
                  onChange={(e) => setSongForm(prev => ({ ...prev, artist: e.target.value }))}
                  placeholder="아티스트 / 작곡가"
                />
              </div>

              <div>
                <Label htmlFor="key">키</Label>
                <Input 
                  id="key"
                  value={songForm.key}
                  onChange={(e) => setSongForm(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="예: A, Bm, C#"
                />
              </div>

              <div>
                <Label htmlFor="tempo">템포 (BPM)</Label>
                <Input 
                  id="tempo"
                  type="number"
                  value={songForm.tempo}
                  onChange={(e) => setSongForm(prev => ({ ...prev, tempo: e.target.value }))}
                  placeholder="예: 120"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="youtube_url">유튜브 링크</Label>
              <Input 
                id="youtube_url"
                value={songForm.youtube_url}
                onChange={(e) => setSongForm(prev => ({ ...prev, youtube_url: e.target.value }))}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div>
              <Label htmlFor="chord_chart">코드 진행</Label>
              <Textarea 
                id="chord_chart"
                value={songForm.chord_chart}
                onChange={(e) => setSongForm(prev => ({ ...prev, chord_chart: e.target.value }))}
                placeholder="예: Intro: G - D - Em - C"
                rows={3}
              />
            </div>

            <div>
              <Label>태그</Label>
              <div className="flex gap-2 mt-2">
                <Input 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="태그 입력 후 추가"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>추가</Button>
              </div>
              {songForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {songForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:bg-slate-200 rounded p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>취소</Button>
              <Button type="submit" disabled={createSongMutation.isPending || updateSongMutation.isPending} className="bg-gradient-to-r from-indigo-500 to-purple-600">
                {editingSong ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Setlist Create/Edit Dialog */}
      <Dialog open={isDialogOpen && dialogType === 'setlist'} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSetlist ? '선곡 수정' : '새 선곡 추가'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSetlistSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="setlist-date">예배 날짜 *</Label>
                <Input 
                  id="setlist-date"
                  type="date"
                  value={setlistForm.date}
                  onChange={(e) => setSetlistForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="worship-leader">인도자</Label>
                <Select 
                  value={setlistForm.worship_leader} 
                  onValueChange={(v) => setSetlistForm(prev => ({ ...prev, worship_leader: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="인도자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {worshipLeaders.map(leader => (
                      <SelectItem key={leader.id} value={leader.name}>{leader.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Songs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>찬양 목록</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSetlistSong}>
                  <Plus className="w-4 h-4 mr-1" /> 곡 추가
                </Button>
              </div>
              
              <div className="space-y-4">
                {setlistForm.songs.map((song, sIdx) => (
                  <div key={sIdx} className="p-4 bg-slate-50 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-600">곡 {sIdx + 1}</span>
                      {setlistForm.songs.length > 1 && (
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeSetlistSong(sIdx)}>
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Input 
                        placeholder="곡 제목 *"
                        value={song.title}
                        onChange={(e) => updateSetlistSong(sIdx, 'title', e.target.value)}
                        className="col-span-2"
                      />
                      <Input 
                        placeholder="키"
                        value={song.key}
                        onChange={(e) => updateSetlistSong(sIdx, 'key', e.target.value)}
                      />
                    </div>
                    
                    <Input 
                      placeholder="아티스트"
                      value={song.artist}
                      onChange={(e) => updateSetlistSong(sIdx, 'artist', e.target.value)}
                    />

                    {/* Reference Links */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500">참조 링크</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addReferenceLink(sIdx)}>
                          <Plus className="w-3 h-3 mr-1" /> 링크 추가
                        </Button>
                      </div>
                      {song.reference_links?.map((link, lIdx) => (
                        <div key={lIdx} className="flex gap-2 mb-2">
                          <Input 
                            placeholder="라벨 (예: MR, 원곡)"
                            value={link.label}
                            onChange={(e) => updateReferenceLink(sIdx, lIdx, 'label', e.target.value)}
                            className="w-28"
                          />
                          <Input 
                            placeholder="URL"
                            value={link.url}
                            onChange={(e) => updateReferenceLink(sIdx, lIdx, 'url', e.target.value)}
                            className="flex-1"
                          />
                          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-slate-400" onClick={() => removeReferenceLink(sIdx, lIdx)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Input 
                      placeholder="메모"
                      value={song.notes}
                      onChange={(e) => updateSetlistSong(sIdx, 'notes', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="practice-notes">연습 노트</Label>
              <Textarea 
                id="practice-notes"
                value={setlistForm.practice_notes}
                onChange={(e) => setSetlistForm(prev => ({ ...prev, practice_notes: e.target.value }))}
                placeholder="연습 시 참고사항"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="setlist-status">상태</Label>
              <Select 
                value={setlistForm.status} 
                onValueChange={(v) => setSetlistForm(prev => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">작성중</SelectItem>
                  <SelectItem value="confirmed">확정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>취소</Button>
              <Button type="submit" disabled={createSetlistMutation.isPending || updateSetlistMutation.isPending} className="bg-gradient-to-r from-indigo-500 to-purple-600">
                {editingSetlist ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm.type === 'song') {
                  deleteSongMutation.mutate(deleteConfirm.item.id);
                } else {
                  deleteSetlistMutation.mutate(deleteConfirm.item.id);
                }
              }}
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
