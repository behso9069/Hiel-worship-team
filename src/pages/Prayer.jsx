import React, { useState, useEffect } from 'react';
import * as entities from '@/api/entities';
import { User } from '@/api/entities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Heart, Plus, MessageCircle, Check, Send,
  Edit2, Trash2, AlertCircle, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const CATEGORIES = ['개인', '팀', '가족', '교회', '기타'];

const categoryColors = {
  '개인': 'bg-blue-100 text-blue-700',
  '팀': 'bg-purple-100 text-purple-700',
  '가족': 'bg-pink-100 text-pink-700',
  '교회': 'bg-amber-100 text-amber-700',
  '기타': 'bg-slate-100 text-slate-700',
};

export default function Prayer() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState(null);
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    category: '개인',
    is_urgent: false
  });

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

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: ['prayers'],
    queryFn: () => entities.PrayerRequest.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.PrayerRequest.create({
      ...data,
      author_name: user?.full_name || '익명',
      prayers: [],
      reactions: { pray: [], heart: [], strength: [] },
      comments: []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entities.PrayerRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => entities.PrayerRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      setDeleteConfirm(null);
      setSelectedPrayer(null);
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ prayer, reactionType }) => {
      const reactions = prayer.reactions || { pray: [], heart: [], strength: [] };
      const userEmail = user?.email;
      
      if (reactions[reactionType]?.includes(userEmail)) {
        reactions[reactionType] = reactions[reactionType].filter(e => e !== userEmail);
      } else {
        if (!reactions[reactionType]) reactions[reactionType] = [];
        reactions[reactionType].push(userEmail);
      }
      
      return entities.PrayerRequest.update(prayer.id, { reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const prayMutation = useMutation({
    mutationFn: async (prayer) => {
      const prayers = prayer.prayers || [];
      const userEmail = user?.email;
      
      if (prayers.includes(userEmail)) {
        return entities.PrayerRequest.update(prayer.id, {
          prayers: prayers.filter(e => e !== userEmail)
        });
      } else {
        return entities.PrayerRequest.update(prayer.id, {
          prayers: [...prayers, userEmail]
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ prayer, comment }) => {
      const comments = prayer.comments || [];
      comments.push({
        id: Date.now().toString(),
        author: user?.full_name || '익명',
        content: comment,
        created_at: new Date().toISOString()
      });
      return entities.PrayerRequest.update(prayer.id, { comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
      setCommentText('');
    },
  });

  const markAsAnsweredMutation = useMutation({
    mutationFn: async ({ prayer, testimony }) => {
      return entities.PrayerRequest.update(prayer.id, {
        is_answered: true,
        answer_testimony: testimony
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingPrayer(null);
    setFormData({
      content: '',
      category: '개인',
      is_urgent: false
    });
  };

  const openEditDialog = (prayer) => {
    setEditingPrayer(prayer);
    setFormData({
      content: prayer.content || '',
      category: prayer.category || '개인',
      is_urgent: prayer.is_urgent || false
    });
    setIsDialogOpen(true);
    setSelectedPrayer(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingPrayer) {
      updateMutation.mutate({ id: editingPrayer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const activePrayers = prayers.filter(p => !p.is_answered);
  const answeredPrayers = prayers.filter(p => p.is_answered);

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title="기도 제목"
        description="함께 기도하며 서로를 응원합니다"
        icon={Heart}
        actions={
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            기도 제목 나누기
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-sm mb-6">
          <TabsTrigger value="active">기도 중 ({activePrayers.length})</TabsTrigger>
          <TabsTrigger value="answered">응답됨 ({answeredPrayers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                    <div className="h-4 w-full bg-slate-100 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activePrayers.length === 0 ? (
            <EmptyState 
              icon={Heart}
              title="기도 제목이 없습니다"
              description="기도 제목을 나눠주세요"
              actionLabel="기도 제목 나누기"
              onAction={() => setIsDialogOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {activePrayers.map((prayer, idx) => (
                  <PrayerCard 
                    key={prayer.id}
                    prayer={prayer}
                    user={user}
                    index={idx}
                    onClick={() => setSelectedPrayer(prayer)}
                    onPray={() => prayMutation.mutate(prayer)}
                    onReact={(type) => reactionMutation.mutate({ prayer, reactionType: type })}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="answered">
          {answeredPrayers.length === 0 ? (
            <EmptyState 
              icon={Sparkles}
              title="응답된 기도가 없습니다"
              description="응답받은 기도를 나눠주세요"
            />
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {answeredPrayers.map((prayer, idx) => (
                  <PrayerCard 
                    key={prayer.id}
                    prayer={prayer}
                    user={user}
                    index={idx}
                    onClick={() => setSelectedPrayer(prayer)}
                    isAnswered
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Prayer Detail Dialog */}
      <Dialog open={!!selectedPrayer} onOpenChange={() => setSelectedPrayer(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedPrayer && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={categoryColors[selectedPrayer.category]}>
                      {selectedPrayer.category}
                    </Badge>
                    {selectedPrayer.is_urgent && (
                      <Badge className="bg-red-100 text-red-700">🔥 긴급</Badge>
                    )}
                    {selectedPrayer.is_answered && (
                      <Badge className="bg-emerald-100 text-emerald-700">✨ 응답됨</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {selectedPrayer.created_by === user?.email && (
                      <>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => openEditDialog(selectedPrayer)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500"
                          onClick={() => setDeleteConfirm(selectedPrayer)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedPrayer.content}
                </p>

                {selectedPrayer.is_answered && selectedPrayer.answer_testimony && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <h4 className="font-medium text-emerald-700 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> 기도 응답
                    </h4>
                    <p className="text-emerald-600 text-sm">{selectedPrayer.answer_testimony}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                  <button
                    onClick={() => prayMutation.mutate(selectedPrayer)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                      selectedPrayer.prayers?.includes(user?.email)
                        ? 'bg-pink-500 text-white'
                        : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                    )}
                  >
                    🙏 기도합니다 ({selectedPrayer.prayers?.length || 0})
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {[
                      { type: 'heart', emoji: '❤️' },
                      { type: 'strength', emoji: '💪' }
                    ].map(({ type, emoji }) => (
                      <button
                        key={type}
                        onClick={() => reactionMutation.mutate({ prayer: selectedPrayer, reactionType: type })}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all",
                          selectedPrayer.reactions?.[type]?.includes(user?.email)
                            ? 'bg-slate-200'
                            : 'bg-slate-50 hover:bg-slate-100'
                        )}
                      >
                        {emoji} {selectedPrayer.reactions?.[type]?.length || 0}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-slate-400 mt-3">
                  {selectedPrayer.author_name} • {format(new Date(selectedPrayer.created_date), 'M월 d일', { locale: ko })}
                </div>
              </div>

              {/* Comments */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  댓글 ({selectedPrayer.comments?.length || 0})
                </h4>

                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedPrayer.comments?.map((comment) => (
                    <div key={comment.id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-700">{comment.author}</span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(comment.created_at), 'M/d HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{comment.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Textarea 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="격려의 말씀을 남겨주세요..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => commentMutation.mutate({ prayer: selectedPrayer, comment: commentText })}
                    disabled={!commentText.trim() || commentMutation.isPending}
                    className="bg-gradient-to-r from-pink-500 to-rose-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {!selectedPrayer.is_answered && selectedPrayer.created_by === user?.email && (
                  <Button 
                    className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600"
                    onClick={() => {
                      const testimony = prompt('기도 응답에 대해 간단히 나눠주세요:');
                      if (testimony) {
                        markAsAnsweredMutation.mutate({ prayer: selectedPrayer, testimony });
                        setSelectedPrayer(null);
                      }
                    }}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    기도 응답으로 표시
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPrayer ? '기도 제목 수정' : '기도 제목 나누기'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="content">기도 제목 *</Label>
              <Textarea 
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="나누고 싶은 기도 제목을 작성해주세요"
                rows={5}
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_urgent" className="cursor-pointer flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                긴급 기도 제목
              </Label>
              <Switch 
                id="is_urgent"
                checked={formData.is_urgent}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_urgent: checked }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-pink-500 to-rose-600"
              >
                {editingPrayer ? '수정' : '나누기'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기도 제목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 기도 제목을 정말 삭제하시겠습니까?
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

function PrayerCard({ prayer, user, index, onClick, onPray, onReact, isAnswered }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-md transition-all border-0 shadow-sm",
          prayer.is_urgent && !isAnswered && 'ring-2 ring-red-200 bg-red-50/30',
          isAnswered && 'bg-emerald-50/30'
        )}
        onClick={onClick}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              isAnswered 
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                : 'bg-gradient-to-br from-pink-400 to-rose-500'
            )}>
              {isAnswered ? (
                <Sparkles className="w-5 h-5 text-white" />
              ) : (
                <span className="text-lg">🙏</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={categoryColors[prayer.category]}>
                  {prayer.category}
                </Badge>
                {prayer.is_urgent && !isAnswered && (
                  <Badge className="bg-red-100 text-red-700">🔥 긴급</Badge>
                )}
                {isAnswered && (
                  <Badge className="bg-emerald-100 text-emerald-700">✨ 응답됨</Badge>
                )}
              </div>
              
              <p className="text-slate-700 line-clamp-2">{prayer.content}</p>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>{prayer.author_name}</span>
                  <span>{format(new Date(prayer.created_date), 'M월 d일', { locale: ko })}</span>
                </div>
                
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!isAnswered && (
                    <button
                      onClick={() => onPray?.()}
                      className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-all",
                        prayer.prayers?.includes(user?.email)
                          ? 'bg-pink-500 text-white'
                          : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                      )}
                    >
                      🙏 {prayer.prayers?.length || 0}
                    </button>
                  )}
                  <span className="flex items-center gap-1 text-sm text-slate-400">
                    <MessageCircle className="w-4 h-4" />
                    {prayer.comments?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}